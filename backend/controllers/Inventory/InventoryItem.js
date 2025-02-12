const { InventoryItem } = require('../../models/Inventory/Associations');
const { BadRequestError, NotFoundError } = require('../../utils/Error');
const { StatusCodes } = require('http-status-codes');

const createItem = async (req, res) => {
  try {
    const { name, description, quantity } = req.body;

    if (!name || typeof quantity !== 'number') {
      throw new BadRequestError("Valid name and quantity required");
    }

    const newItem = await InventoryItem.create({ name, description, quantity });

    return res.status(StatusCodes.CREATED).json({
      success: true,
      data: newItem
    });

  } catch (error) {
    console.error('Creation Error:', error);
    next(error);
  }
};

const checkinItem = async (req, res, next) => {
  try {
    const { sku, quantity } = req.body;
    const userId = req.user.id;

    if (!userId || !sku || !quantity)
      throw new BadRequestError("Invalid Request! Required fields are missing.");

    if (typeof quantity !== 'number' || quantity <= 0) {
      throw new BadRequestError("Quantity must be a positive number.");
    }

    const checkin = await InventoryItem.checkin(sku, userId, quantity);
    if (!checkin) {
      throw new NotFoundError("Item not found.");
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      message: `${quantity} of ${sku} has been checked in by ${userId}`,
      data: checkin
    });

  } catch (error) {
    next(error);
  }
};

const checkoutItem = async (req, res, next) => {
  try {
    const { sku, quantity } = req.body;
    const userId = req.user.id;

    if (!userId || !sku || !quantity)
      throw new BadRequestError("Invalid Request! Required fields are missing.");

    if (typeof quantity !== 'number' || quantity <= 0) {
      throw new BadRequestError("Quantity must be a positive number.");
    }

    const checkout = await InventoryItem.checkout(sku, userId, quantity);
    if (!checkout) {
      throw new NotFoundError("Item not found.");
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      message: `${quantity} of ${sku} has been checked out by ${userId}`,
      data: checkout
    });

  } catch (error) {
    next(error);
  }
};

const updateItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, quantity } = req.body;

    if (!id || !name || typeof quantity !== 'number') {
      throw new BadRequestError("Invalid request parameters");
    }

    const [affectedCount] = await InventoryItem.update(
      { name, description, quantity },
      { where: { id } }
    );

    if (affectedCount === 0) {
      throw new NotFoundError("Item not found");
    }

    const updatedItem = await InventoryItem.findByPk(id);
    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Item updated successfully",
      data: updatedItem
    });

  } catch (error) {
    next(error);
  }
};

const softDeleteItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) throw new BadRequestError("Item ID is required");

    const item = await InventoryItem.findByPk(id);
    if (!item) throw new NotFoundError("Item not found");

    await item.update({ deletedAt: new Date() });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Item has been soft deleted"
    });

  } catch (error) {
    next(error);
  }
};

const restoreItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) throw new BadRequestError("Item ID is required");

    const item = await InventoryItem.findByPk(id, { paranoid: false });
    if (!item) throw new NotFoundError("Item not found");

    await item.update({ deletedAt: null });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Item has been restored",
      data: item
    });

  } catch (error) {
    next(error);
  }
};

const hardDeleteItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) throw new BadRequestError("Item ID is required");

    const item = await InventoryItem.findByPk(id, { paranoid: false });
    if (!item) throw new NotFoundError("Item not found");

    await item.destroy({ force: true });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Item has been permanently deleted"
    });

  } catch (error) {
    next(error);
  }
};

const getItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) throw new BadRequestError("Item ID is required");

    const item = await InventoryItem.findByPk(id, { paranoid: false });
    if (!item) throw new NotFoundError("Item not found.");

    return res.status(StatusCodes.OK).json({
      success: true,
      message: `Item Found: ${item.id}`,
      data: item
    });

  } catch (error) {
    next(error);
  }
};

const getAllItems = async (req, res, next) => {
  try {
    const { showDeleted } = req.query;
    const paranoidOption = showDeleted === 'true' ? false : true;

    const items = await InventoryItem.findAll({ paranoid: paranoidOption });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Items retrieved successfully",
      data: items
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  createItem,
  checkinItem,
  checkoutItem,
  updateItem,
  softDeleteItem,
  restoreItem,
  hardDeleteItem,
  getItem,
  getAllItems
};
