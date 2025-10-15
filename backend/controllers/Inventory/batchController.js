import { Op, Sequelize } from "sequelize";

import models from "../../models/index.js";
const {
  User,
  InventoryItem,
  Category,
  Batch,
  InventoryNotification,
  SerialItemDeployment,
  SerializedItem,
} = models;
import { invalidateItemsCache } from "../Inventory/inventoryitemController.js";
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
} from "../../utils/Error.js";
import { StatusCodes } from "http-status-codes";
import {
  getCached,
  setCache,
  invalidateBatchCache,
  invalidateInventoryCache,
  invalidateCategoryCache,
} from "../../services/redis/cache.js";
import sequelize from "../../config/database.js";

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

const createBatch = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const {
      inventory_item_id,
      quantity,
      supplier,
      funding_source,
      unit_price,
      notes,
    } = req.body;

    if (!inventory_item_id || !quantity) {
      throw new BadRequestError("Required fields are missing");
    }

    const received_by = req.user.id;

    const item = await InventoryItem.findByPk(inventory_item_id, {
      include: [{ model: Category, as: "category" }],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!item) throw new BadRequestError("Item not found");

    // Generate batch number
    const itemPrefix = item.name.slice(0, 3).toUpperCase();
    const currentDate = new Date()
      .toISOString()
      .replace(/[-:TZ]/g, "")
      .slice(0, 14);
    const batch_number = `${itemPrefix}${currentDate}`;

    // 🔧 UPDATED: Use improved serialization algorithm
    const needsSerialization = shouldSerializeItem(item, item.category);

    // Log serialization decision for debugging
    console.log(
      `🔍 Serialization check for "${item.name}" (${item.category.type}): ${
        needsSerialization ? "✅ YES" : "❌ NO"
      }`
    );
    const amount = quantity * unit_price;

    // Create batch record
    const newBatch = await Batch.create(
      {
        inventory_item_id,
        batch_number,
        quantity,
        supplier,
        received_by,
        received_date: new Date(),
        funding_source,
        unit_price,
        amount,
        notes,
        is_active: true,
      },
      { transaction: t }
    );

    if (needsSerialization) {
      const categoryCode = item.category.type
        .slice(0, 3)
        .toUpperCase()
        .padEnd(3, "X");

      const serialNumbers = generateSerialNumbers(
        batch_number,
        quantity,
        categoryCode
      );

      const serializedItems = serialNumbers.map((serialNumber) => ({
        serial_number: serialNumber,
        batch_id: newBatch.id,
        inventory_item_id,
        status: "AVAILABLE",
        created_by: received_by,
      }));

      await SerializedItem.bulkCreate(serializedItems, { transaction: t });
      console.log(
        `Generated ${quantity} serial numbers for ${item.name} (${item.category.type})`
      );
    } else {
      console.log(
        `No serialization needed for ${item.name} (${item.category.type}) - consumable/non-trackable item`
      );
    }

    await item.increment("quantity_in_stock", { by: quantity, transaction: t });

    // Determine serialization reason for response
    let serializationReason = "not_trackable";
    if (needsSerialization) {
      if (item.is_returnable === true) {
        serializationReason = "marked_returnable";
      } else if (
        ["EQUIPMENT", "VEHICLES", "COMMUNICATION_DEVICES"].includes(
          item.category.type
        )
      ) {
        serializationReason = "equipment_category";
      } else {
        serializationReason = "trackable_pattern";
      }
    }

    // Commit transaction
    await t.commit();

    // Invalidate caches AFTER successful commit
    try {
      await invalidateBatchCache(inventory_item_id);
      await invalidateInventoryCache(inventory_item_id);
      await invalidateItemsCache();
    } catch (cacheError) {
      console.warn("Cache invalidation failed:", cacheError.message);
    }

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: needsSerialization
        ? `Batch created with ${quantity} serialized items!`
        : "Batch created successfully!",
      data: {
        batch: newBatch,
        serialized: needsSerialization,
        serial_count: needsSerialization ? quantity : 0,
        serialization_reason: serializationReason,
        category_type: item.category.type,
      },
    });
  } catch (error) {
    await t.rollback();
    console.error("❌ Batch Creation error: ", error);
    next(error);
  }
};

