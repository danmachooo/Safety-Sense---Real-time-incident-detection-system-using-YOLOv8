import { Op } from "sequelize";
import {
  setCache,
  getCached,
  invalidateCache,
  invalidateCachePattern,
} from "../../services/redis/cache.js";
import { processExcelFile } from "./services/inventoryService.js";

import models from "../../models/index.js";
const { User, InventoryItem, Category, InventoryNotification } = models;

import { BadRequestError, NotFoundError } from "../../utils/Error.js";
import { getStatusCode, StatusCodes } from "http-status-codes";
import Batch from "../../models/Inventory/Batch.js";

// Helper function to invalidate all items-related cache
export const invalidateItemsCache = async () => {
  try {
    // Invalidate all cache keys that start with "items:"
    const result = await invalidateCachePattern("items:*");
    if (!result) {
      console.log("Failed to invalidate items cache pattern");
    }
    return result;
  } catch (error) {
    console.error("Error invalidating items cache:", error);
    return false;
  }
};

const createItem = async (req, res, next) => {
  try {
    const {
      name,
      description,
      category_id,
      quantity_in_stock,
      min_stock_level,
      unit_of_measure,
      condition,
      location,
      is_deployable,
      notes,
    } = req.body;

    if (!name || !category_id || !unit_of_measure || !location)
      throw new BadRequestError("Required Fields are missing.");

    const category = await Category.findByPk(category_id);
    if (!category) throw new BadRequestError("Invalid Category");

    const item = await InventoryItem.create({
      name,
      description,
      category_id,
      quantity_in_stock,
      min_stock_level,
      unit_of_measure,
      condition,
      location,
      is_deployable,
      notes,
    });

    // Create notification if stock is below minimum
    if (quantity_in_stock <= min_stock_level) {
      await InventoryNotification.create({
        notification_type: "LOW_STOCK",
        inventory_item_id: item.id,
        title: "Low Stock Alert",
        message: `${name} is below minimum stock level`,
        priority: "HIGH",
      });
    }

    // Invalidate all items-related cache
    await invalidateItemsCache();

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Item has been created.",
      data: item,
    });
  } catch (error) {
    console.error("Item creation error: ", error.message);
    next(error);
  }
};

const uploadExcelFile = async (req, res, next) => {
  try {
    if (!req.file) throw new BadRequestError("No file uploaded.");

    // Pass the file buffer instead of file path since we're using Supabase
    const result = await processExcelFile(req.file.buffer, req.user.id);

    // Invalidate cache after bulk upload
    await invalidateItemsCache();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Excel file processed.",
      data: result,
    });
  } catch (err) {
    console.error("Excel processing error:", err);
    next(err);
  }
};

const getAllItems = async (req, res, next) => {
  try {
    const {
      category_id,
      search,
      condition,
      is_deployable,
      page,
      limit,
      all, // 👈 optional query param, e.g. ?all=true
    } = req.query;

    const whereClause = {};
    if (category_id) whereClause.category_id = category_id;
    if (condition) whereClause.condition = condition;
    if (is_deployable !== undefined) whereClause.is_deployable = is_deployable;
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }

    // If `all=true`, we return everything (no pagination)
    const isGetAll = all === "true" || all === true;

    // Compute pagination only if not `all`
    const pageNumber = parseInt(page) || 1;
    const limitNumber = parseInt(limit) || 10;
    const offset = (pageNumber - 1) * limitNumber;

    // Create flexible cache key
    const cacheKey = `items:${isGetAll ? "all" : "page"}:${JSON.stringify({
      category_id,
      search,
      condition,
      is_deployable,
      page: isGetAll ? null : pageNumber,
      limit: isGetAll ? null : limitNumber,
    })}`;

    const cached = await getCached(cacheKey);
    if (cached) {
      console.log("Serving items from redis...");
      return res.status(StatusCodes.OK).json(cached);
    }

    let items, count;

    if (isGetAll) {
      // Fetch all items (no pagination)
      items = await InventoryItem.findAll({
        where: whereClause,
        include: [
          {
            model: Category,
            as: "category",
            attributes: ["id", "name", "type"],
          },
        ],
        order: [["name", "ASC"]],
      });
      count = items.length;
    } else {
      // Fetch paginated
      const result = await InventoryItem.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Category,
            as: "category",
            attributes: ["id", "name", "type"],
          },
        ],
        limit: limitNumber,
        offset: offset,
        order: [["name", "ASC"]],
      });
      items = result.rows;
      count = result.count;
    }

    const response = {
      success: true,
      message: "Items fetched successfully",
      data: items,
      meta: isGetAll
        ? null
        : {
            total: count,
            pages: Math.ceil(count / limitNumber),
            currentPage: pageNumber,
          },
    };

    await setCache(cacheKey, response, 300); // cache for 5 mins
    return res.status(StatusCodes.OK).json(response);
  } catch (error) {
    console.error("Fetching items error:", error);
    next(error);
  }
};

