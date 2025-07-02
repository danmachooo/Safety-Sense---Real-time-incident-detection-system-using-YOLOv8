import Op from "sequelize";
import models from "../../models/index.js";
import { StatusCodes } from "http-status-codes";
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
} from "../../utils/Error.js";
import { invalidateItemsCache } from "./utils/cacheUtil.js";
const { Deployment, InventoryItem, User, InventoryNotification } = models;
const createDeployment = async (req, res, next) => {
  try {
    const {
      inventory_item_id,
      deployment_type,
      quantity_deployed,
      deployment_location,
      deployment_date,
      expected_return_date,
      incident_type,
      notes,
    } = req.body;

    // Assuming user ID is available in req.user.id from auth middleware
    const deployed_by = req.user.id;

    if (
      !inventory_item_id ||
      !deployment_type ||
      !quantity_deployed ||
      !deployment_location
    ) {
      throw new BadRequestError("Required fields are missing");
    }

    // Check if item exists and has sufficient quantity
    const item = await InventoryItem.findByPk(inventory_item_id);
    if (!item) throw new NotFoundError("Item not found");

    if (!item.is_deployable)
      throw new BadRequestError("Item is not deployable");

    if (item.quantity_in_stock < quantity_deployed)
      throw new BadRequestError("Insufficient Stock");

    const deployment = await Deployment.create({
      inventory_item_id,
      deployed_by,
      deployment_type,
      quantity_deployed,
      deployment_location,
      deployment_date: deployment_date || new Date(),
      expected_return_date,
      status: "DEPLOYED",
      incident_type,
      notes,
    });

    // Update inventory quantity
    await item.update({
      quantity_in_stock: item.quantity_in_stock - quantity_deployed,
    });

    // Create notification for deployment
    await InventoryNotification.create({
      notification_type: "EQUIPMENT_ISSUE",
      inventory_item_id,
      user_id: deployed_by,
      title: "Equipment Deployed",
      message: `${item.name} (${quantity_deployed} ${item.unit_of_measure}) deployed to ${deployment_location}`,
      priority: "MEDIUM",
    });
    await invalidateItemsCache();

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Deployment Created",
      data: deployment,
    });
  } catch (error) {
    console.error("Create deployment error: ", error.message);
    next(error);
  }
};

const getAllDeployments = async (req, res, next) => {
  try {
    const {
      status,
      type,
      start_date,
      end_date,
      search,
      page = 1,
      limit = 10,
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    if (status) whereClause.status = status;
    if (type) whereClause.deployment_type = type;

    if (start_date && end_date) {
      whereClause.deployment_date = {
        [Op.between]: [new Date(start_date), new Date(end_date)],
      };
    }

    if (search) {
      whereClause[Op.or] = [
        { id: { [Op.like]: `%${search}%` } },
        { status: { [Op.like]: `%${search}%` } },
        { "$inventoryItem.name$": { [Op.like]: `%${search}%` } },
        { "$deployer.firstname$": { [Op.like]: `%${search}%` } },
        { "$deployer.lastname$": { [Op.like]: `%${search}%` } },
        ,
      ];
    }

    const { count, rows: deployments } = await Deployment.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: InventoryItem,
          as: "inventoryItem",
          attributes: ["id", "name", "unit_of_measure"],
        },
        {
          model: User,
          as: "deployer",
          attributes: ["id", "firstname", "lastname"],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["deployment_date", "DESC"]],
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Fetching deployments",
      data: deployments,
      meta: {
        total: count,
        pages: Math.ceil(count / limit),
        currentPage: parseInt(page),
      },
    });
  } catch (error) {
    console.error("Fetch deployments error: ", error.message);
    next(error);
  }
};

const getDeploymentById = async (req, res, next) => {
  try {
    const deployment = await Deployment.findByPk(req.params.id, {
      include: [
        {
          model: InventoryItem,
          as: "inventoryItem",
          attributes: ["id", "name", "unit_of_measure"],
        },
        {
          model: User,
          as: "deployer",
          attributes: ["id", "firstname", "lastname"],
        },
      ],
    });

    if (!deployment) throw new NotFoundError("Deployment not found");

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Fetching a deployment",
      data: deployment,
    });
  } catch (error) {
    console.error("Fetch deployment error: ", error.message);
    next(error);
  }
};

const updateDeploymentStatus = async (req, res, next) => {
  try {
    const { status, actual_return_date, notes } = req.body;
    const deployment = await Deployment.findByPk(req.params.id, {
      include: [{ model: InventoryItem, as: "inventoryItem" }],
    });

    if (!deployment) throw new NotFoundError("Deployment not found");

    if (deployment.status === "RETURNED")
      throw new BadRequestError("Deployment already marked as RETURNED");

    const oldStatus = deployment.status;
    await deployment.update({
      status,
      actual_return_date:
        status === "RETURNED" ? actual_return_date || new Date() : null,
      notes: notes ? `${deployment.notes}\n${notes}` : deployment.notes,
    });

    // If item is returned, update inventory quantity
    if (status === "RETURNED" && oldStatus === "DEPLOYED") {
      await deployment.inventoryItem.increment("quantity_in_stock", {
        by: deployment.quantity_deployed,
      });

      // Create notification for return
      await Notification.create({
        notification_type: "EQUIPMENT_ISSUE",
        inventory_item_id: deployment.inventory_item_id,
        user_id: req.user.id,
        title: "Equipment Returned",
        message: `${deployment.inventoryItem.name} returned from ${deployment.deployment_location}`,
        priority: "LOW",
      });
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      data: deployment,
      message: "Deployment status updated successfully",
    });
  } catch (error) {
    console.error("Deployment status updated error: ", error.message);
    next(error);
  }
};

const getOverdueDeployments = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: overdueDeployments } =
      await Deployment.findAndCountAll({
        where: {
          status: "DEPLOYED",
          expected_return_date: {
            [Op.lt]: new Date(),
          },
        },
        include: [
          {
            model: InventoryItem,
            as: "inventoryItem",
            attributes: ["id", "name", "unit_of_measure"],
          },
          {
            model: User,
            as: "deployer",
            attributes: ["id", "firstname", "lastname"],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["expected_return_date", "ASC"]],
      });

    return res.status(StatusCodes.OK).json({
      success: true,
      data: overdueDeployments,
      message: "Fetching overdue deployments",
      meta: {
        total: count,
        pages: Math.ceil(count / limit),
        currentPage: parseInt(page),
      },
    });
  } catch (error) {
    console.error("Fetch overdue deployment error: ", error.message);
    next(error);
  }
};

export {
  createDeployment,
  getAllDeployments,
  getDeploymentById,
  updateDeploymentStatus,
  getOverdueDeployments,
};