// Get serialized items for a specific batch or item
const getSerializedItems = async (req, res, next) => {
  try {
    const {
      batch_id,
      inventory_item_id,
      status,
      page = 1,
      limit = 20,
      sort = "ASC",
    } = req.query;

    const whereClause = {};
    if (batch_id) whereClause.batch_id = batch_id;
    if (inventory_item_id) whereClause.inventory_item_id = inventory_item_id;
    if (status) whereClause.status = status;

    const offset = (page - 1) * limit;

    const { rows: serializedItems, count } =
      await SerializedItem.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Batch,
            as: "batch",
          },
          {
            model: InventoryItem,
            as: "item",
            include: [
              {
                model: Category,
                as: "category",
              },
            ],
          },
        ],
        order: [["serial_number", sort.toUpperCase()]],
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      });

    return res.status(StatusCodes.OK).json({
      success: true,
      data: serializedItems,
      pagination: {
        total: count,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("❌ Get Serialized Items error: ", error.message);
    next(error);
  }
};

export const getSerializedItemsByBatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, sort = "ASC" } = req.query;

    if (!id) {
      throw new BadRequestError("ID is required.");
    }

    const offset = (page - 1) * limit;

    const { rows: serializedItems, count } =
      await SerializedItem.findAndCountAll({
        where: { inventory_item_id: id, status: "AVAILABLE" },
        include: [
          {
            model: Batch,
            as: "batch",
          },
          {
            model: InventoryItem,
            as: "item",
            include: [
              {
                model: Category,
                as: "category",
              },
            ],
          },
        ],
        order: [["serial_number", sort.toUpperCase()]],
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      });

    return res.status(StatusCodes.OK).json({
      success: true,
      data: serializedItems,
      pagination: {
        total: count,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("❌ Get Serialized Items by Batch error:", error.message);
    next(error);
  }
};

const getAllBatches = async (req, res, next) => {
  const {
    item_id,
    supplier,
    is_active,
    search,
    page = 1,
    limit = 10,
  } = req.query;

  const offset = (page - 1) * limit;
  const whereClause = {};

  if (item_id) whereClause.inventory_item_id = item_id;
  if (supplier) whereClause.supplier = { [Op.like]: `%${supplier}%` };
  if (is_active !== undefined) whereClause.is_active = is_active === "true";
  if (search) {
    whereClause.batch_number = { [Op.like]: `%${search}%` };
  }

  // ✅ FIXED: Create a more specific cache key
  const cacheKey = `batch:all:${JSON.stringify({
    ...req.query,
    page: Number.parseInt(page),
    limit: Number.parseInt(limit),
  })}`;

  try {
    const cached = await getCached(cacheKey);
    if (cached) {
      console.log("Serving batch from redis...");
      return res.status(StatusCodes.OK).json(cached);
    }

    const { count, rows: batches } = await Batch.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: InventoryItem,
          as: "item",
          attributes: ["id", "name", "unit_of_measure", "condition"],
        },
        {
          model: User,
          as: "receiver",
          attributes: ["id", "firstname", "lastname"],
        },
      ],
      limit: Number.parseInt(limit),
      offset: Number.parseInt(offset),
      order: [
        ["received_date", "DESC"],
        ["batch_number", "ASC"],
      ],
    });

    const response = {
      success: true,
      message: "Retrieving Batches...",
      data: batches,
      meta: {
        total: count,
        pages: Math.ceil(count / limit),
        currentPage: Number.parseInt(page),
      },
    };

    // ✅ FIXED: Set cache with shorter expiry for frequently changing data
    await setCache(cacheKey, response, 120); // 2 minutes

    return res.status(StatusCodes.OK).json(response);
  } catch (error) {
    console.error("Get all batches Error: ", error.message);
    next(error);
  }
};

