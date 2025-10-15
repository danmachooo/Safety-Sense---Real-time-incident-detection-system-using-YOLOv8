import xlsx from "xlsx";
import models from "../../../models/index.js";
import { BadRequestError } from "../../../utils/Error.js";
import sequelize from "../../../config/database.js";

const { InventoryItem, Category, Batch, Notification, SerializedItem } = models;

// Helper function to convert Excel dates
const convertExcelDate = (excelDate) => {
  if (!excelDate) return null;

  // If it's already a Date object, return it
  if (excelDate instanceof Date) {
    return excelDate;
  }

  // If it's a string that looks like a date, try to parse it
  if (typeof excelDate === "string") {
    const parsed = new Date(excelDate);
    // Check if it's a valid date
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  // If it's a number (Excel serial date), convert it
  if (typeof excelDate === "number") {
    // Excel's epoch starts on January 1, 1900 (but there's a leap year bug)
    // JavaScript's epoch starts on January 1, 1970
    const excelEpoch = new Date(1900, 0, 1);
    const jsDate = new Date(
      excelEpoch.getTime() + (excelDate - 1) * 24 * 60 * 60 * 1000
    );

    // Handle Excel's leap year bug (it thinks 1900 is a leap year)
    if (excelDate > 59) {
      jsDate.setTime(jsDate.getTime() - 24 * 60 * 60 * 1000);
    }

    return jsDate;
  }

  return null;
};

// Alternative: Use xlsx's built-in date conversion
const convertExcelDateBuiltIn = (excelDate) => {
  if (!excelDate) return null;

  // If it's already a Date object, return it
  if (excelDate instanceof Date) {
    return excelDate;
  }

  // If it's a number (Excel serial date), use xlsx's conversion
  if (typeof excelDate === "number") {
    return xlsx.SSF.parse_date_code(excelDate);
  }

  // If it's a string, try to parse it
  if (typeof excelDate === "string") {
    const parsed = new Date(excelDate);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
};

// Fixed serialization algorithm - only for returnable items and equipment
const shouldSerializeItem = (item, category) => {
  // Method 1: Check if item is explicitly marked as returnable
  if (item.is_returnable === true) {
    return true;
  }

  // Method 2: Check category type - only these categories get serialized
  const serializableCategories = [
    "EQUIPMENT",
    "VEHICLES",
    "COMMUNICATION_DEVICES",
  ];

  if (serializableCategories.includes(category.type?.toUpperCase())) {
    return true;
  }

  // Method 3: Check for high-value or trackable items by name/description
  const itemText = `${item.name} ${item.description || ""}`.toLowerCase();

  // Non-returnable keywords (consumables/disposables) - these should NEVER be serialized
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
    "antibiotic",
    "paracetamol",
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

  // First check if it's a consumable - these should never be serialized
  const isConsumable = consumableKeywords.some((keyword) =>
    itemText.includes(keyword.toLowerCase())
  );

  if (isConsumable) {
    return false;
  }

  // Trackable patterns for high-value or critical items
  const trackablePatterns = [
    // Medical equipment patterns
    /\b(defibrillator|ventilator|monitor|stretcher|wheelchair)\b/,
    /\b(oxygen\s+(tank|cylinder)|medical\s+kit)\b/,

    // Vehicle patterns
    /\b(ambulance|truck|vehicle|motorbike|bicycle)\b/,

    // Communication & IT
    /\b(radio|laptop|tablet|computer|generator)\b/,
    /\b(walkie[\s-]*talkie|two[\s-]*way\s+radio)\b/,

    // Tools & Equipment
    /\b(chainsaw|drill|pump|tent|shelter)\b/,
    /\b(emergency\s+kit|rescue\s+kit|tool\s+kit)\b/,

    // High-value supplies that need individual tracking
    /\b(solar\s+panel|battery\s+pack|power\s+bank)\b/,
    /\b(blanket|tarpaulin|rope|cable|hose)\b/,
    /\b(flashlight|torch|lantern)\b/,
  ];

  // Check if any pattern matches
  const shouldTrack = trackablePatterns.some((pattern) =>
    pattern.test(itemText)
  );

  return shouldTrack;
};

// Generate serial numbers
const generateSerialNumbers = (batchNumber, quantity, categoryCode) => {
  const date = new Date();
  const yymmdd =
    date.getFullYear().toString().slice(-2) +
    (date.getMonth() + 1).toString().padStart(2, "0") +
    date.getDate().toString().padStart(2, "0");

  return Array.from({ length: quantity }, (_, i) => {
    const sequence = (i + 1).toString().padStart(3, "0");
    return `${categoryCode}-${batchNumber}-${yymmdd}-${sequence}`;
  });
};

// Updated function to work with buffer instead of file path and include serialization
export const processExcelFile = async (fileBuffer, userId) => {
  // Read workbook from buffer instead of file path
  const workbook = xlsx.read(fileBuffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  // Option 1: Use raw data and convert dates manually
  const data = xlsx.utils.sheet_to_json(sheet);

  // Option 2: Use cellDates option to automatically convert dates
  // const data = xlsx.utils.sheet_to_json(sheet, { cellDates: true });

  const results = { success: [], errors: [] };

  for (const row of data) {
    let t; // Declare transaction variable outside try block
    try {
      // Create a new transaction for each row
      t = await sequelize.transaction();

      // ✅ Validate required fields
      if (
        !row.name ||
        !row.category ||
        row.unit_price === undefined ||
        row.min_stock_level === undefined
      ) {
        throw new BadRequestError(
          `Missing required fields in: ${JSON.stringify(row)}`
        );
      }

      // ✅ Safe category type fallback
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

      // ✅ Find or create category
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

      // ✅ Create or update inventory item
      let item = await InventoryItem.findOne({
        where: { name: row.name },
        include: [{ model: Category, as: "category" }],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      const isNewItem = !item;

      if (isNewItem) {
        item = await InventoryItem.create(
          {
            name: row.name,
            description: row.description || "",
            category_id: category.id,
            quantity_in_stock: 0,
            unit_price: row.unit_price,
            min_stock_level: row.min_stock_level,
            reorder_level: row.reorder_level || 0,
            unit_of_measure: row.unit_of_measure || "pcs",
            condition: row.condition || "GOOD",
            location: row.location || "Warehouse",
            is_deployable: row.is_deployable ?? true,
            is_returnable: row.is_returnable ?? null, // Let it be determined by algorithm
            notes: row.notes || "",
          },
          { transaction: t }
        );

        // Reload item with category for serialization check
        await item.reload({
          include: [{ model: Category, as: "category" }],
          transaction: t,
        });
      } else {
        await item.update(
          {
            description: row.description || item.description,
            category_id: category.id,
            unit_price: row.unit_price,
            min_stock_level: row.min_stock_level,
            reorder_level: row.reorder_level || item.reorder_level,
            unit_of_measure: row.unit_of_measure || item.unit_of_measure,
            condition: row.condition || item.condition,
            location: row.location || item.location,
            is_deployable: row.is_deployable ?? item.is_deployable,
            is_returnable: row.is_returnable ?? item.is_returnable,
            notes: row.notes || item.notes,
          },
          { transaction: t }
        );
      }

      // 🔧 FIXED: Convert Excel date properly

      // ✅ Create batch if quantity exists
      if (row.quantity !== undefined && row.quantity > 0) {
        // Generate batch number using same logic as BatchController
        const itemPrefix = item.name.slice(0, 3).toUpperCase();
        const currentDate = new Date()
          .toISOString()
          .replace(/[-:TZ]/g, "")
          .slice(0, 14);
        const batchNumber = `${itemPrefix}${currentDate}`;

        // 🔧 FIXED: Use improved serialization algorithm
        const needsSerialization = shouldSerializeItem(item, category);

        const batch = await Batch.create(
          {
            inventory_item_id: item.id,
            quantity: row.quantity,
            batch_number: batchNumber,
            supplier: row.supplier || "Unknown",
            received_by: userId,
            received_date: new Date(),
            funding_source: row.funding_source || null,
            cost: row.cost || null,
            notes: row.batch_notes || "",
            is_active: true,
          },
          { transaction: t }
        );

        // 🔧 NEW: Add serialization for returnable/trackable items only
        if (needsSerialization) {
          const categoryCode = category.type
            .slice(0, 3)
            .toUpperCase()
            .padEnd(3, "X");

          const serialNumbers = generateSerialNumbers(
            batchNumber,
            row.quantity,
            categoryCode
          );

          const serializedItems = serialNumbers.map((serialNumber) => ({
            serial_number: serialNumber,
            batch_id: batch.id,
            inventory_item_id: item.id,
            status: "AVAILABLE",
            created_by: userId,
          }));

          await SerializedItem.bulkCreate(serializedItems, { transaction: t });
          console.log(
            `✅ Generated ${row.quantity} serial numbers for ${item.name} (${category.type})`
          );
        } else {
          console.log(
            `ℹ️  No serialization needed for ${item.name} (${category.type}) - consumable/non-trackable item`
          );
        }

        await item.increment("quantity_in_stock", {
          by: row.quantity,
          transaction: t,
        });

        // Determine serialization reason for debugging
        let serializationReason = "not_trackable";
        if (needsSerialization) {
          if (item.is_returnable === true) {
            serializationReason = "marked_returnable";
          } else if (
            ["EQUIPMENT", "VEHICLES", "COMMUNICATION_DEVICES"].includes(
              category.type
            )
          ) {
            serializationReason = "equipment_category";
          } else {
            serializationReason = "trackable_pattern";
          }
        }

        // ✅ Log success with detailed serialization info
        results.success.push({
          name: item.name,
          status: isNewItem ? "created" : "updated",
          quantity_added: row.quantity || 0,
          category: category.name,
          category_type: category.type,
          current_stock: item.quantity_in_stock + row.quantity,

          serialized: needsSerialization,
          serial_count: needsSerialization ? row.quantity : 0,
          batch_number: batchNumber,
          serialization_reason: serializationReason,
        });
      }

      // 🔔 Low stock notification
      const finalStock = item.quantity_in_stock + (row.quantity || 0);
      if (finalStock <= item.min_stock_level) {
        await Notification.create(
          {
            notification_type: "LOW_STOCK",
            inventory_item_id: item.id,
            user_id: userId,
            title: "Low Stock Alert",
            message: `${item.name} is below minimum stock level. Current stock: ${finalStock}, Minimum required: ${item.min_stock_level}`,
            priority: "MEDIUM",
          },
          { transaction: t }
        );
      }

      // Commit transaction for this row
      await t.commit();

      // Set transaction to null after successful commit to avoid rollback attempts
      t = null;

      // Invalidate caches after successful commit
      try {
        await invalidateBatchCache(item.id);
        await invalidateInventoryCache(item.id);
        await invalidateItemsCache();
      } catch (cacheError) {
        console.warn("Cache invalidation failed:", cacheError.message);
        // Don't throw error for cache issues, just log it
      }
    } catch (err) {
      console.error(`❌ Error processing row:`, row, err.message);

      // Only rollback if transaction exists and hasn't been committed
      if (t && !t.finished) {
        try {
          await t.rollback();
        } catch (rollbackError) {
          console.error("Rollback failed:", rollbackError.message);
        }
      }

      results.errors.push({
        row_data: {
          name: row.name || "Unknown",
          category: row.category || "Unknown",
          unit_price: row.unit_price,
          quantity: row.quantity,
        },
        error: err.message,
      });
    }
  }

  // Summary logging
  console.log(`\n📊 Excel Import Summary:`);
  console.log(`✅ Successful: ${results.success.length} items`);
  console.log(`❌ Failed: ${results.errors.length} items`);

  const serializedCount = results.success.filter(
    (item) => item.serialized
  ).length;
  const totalSerialNumbers = results.success.reduce(
    (sum, item) => sum + item.serial_count,
    0
  );

  console.log(`🔢 Serialized Items: ${serializedCount}`);
  console.log(`📱 Total Serial Numbers Generated: ${totalSerialNumbers}`);

  return results;
};
