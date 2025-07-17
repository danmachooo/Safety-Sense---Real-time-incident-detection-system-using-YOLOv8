import { Op } from "sequelize";

import models from "../../models/index.js";
const { User, InventoryItem, Category, Batch, InventoryNotification } = models;
import { invalidateItemsCache } from "./utils/cacheUtil.js";
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

const createBatch = async (req, res, next) => {
  try {
    const {
      inventory_item_id,
      quantity,
      expiry_date,
      supplier,
      funding_source,
      cost,
      notes,
    } = req.body;

    // Assuming user ID is available in req.user.id from auth middleware
    const received_by = req.user.id;

    // Check if inventory item exists
    const item = await InventoryItem.findByPk(inventory_item_id);
    if (!item) throw new BadRequestError("Item not found");

    // Generate batch number
    const itemPrefix = item.name.slice(0, 3).toUpperCase();
    const currentDate = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .slice(0, 14);
    const batch_number = `${itemPrefix}${currentDate}`;

    if (!inventory_item_id || !quantity)
      throw new BadRequestError("Required fields are missing");

    const batch = await Batch.create({
      inventory_item_id,
      batch_number,
      quantity,
      expiry_date,
      supplier,
      received_by,
      received_date: new Date(),
      funding_source,
      cost,
      notes,
      is_active: true,
    });

    // Update inventory item quantity
    await item.increment("quantity_in_stock", { by: quantity });

    // Check for expiry notification if expiry date is set
    if (expiry_date) {
      const expiryDate = new Date(expiry_date);
      const today = new Date();
      const daysUntilExpiry = Math.ceil(
        (expiryDate - today) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiry <= 30) {
        await InventoryNotification.create({
          notification_type: "EXPIRING_SOON",
          inventory_item_id,
          user_id: received_by,
          title: "Batch Expiring Soon",
          message: `Batch ${batch_number} of ${item.name} will expire in ${daysUntilExpiry} days`,
          priority: daysUntilExpiry <= 7 ? "HIGH" : "MEDIUM",
        });
      }
    }

    // ✅ FIXED: Invalidate relevant caches
    await invalidateBatchCache(inventory_item_id);
    await invalidateInventoryCache(inventory_item_id);
    await invalidateItemsCache(); // Your existing cache invalidation

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: "A batch has been created!",
      data: batch,
    });
  } catch (error) {
    console.error("Batch Creation error: ", error.message);
    next(error);
  }
};

const getAllBatches = async (req, res, next) => {
  const {
    item_id,
    supplier,
    expiring_soon,
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
  if (expiring_soon === "true") {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    whereClause.expiry_date = {
      [Op.and]: [
        { [Op.not]: null },
        { [Op.lte]: thirtyDaysFromNow },
        { [Op.gt]: new Date() },
      ],
    };
  }
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
          as: "inventoryItem",
          attributes: ["id", "name", "unit_of_measure"],
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
          as: "inventoryItem",
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

    const {
      quantity,
      expiry_date,
      supplier,
      funding_source,
      cost,
      notes,
      is_active,
    } = req.body;

    // Calculate quantity difference if quantity is being updated
    const quantityDiff = quantity ? quantity - batch.quantity : 0;

    await batch.update({
      quantity,
      expiry_date,
      supplier,
      funding_source,
      cost,
      notes,
      is_active,
    });

    // Update inventory item quantity if changed
    if (quantityDiff !== 0) {
      const item = await InventoryItem.findByPk(batch.inventory_item_id);
      await item.increment("quantity_in_stock", { by: quantityDiff });
    }

    // Check for expiry notification if expiry date is updated
    if (expiry_date && expiry_date !== batch.expiry_date) {
      const expiryDate = new Date(expiry_date);
      const today = new Date();
      const daysUntilExpiry = Math.ceil(
        (expiryDate - today) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiry <= 30) {
        await InventoryNotification.create({
          notification_type: "EXPIRING_SOON",
          inventory_item_id: batch.inventory_item_id,
          title: "Updated Batch Expiring Soon",
          message: `Batch ${batch.batch_number} will expire in ${daysUntilExpiry} days`,
          priority: daysUntilExpiry <= 7 ? "HIGH" : "MEDIUM",
        });
      }
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

const getExpiringBatches = async (req, res, next) => {
  try {
    const { days = 30, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // ✅ FIXED: Add caching for expiring batches
    const cacheKey = `batch:expiring:${days}:${page}:${limit}`;
    const cached = await getCached(cacheKey);
    if (cached) {
      console.log("Serving expiring batches from redis...");
      return res.status(StatusCodes.OK).json(cached);
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + Number.parseInt(days));

    const { count, rows: batches } = await Batch.findAndCountAll({
      where: {
        expiry_date: {
          [Op.and]: [
            { [Op.not]: null },
            { [Op.lte]: expiryDate },
            { [Op.gt]: new Date() },
          ],
        },
        is_active: true,
      },
      include: [
        {
          model: InventoryItem,
          as: "inventoryItem",
          attributes: ["id", "name", "unit_of_measure"],
        },
      ],
      limit: Number.parseInt(limit),
      offset: Number.parseInt(offset),
      order: [["expiry_date", "ASC"]],
    });

    const response = {
      success: true,
      message: "Fetching Expiring Batches",
      data: batches,
      meta: {
        total: count,
        pages: Math.ceil(count / limit),
        currentPage: Number.parseInt(page),
      },
    };

    // Cache for shorter time since this is time-sensitive data
    await setCache(cacheKey, response, 300); // 5 minutes

    return res.status(StatusCodes.OK).json(response);
  } catch (error) {
    console.error("Expiring Batches error: ", error.message);
    next(error);
  }
};

export {
  createBatch,
  getAllBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
  restoreBatch,
  getExpiringBatches,
};