const getBatchById = async (req, res, next) => {
  try {
    const batchId = req.params.id;
    const cacheKey = `batch:single:${batchId}`;

    // ✅ FIXED: Add caching for single batch
    const cached = await getCached(cacheKey);
    if (cached) {
      console.log("Serving single batch from redis...");
      return res.status(StatusCodes.OK).json(cached);
    }

    const batch = await Batch.findByPk(batchId, {
      include: [
        {
          model: InventoryItem,
          as: "item",
          attributes: ["id", "name", "unit_of_measure"],
        },
        {
          model: User,
          as: "receiver",
          attributes: ["id", "firstname", "lastname"],
        },
      ],
    });

    if (!batch) throw new NotFoundError("Batch not found.");

    const response = {
      success: true,
      message: "Batch found successfully.",
      data: batch,
    };

    await setCache(cacheKey, response, 300); // 5 minutes

    return res.status(StatusCodes.OK).json(response);
  } catch (error) {
    console.error("Get batch by id error: ", error.message);
    next(error);
  }
};

const updateBatch = async (req, res, next) => {
  try {
    const batchId = req.params.id;
    const batch = await Batch.findByPk(batchId);
    if (!batch) throw new NotFoundError("Batch not found");

    const { quantity, supplier, funding_source, unit_price, notes, is_active } =
      req.body;

    // Calculate quantity difference if quantity is being updated
    const quantityDiff = quantity ? quantity - batch.quantity : 0;
    const newAmount = unit_price * quantity;

    await batch.update({
      quantity,
      supplier,
      funding_source,
      unit_price,
      newAmount,
      notes,
      is_active,
    });

    // Update inventory item quantity if changed
    if (quantityDiff !== 0) {
      const item = await InventoryItem.findByPk(batch.inventory_item_id);
      await item.increment("quantity_in_stock", { by: quantityDiff });
    }

    // ✅ FIXED: Invalidate relevant caches
    await invalidateBatchCache(batch.inventory_item_id);
    await invalidateInventoryCache(batch.inventory_item_id);
    await invalidateItemsCache();

    return res.status(StatusCodes.OK).json({
      success: true,
      data: batch,
      message: "Batch updated successfully",
    });
  } catch (error) {
    console.error("Batch update error: ", error.message);
    next(error);
  }
};

const deleteBatch = async (req, res, next) => {
  try {
    const batchId = req.params.id;
    const batch = await Batch.findByPk(batchId);
    if (!batch) throw new NotFoundError("Batch not found");

    const inventoryItemId = batch.inventory_item_id;

    // Update inventory item quantity before deleting
    const item = await InventoryItem.findByPk(inventoryItemId);
    await item.decrement("quantity_in_stock", { by: batch.quantity });

    await batch.destroy();

    // ✅ FIXED: Proper cache invalidation after deletion
    await invalidateBatchCache(inventoryItemId);
    await invalidateInventoryCache(inventoryItemId);
    await invalidateItemsCache();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Batch deleted successfully",
    });
  } catch (error) {
    console.error("Delete Batch error: ", error.message);
    next(error);
  }
};

const restoreBatch = async (req, res, next) => {
  try {
    const batchId = req.params.id;
    const batch = await Batch.findByPk(batchId, { paranoid: false }); // Include soft-deleted records
    if (!batch) throw new NotFoundError("Batch not found");

    if (!batch.deletedAt) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Batch is not deleted",
      });
    }

    // Restore batch
    await batch.restore();

    // Update inventory item quantity after restoring
    const item = await InventoryItem.findByPk(batch.inventory_item_id);
    if (!item) throw new NotFoundError("Inventory item not found");

    await item.increment("quantity_in_stock", { by: batch.quantity });

    // ✅ FIXED: Invalidate relevant caches
    await invalidateBatchCache(batch.inventory_item_id);
    await invalidateInventoryCache(batch.inventory_item_id);
    await invalidateItemsCache();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Batch restored successfully",
    });
  } catch (error) {
    console.error("Restore Batch error:", error.message);
    next(error);
  }
};

export {
  createBatch,
  getSerializedItems,
  getAllBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
  restoreBatch,
};
