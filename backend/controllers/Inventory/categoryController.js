const { StatusCodes } = require('http-status-codes');
const {Category, InventoryItem} = require('../../models/Inventory');
const { BadRequestError, NotFoundError, ForbiddenError, UnauthorizedError  } = require('../../utils/Error');

const { Op } = require('sequelize');

const createCategory = async (req, res, next) => {
  try {
    const { name, description, type } = req.body;

    if (!name || !type) throw new BadRequestError('Required fields are missing');

    const existingCategory = await Category.findOne({ where: { name } });
    if (existingCategory) throw new BadRequestError('Already Exist Category');

    const category = await Category.create({ name, description, type });
    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Category has been saved',
      data: category
    });
  } catch (error) {
    console.error('Category Creation error: ', error.message);
    next(error);
  }
};

const getAllCategories = async (req, res, next) => {
  try {
    const { type, search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (type) whereClause.type = type;
    if (search) {
      whereClause.name = { [Op.like]: `%${search}%` };
    }

    const { count, rows: categories } = await Category.findAndCountAll({
      where: whereClause,
      include: [{
        model: InventoryItem,
        as: 'inventoryItems',
        attributes: ['id', 'name', 'quantity_in_stock']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['name', 'ASC']]
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'Fetching Categories',
      data: categories,
      meta: {
        total: count,
        pages: Math.ceil(count / limit),
        currentPage: parseInt(page)
      }
    });
  } catch (error) {
    console.error('Feth Categories error: ', error.message);
    next(error);
  }
};

const getCategoryById = async (req, res, next) => {
  try {
    const category = await Category.findByPk(req.params.id, {
      include: [{
        model: InventoryItem,
        as: 'inventoryItems'
      }]
    });
    if (!category) throw new NotFoundError('Category Not Found.')
    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'Fetching a Category',
      data: category
    });
  } catch (error) {
    console.error('Fetch a Category error: ', error.message);
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const { name, description, type } = req.body;
    const category = await Category.findByPk(req.params.id);

    if (!category) throw new NotFoundError('Category Not Found.')


    if (name) {
      const existingCategory = await Category.findOne({
        where: { 
          name,
          id: { [Op.ne]: req.params.id }
        }
      });

      if (existingCategory) if (!category) throw new BadRequestError('Category already exists.')

    }

    await category.update({ name, description, type });
    
    return res.status(StatusCodes.OK).json({
      success: true,
      data: category,
      message: 'Category updated successfully'
    });
  } catch (error) {
    console.error('Category Update error: ', error.message);
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findByPk(req.params.id);
    
    if (!category)  if (!category) throw new NotFoundError('Category Not Found.')


    const itemCount = await InventoryItem.count({
      where: { category_id: req.params.id }
    });

    if (itemCount > 0) throw new BadRequestError('Cannot delete category with associated items');

    await category.destroy();
    
    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Category Delete error: ', error.message);
    next(error);
  }
};

const restoreCategory = async (req, res, next) => {
  try {
    const category = await Category.findByPk(req.params.id, { paranoid: false }); // Include soft-deleted records
    
    if (!category) throw new NotFoundError('Category not found');

    if (!category.deletedAt) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Category is not deleted',
      });
    }

    // Restore the category
    await category.restore();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'Category restored successfully'
    });
  } catch (error) {
    console.error('Category Restore error:', error.message);
    next(error);
  }
};


module.exports = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  restoreCategory
};