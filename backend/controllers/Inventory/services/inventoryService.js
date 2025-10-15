import xlsx from "xlsx";
import sequelize from "../../../config/database.js";
import models from "../../../models/index.js";
import { BadRequestError } from "../../../utils/Error.js";
import {
  invalidateBatchCache,
  invalidateInventoryCache,
  invalidateItemsCache,
} from "../../../utils/cache.js";

const { InventoryItem, Category, Batch, Notification, SerializedItem } = models;

/* -------------------------------------------------------------------------- */
/*                               Helper Functions                             */
/* -------------------------------------------------------------------------- */

// ✅ Convert Excel date safely
const convertExcelDate = (excelDate) => {
  if (!excelDate) return null;
  if (excelDate instanceof Date) return excelDate;

  if (typeof excelDate === "string") {
    const parsed = new Date(excelDate);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof excelDate === "number") {
    const excelEpoch = new Date(1900, 0, 1);
    const jsDate = new Date(
      excelEpoch.getTime() + (excelDate - 1) * 24 * 60 * 60 * 1000
    );
    if (excelDate > 59) {
      jsDate.setTime(jsDate.getTime() - 24 * 60 * 60 * 1000);
    }
    return jsDate;
  }

  return null;
};

// ✅ Determine if item needs serialization
const shouldSerializeItem = (item, category) => {
  if (item.is_returnable === true) return true;

  const serializableTypes = ["EQUIPMENT", "VEHICLES", "COMMUNICATION_DEVICES"];
  if (serializableTypes.includes(category.type?.toUpperCase())) return true;

  const itemText = `${item.name} ${item.description || ""}`.toLowerCase();

  const consumableKeywords = [
    "bandage",
    "gauze",
    "syringe",
    "needle",
    "pill",
    "tablet",
    "capsule",
    "medicine",
    "drug",
    "food",
    "water",
    "rice",
    "can",
    "bottle",
    "sachet",
    "packet",
    "pouch",
    "powder",
    "liquid",
    "cream",
    "ointment",
    "disposable",
    "single-use",
  ];

  if (consumableKeywords.some((word) => itemText.includes(word))) return false;

  const trackablePatterns = [
    /\b(defibrillator|ventilator|monitor|stretcher|wheelchair)\b/,
    /\b(oxygen\s+(tank|cylinder)|medical\s+kit)\b/,
    /\b(ambulance|truck|vehicle|motorbike|bicycle)\b/,
    /\b(radio|laptop|tablet|computer|generator)\b/,
    /\b(walkie[\s-]*talkie|two[\s-]*way\s+radio)\b/,
    /\b(chainsaw|drill|pump|tent|shelter)\b/,
    /\b(emergency\s+kit|rescue\s+kit|tool\s+kit)\b/,
    /\b(solar\s+panel|battery\s+pack|power\s+bank)\b/,
    /\b(blanket|tarpaulin|rope|cable|hose)\b/,
    /\b(flashlight|torch|lantern)\b/,
  ];

  return trackablePatterns.some((pattern) => pattern.test(itemText));
};

// ✅ Generate serial numbers
const generateSerialNumbers = (batchNumber, quantity, categoryCode) => {
  const date = new Date();
  const yymmdd =
    date.getFullYear().toString().slice(-2) +
    (date.getMonth() + 1).toString().padStart(2, "0") +
    date.getDate().toString().padStart(2, "0");

  return Array.from({ length: quantity }, (_, i) => {
    const seq = (i + 1).toString().padStart(3, "0");
    return `${categoryCode}-${batchNumber}-${yymmdd}-${seq}`;
  });
};

/* -------------------------------------------------------------------------- */
/*                               Core Functions                               */
/* -------------------------------------------------------------------------- */

const findOrCreateCategory = async (row, t) => {
  const allowedTypes = [
    "EQUIPMENT",
    "SUPPLIES",
    "RELIEF_GOODS",
    "VEHICLES",
    "COMMUNICATION_DEVICES",
  ];

  const safeType = allowedTypes.includes((row.type || "").toUpperCase())
    ? row.type.toUpperCase()
    : "SUPPLIES";

  let category = await Category.findOne({
    where: { name: row.category },
    transaction: t,
  });

  if (!category) {
    category = await Category.create(
      {
        name: row.category,
        type: safeType,
        description: `Auto-created from import for ${row.name}`,
      },
      { transaction: t }
    );
  }

  return category;
};

