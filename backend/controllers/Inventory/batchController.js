const { Op } = require("sequelize");
const { InventoryItem, Batch } = require("../../models/Inventory");
const User = require("../../models/Users/User");
const Notification = require("../../models/Inventory/InventoryNotification");
const {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
} = require("../../utils/Error");
const { StatusCodes } = require("http-status-codes");
const {
  getCached,
  setCache,
  invalidateCache,
} = require("../../services/redis/cache");
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
        await Notification.create({
          notification_type: "EXPIRING_SOON",
          inventory_item_id,
          user_id: received_by,
          title: "Batch Expiring Soon",
          message: `Batch ${batch_number} of ${item.name} will expire in ${daysUntilExpiry} days`,
          priority: daysUntilExpiry <= 7 ? "HIGH" : "MEDIUM",
        });
      }
    }
    const result = await invalidateCache("category");

    if (!result) {
      console.log("Failed to invalidate cache");
    }
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
  const cacheKey = `batch:all:${JSON.stringify(req.query)}`;
  try {
    const cached = await getCached(cachedKey);
    if (cached) {
      console.log("Serving batch from redis...");
      return res.status(StatusCodes.OK).json(cached);
    }

    const { count, rows: batches } = await Batch.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: InventoryItem,
          as: "inventoryBatchItem",
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
    await setCache(cacheKey, response, 60);

    return res.status(StatusCodes.OK).json(response);
  } catch (error) {
    console.error("Get all batches Error: ", error.message);
    next(error);
  }
};

const getBatchById = async (req, res, next) => {
  try {
    const batch = await Batch.findByPk(req.params.id, {
      include: [
        {
          model: InventoryItem,
          as: "inventoryBatchItem",
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

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Batch found successfully.",
      data: batch,
    });
  } catch (error) {
    console.error("Get batch by id error: ", error.message);
    next(error);
  }
};

const updateBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findByPk(req.params.id);
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
        await Notification.create({
          notification_type: "EXPIRING_SOON",
          inventory_item_id: batch.inventory_item_id,
          title: "Updated Batch Expiring Soon",
          message: `Batch ${batch.batch_number} will expire in ${daysUntilExpiry} days`,
          priority: daysUntilExpiry <= 7 ? "HIGH" : "MEDIUM",
        });
      }
    }
    const result = await invalidateCache("category");

    if (!result) {
      console.log("Failed to invalidate cache");
    }
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
    const batch = await Batch.findByPk(req.params.id);
    if (!batch) throw new NotFoundError("Batch not found");

    // Update inventory item quantity before deleting
    const item = await InventoryItem.findByPk(batch.inventory_item_id);
    await item.decrement("quantity_in_stock", { by: batch.quantity });

    await batch.destroy();
    const result = await invalidateCache("category");

    if (!result) {
      console.log("Failed to invalidate cache");
    }
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
    const batch = await Batch.findByPk(req.params.id, { paranoid: false }); // Include soft-deleted records
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
    const result = await invalidateCache("category");

    if (!result) {
      console.log("Failed to invalidate cache");
    }
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
          as: "inventoryBatchItem",
          attributes: ["id", "name", "unit_of_measure"],
        },
      ],
      limit: Number.parseInt(limit),
      offset: Number.parseInt(offset),
      order: [["expiry_date", "ASC"]],
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Fetching Expiring Batches",
      data: batches,
      meta: {
        total: count,
        pages: Math.ceil(count / limit),
        currentPage: Number.parseInt(page),
      },
    });
  } catch (error) {
    console.error("Expiring Batches error: ", error.message);
    next(error);
  }
};

module.exports = {
  createBatch,
  getAllBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
  restoreBatch,
  getExpiringBatches,
};