const getItemById = async (req, res, next) => {
  try {
    const itemId = req.params.id;
    const cacheKey = `item:${itemId}`;

    // Check cache first
    const cached = await getCached(cacheKey);
    if (cached) {
      console.log(`Serving item ${itemId} from redis...`);
      return res.status(StatusCodes.OK).json(cached);
    }

    const item = await InventoryItem.findByPk(itemId, {
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["id", "name", "type"],
        },
      ],
    });

    if (!item) throw new NotFoundError("Item not found.");

    const response = {
      success: true,
      message: "Item has been fetched.",
      data: item,
    };

    // Cache individual item for 10 minutes
    await setCache(cacheKey, response, 600);

    return res.status(StatusCodes.OK).json(response);
  } catch (error) {
    console.error("Fetching item error: ", error);
    next(error);
  }
};

const updateItem = async (req, res, next) => {
  try {
    const itemId = req.params.id;
    const item = await InventoryItem.findByPk(itemId);
    if (!item) throw new NotFoundError("Item not found.");

    const {
      name,
      description,
      category_id,
      quantity_in_stock,
      min_stock_level,
      unit_of_measure,
      condition,
      last_maintenance_date,
      next_maintenance_date,
      location,
      is_deployable,
      notes,
    } = req.body;

    await item.update({
      name,
      description,
      category_id,
      quantity_in_stock,
      min_stock_level,
      unit_of_measure,
      condition,
      last_maintenance_date,
      next_maintenance_date,
      location,
      is_deployable,
      notes,
    });

    // Check for maintenance notification
    if (next_maintenance_date) {
      const today = new Date();
      const maintenanceDate = new Date(next_maintenance_date);
      const daysUntilMaintenance = Math.ceil(
        (maintenanceDate - today) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilMaintenance <= 7) {
        await InventoryNotification.create({
          notification_type: "MAINTENANCE_DUE",
          inventory_item_id: item.id,
          title: "Maintenance Due Soon",
          message: `Maintenance due for ${name} in ${daysUntilMaintenance} days`,
          priority: "MEDIUM",
        });
      }
    }

    // Invalidate all items-related cache AND the specific item cache
    await Promise.all([
      invalidateItemsCache(),
      invalidateCachePattern(`item:${itemId}`),
    ]);

    return res.status(StatusCodes.OK).json({
      success: true,
      data: item,
      message: "Inventory item updated successfully",
    });
  } catch (error) {
    console.error("Update item error: ", error);
    next(error);
  }
};

const deleteItem = async (req, res, next) => {
  try {
    const itemId = req.params.id;
    const item = await InventoryItem.findByPk(itemId);
    if (!item) throw new NotFoundError("Item not found.");

    const batch = await Batch.findOne({
      where: { inventory_item_id: item.id },
    });
    if (batch)
      throw new BadRequestError("A batch exists! Unable to remove item");

    await item.destroy();
    console.log("Item has been deleted");

    // Invalidate all items-related cache AND the specific item cache
    await Promise.all([
      invalidateItemsCache(),
      invalidateCachePattern(`item:${itemId}`),
    ]);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Inventory item deleted successfully",
    });
  } catch (error) {
    console.error("Delete Item error: ", error.message);
    next(error);
  }
};

const restoreItem = async (req, res, next) => {
  try {
    const itemId = req.params.id;
    const item = await InventoryItem.findByPk(itemId, {
      paranoid: false,
    });
    if (!item) throw new NotFoundError("Item not found.");

    await item.restore();

    // Invalidate all items-related cache AND the specific item cache
    await Promise.all([
      invalidateItemsCache(),
      invalidateCachePattern(`item:${itemId}`),
    ]);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Inventory item restored successfully",
    });
  } catch (error) {
    console.error("Restore Item error: ", error.message);
    next(error);
  }
};

export {
  createItem,
  getAllItems,
  getItemById,
  updateItem,
  deleteItem,
  restoreItem,
  uploadExcelFile,
};