const findOrCreateItem = async (row, category, t) => {
  let item = await InventoryItem.findOne({
    where: { name: row.name },
    include: [{ model: Category, as: "category" }],
    transaction: t,
    lock: t.LOCK.UPDATE,
  });

  if (!item) {
    item = await InventoryItem.create(
      {
        name: row.name,
        description: row.description || "",
        category_id: category.id,
        min_stock_level: row.min_stock_level,
        reorder_level: row.reorder_level || 0,
        unit_of_measure: row.unit_of_measure || "pcs",
        location: row.location || "Warehouse",
        is_deployable: row.is_deployable ?? true,
        is_returnable: row.is_returnable ?? null,
        notes: row.notes || "",
      },
      { transaction: t }
    );
  } else {
    await item.update(
      {
        description: row.description || item.description,
        category_id: category.id,
        min_stock_level: row.min_stock_level,
        reorder_level: row.reorder_level || item.reorder_level,
        unit_of_measure: row.unit_of_measure || item.unit_of_measure,
        location: row.location || item.location,
        is_deployable: row.is_deployable ?? item.is_deployable,
        is_returnable: row.is_returnable ?? item.is_returnable,
        notes: row.notes || item.notes,
      },
      { transaction: t }
    );
  }

  await item.reload({
    include: [{ model: Category, as: "category" }],
    transaction: t,
  });
  return item;
};

const createBatchAndSerialize = async (row, item, category, userId, t) => {
  if (!row.quantity || row.quantity <= 0) return null;

  const itemPrefix = item.name.slice(0, 3).toUpperCase();
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:TZ]/g, "")
    .slice(0, 14);
  const batchNumber = `${itemPrefix}${timestamp}`;
  const amount = row.unit_price * row.quantity;

  const batch = await Batch.create(
    {
      inventory_item_id: item.id,
      quantity: row.quantity,
      batch_number: batchNumber,
      supplier: row.supplier || "DRRMFund/Donation",
      received_by: userId,
      received_date: new Date(),
      funding_source: row.funding_source || null,
      unit_price: row.unit_price || 0,
      amount,
      notes: row.batch_notes || "",
      is_active: true,
    },
    { transaction: t }
  );

  const needsSerialization = shouldSerializeItem(item, category);
  if (needsSerialization) {
    const categoryCode = category.type.slice(0, 3).toUpperCase().padEnd(3, "X");
    const serials = generateSerialNumbers(
      batchNumber,
      row.quantity,
      categoryCode
    );

    const serializedItems = serials.map((serial) => ({
      serial_number: serial,
      batch_id: batch.id,
      inventory_item_id: item.id,
      status: "AVAILABLE",
      created_by: userId,
    }));

    await SerializedItem.bulkCreate(serializedItems, { transaction: t });
  }

  await item.increment("quantity_in_stock", {
    by: row.quantity,
    transaction: t,
  });

  return {
    batch,
    needsSerialization,
    serialCount: needsSerialization ? row.quantity : 0,
  };
};

const checkLowStock = async (item, finalStock, userId, t) => {
  if (finalStock > item.min_stock_level) return;
  await Notification.create(
    {
      notification_type: "LOW_STOCK",
      inventory_item_id: item.id,
      user_id: userId,
      title: "Low Stock Alert",
      message: `${item.name} is below minimum stock level. Current: ${finalStock}, Minimum: ${item.min_stock_level}`,
      priority: "MEDIUM",
    },
    { transaction: t }
  );
};

/* -------------------------------------------------------------------------- */
/*                             Main Import Function                           */
/* -------------------------------------------------------------------------- */

export const processExcelFile = async (fileBuffer, userId) => {
  const workbook = xlsx.read(fileBuffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);

  const results = { success: [], errors: [] };

  for (const row of data) {
    let t = null;

    try {
      if (
        !row.name ||
        !row.category ||
        row.unit_price === undefined ||
        row.min_stock_level === undefined
      ) {
        throw new BadRequestError(
          `Missing required fields in row: ${JSON.stringify(row)}`
        );
      }

      t = await sequelize.transaction();

      const category = await findOrCreateCategory(row, t);
      const item = await findOrCreateItem(row, category, t);

      const batchInfo = await createBatchAndSerialize(
        row,
        item,
        category,
        userId,
        t
      );

      const finalStock = item.quantity_in_stock + (row.quantity || 0);
      await checkLowStock(item, finalStock, userId, t);

      await t.commit();
      t = null;

      try {
        await invalidateBatchCache(item.id);
        await invalidateInventoryCache(item.id);
        await invalidateItemsCache();
      } catch {
        // Ignore cache errors
      }

      results.success.push({
        name: item.name,
        category: category.name,
        category_type: category.type,
        quantity_added: row.quantity || 0,
        serialized: batchInfo?.needsSerialization || false,
        serial_count: batchInfo?.serialCount || 0,
      });
    } catch (err) {
      if (t && !t.finished) await t.rollback();
      results.errors.push({
        row_data: row,
        error: err.message,
      });
    }
  }

  return results;
};
