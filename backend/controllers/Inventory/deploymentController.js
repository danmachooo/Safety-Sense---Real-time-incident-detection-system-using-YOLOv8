import Op from "sequelize";
import models from "../../models/index.js";
import { StatusCodes } from "http-status-codes";
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
} from "../../utils/Error.js";
import sequelize from "../../config/database.js";
import { invalidateItemsCache } from "./utils/cacheUtil.js";
const {
  Deployment,
  InventoryItem,
  User,
  InventoryNotification,
  SerializedItem,
  SerialItemDeployment,
} = models;

const createDeployment = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const {
      incident_type,
      inventory_item_id,
      quantity,
      serial_item_ids, // IDs of serialized items
      deployed_to, // user or department ID (from body)
      expected_return_date,
      actual_return_date,
      notes,
      deployment_type,
      deployment_location,
      deployment_date,
    } = req.body;

    // Current logged-in user
    const deployed_by = req.user?.id;
    if (!deployed_by) {
      throw new UnauthorizedError("You must be logged in to deploy items");
    }

    // Validate required fields
    if (!deployment_type || !deployment_location) {
      throw new BadRequestError("Deployment type and location are required");
    }
    if (!inventory_item_id) {
      throw new BadRequestError("Inventory item ID is required");
    }
    if (!deployed_to) {
      throw new BadRequestError("Deploy-to ID is required");
    }

    const finalDeploymentDate = deployment_date
      ? new Date(deployment_date)
      : new Date();
    if (isNaN(finalDeploymentDate.getTime())) {
      throw new BadRequestError("Invalid deployment date");
    }

    // Lock the inventory item
    const inventoryItem = await InventoryItem.findByPk(inventory_item_id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!inventoryItem) throw new NotFoundError("Inventory item not found");

    // SERIALIZED deployment
    if (serial_item_ids?.length > 0) {
      if (!Array.isArray(serial_item_ids)) {
        throw new BadRequestError("serial_item_ids must be an array of IDs");
      }

      const serializedItems = await SerializedItem.findAll({
        where: {
          id: serial_item_ids,
          status: "AVAILABLE",
          inventory_item_id,
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (serializedItems.length !== serial_item_ids.length) {
        throw new BadRequestError(
          "Some serial items are not available or don't belong to this inventory item"
        );
      }

      // Decrement stock
      await inventoryItem.decrement("quantity_in_stock", {
        by: serial_item_ids.length,
        transaction: t,
      });

      // Create parent deployment
      const deployment = await Deployment.create(
        {
          deployed_by,
          deployed_to,
          incident_type,
          inventory_item_id,
          quantity_deployed: serial_item_ids.length,
          expected_return_date,
          actual_return_date,
          notes,
          deployment_type,
          deployment_location,
          deployment_date: finalDeploymentDate,
          status: "DEPLOYED",
        },
        { transaction: t }
      );

      // Link serialized items
      const serialDeployments = serial_item_ids.map((id) => ({
        deployment_id: deployment.id,
        serialized_item_id: id,
        deployed_at: finalDeploymentDate,
      }));

      await SerialItemDeployment.bulkCreate(serialDeployments, {
        transaction: t,
      });

      // Update serialized item statuses
      await SerializedItem.update(
        { status: "DEPLOYED" },
        { where: { id: serial_item_ids }, transaction: t }
      );
    } else {
      // NON-SERIALIZED deployment
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new BadRequestError("Quantity must be a positive integer");
      }
      if (inventoryItem.quantity_in_stock < quantity) {
        throw new BadRequestError("Not enough stock available");
      }

      await inventoryItem.decrement("quantity_in_stock", {
        by: quantity,
        transaction: t,
      });

      await Deployment.create(
        {
          deployed_by,
          deployed_to,
          incident_type,
          inventory_item_id,
          quantity_deployed: quantity,
          expected_return_date,
          actual_return_date,
          notes,
          deployment_type,
          deployment_location,
          deployment_date: finalDeploymentDate,
          status: "DEPLOYED",
        },
        { transaction: t }
      );
    }

    await t.commit();

    // Invalidate cache
    try {
      await invalidateItemsCache();
    } catch (cacheErr) {
      console.error("Cache invalidation failed:", cacheErr);
    }

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: serial_item_ids?.length
        ? "Serialized items deployed successfully"
        : "Non-serialized items deployed successfully",
    });
  } catch (error) {
    await t.rollback();
    console.error("Create deployment error:", error);
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
        { deployment_location: { [Op.like]: `%${search}%` } },
        { deployed_to: { [Op.like]: `%${search}%` } },
        { "$inventoryItem.name$": { [Op.like]: `%${search}%` } },
        { "$deployer.firstname$": { [Op.like]: `%${search}%` } },
        { "$deployer.lastname$": { [Op.like]: `%${search}%` } },
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
        {
          model: User,
          as: "receiver",
          attributes: ["id", "firstname", "lastname"],
          required: false, // Left join in case deployed_to is null
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
        {
          model: User,
          as: "receiver",
          attributes: ["id", "firstname", "lastname"],
          required: false, // Left join in case deployed_to is null
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
    const { status, actual_return_date, notes, return_condition, serial_ids } =
      req.body;

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
      notes: notes ? `${deployment.notes || ""}\n${notes}` : deployment.notes,
    });

    // If returned, update quantity in stock
    if (status === "RETURNED" && oldStatus === "DEPLOYED") {
      let returnedCount = deployment.quantity_deployed; // Default for non-serialized

      if (Array.isArray(serial_ids) && serial_ids.length > 0) {
        // For serialized: Update history
        const updateDate = actual_return_date || new Date();
        await SerialItemDeployment.update(
          {
            returned_at: updateDate,
            return_condition: return_condition || "GOOD",
            notes,
          },
          {
            where: {
              deployment_id: deployment.id,
              serialized_item_id: serial_ids,
              returned_at: null,
            },
          }
        );

        // NEW: Update SerializedItem current status
        await SerializedItem.update(
          {
            status:
              return_condition === "DAMAGED"
                ? "DAMAGED"
                : return_condition === "LOST"
                ? "RETIRED"
                : "AVAILABLE",
            return_date: updateDate,
            deployed_to: null, // Clear deployment location
            condition_notes: notes
              ? `${condition_notes || ""}\n${notes}`
              : condition_notes,
          },
          {
            where: { id: serial_ids }, // Assumes serial_ids are SerializedItem IDs
          }
        );

        // Adjust stock increment for partial returns
        returnedCount = serial_ids.length; // Or query how many were actually updated
      }

      // Increment stock by the appropriate amount
      await deployment.inventoryItem.increment("quantity_in_stock", {
        by: returnedCount,
      });

      // NEW: Check if all serial items are returned; if not, revert deployment status to partial state
      // (Optional: Skip if you don't support partial returns)
      const pendingSerials = await SerialItemDeployment.count({
        where: {
          deployment_id: deployment.id,
          returned_at: null,
        },
      });
      if (pendingSerials > 0) {
        await deployment.update({ status: "PARTIAL_RETURN" }); // Or keep as "DEPLOYED"; add "PARTIAL_RETURN" to your ENUM if needed
      }

      // Create notification (unchanged)
      await InventoryNotification.create({
        notification_type: "EQUIPMENT_ISSUE",
        inventory_item_id: deployment.inventory_item_id,
        user_id: req.user.id,
        title: "Equipment Returned",
        message: `${deployment.inventoryItem.name} returned from ${deployment.deployment_location}`,
        priority: "LOW",
      });
    }

    await invalidateItemsCache();

    return res.status(StatusCodes.OK).json({
      success: true,
      data: deployment,
      message: "Deployment status updated successfully",
    });
  } catch (error) {
    console.error("Deployment status update error:", error.message);
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
          {
            model: User,
            as: "deployedToUser",
            attributes: ["id", "firstname", "lastname"],
            required: false, // Left join in case deployed_to is null
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
