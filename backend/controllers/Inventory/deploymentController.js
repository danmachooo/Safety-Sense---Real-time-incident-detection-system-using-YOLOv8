import models from "../../models/index.js";
import { StatusCodes } from "http-status-codes";
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
} from "../../utils/Error.js";
import sequelize from "../../config/database.js";
import { Op } from "sequelize";
import { invalidateItemsCache } from "./utils/cacheUtil.js";
const {
  Deployment,
  InventoryItem,
  User,
  InventoryNotification,
  SerializedItem,
  SerialItemDeployment,
  SerializedItemHistory,
  Batch,
  Category,
  DeploymentNotes,
} = models;

export const getHistory = async (req, res, next) => {
  const history = await SerializedItemHistory.findAll({
    where: { serialized_item_id: req.params.id },
    include: [
      { model: User, as: "user", attributes: ["id", "firstname", "lastname"] },
      {
        model: Deployment,
        as: "deployment",
        attributes: ["id", "deployment_location"],
      },
    ],
    order: [["createdAt", "ASC"]],
  });

  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Deployment History Fetched",
    history,
  });
};

// Updated createDeployment function
const createDeployment = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const {
      incident_type,
      inventory_item_id,
      quantity_deployed,
      serialized_item_ids,
      deployed_to,
      expected_return_date,
      notes, // This will now go to DeploymentNotes table
      deployment_type,
      deployment_location,
      deployment_date,
    } = req.body;

    console.log("Deployment date: ", deployment_date);
    console.log("Deployment date: ", deployment_date);

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

    const inventoryItem = await InventoryItem.findByPk(inventory_item_id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!inventoryItem) throw new NotFoundError("Inventory item not found");

    let deployment; // Declare deployment variable to use in both branches

    // SERIALIZED deployment
    if (serialized_item_ids?.length > 0) {
      if (!Array.isArray(serialized_item_ids)) {
        throw new BadRequestError("serial_item_ids must be an array of IDs");
      }

      const serializedItems = await SerializedItem.findAll({
        where: {
          id: { [Op.in]: serialized_item_ids },
          status: "AVAILABLE",
          inventory_item_id,
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (serializedItems.length !== serialized_item_ids.length) {
        throw new BadRequestError(
          "Some serial items are not available or don't belong to this inventory item"
        );
      }

      await inventoryItem.decrement("quantity_in_stock", {
        by: serialized_item_ids.length,
        transaction: t,
      });

      // Create parent deployment (WITHOUT notes in the deployment table)
      deployment = await Deployment.create(
        {
          deployed_by,
          deployed_to,
          incident_type,
          inventory_item_id,
          quantity_deployed: serialized_item_ids.length,
          expected_return_date,
          // notes, // Remove this - notes will go to DeploymentNotes
          deployment_type,
          deployment_location,
          deployment_date,
          status: "DEPLOYED",
        },
        { transaction: t }
      );

      // Create serial item deployment links
      const serialDeployments = serialized_item_ids.map((id) => ({
        deployment_id: deployment.id,
        serialized_item_id: id,
        deployed_at: deployment_date,
        // notes, // Remove notes from here too
      }));

      const createdSerialDeployments = await SerialItemDeployment.bulkCreate(
        serialDeployments,
        { transaction: t }
      );
      console.log(
        "Created serial deployments:",
        createdSerialDeployments.length
      );

      await SerializedItem.update(
        { status: "DEPLOYED" },
        {
          where: { id: { [Op.in]: serialized_item_ids } },
          transaction: t,
          lock: t.LOCK.UPDATE,
        }
      );

      // Update histories without notes in the old table
      const histories = serialized_item_ids.map((id) => ({
        serialized_item_id: id,
        deployed_by,
        deployed_to,
        // notes, // Remove notes from here
        deployment_id: deployment.id,
        deployed_at: deployment_date,
      }));

      await SerializedItemHistory.bulkCreate(histories, { transaction: t });
    } else {
      // NON-SERIALIZED deployment
      if (!Number.isInteger(quantity_deployed) || quantity_deployed <= 0) {
        throw new BadRequestError("Quantity must be a positive integer");
      }
      if (inventoryItem.quantity_in_stock < quantity_deployed) {
        throw new BadRequestError("Not enough stock available");
      }

      await inventoryItem.decrement("quantity_in_stock", {
        by: quantity_deployed,
        transaction: t,
      });

      deployment = await Deployment.create(
        {
          deployed_by,
          deployed_to,
          incident_type,
          inventory_item_id,
          quantity_deployed: quantity_deployed,
          expected_return_date,
          // notes, // Remove this
          deployment_type,
          deployment_location,
          deployment_date: finalDeploymentDate,
          status: "DEPLOYED",
        },
        { transaction: t }
      );
    }

    // Add initial deployment notes if provided
    if (notes && notes.trim()) {
      await DeploymentNotes.create(
        {
          deployment_id: deployment.id,
          note_text: notes.trim(),
          note_type: "USER",
          created_by: deployed_by,
        },
        { transaction: t }
      );
    }

    // Add system note for deployment creation
    await DeploymentNotes.create(
      {
        deployment_id: deployment.id,
        note_text: `Deployment created: ${
          quantity_deployed || serialized_item_ids?.length
        } ${inventoryItem.name} deployed to ${deployment_location}`,
        note_type: "SYSTEM",
        created_by: deployed_by,
      },
      { transaction: t }
    );

    await t.commit();

    try {
      await invalidateItemsCache();
    } catch (cacheErr) {
      console.error("Cache invalidation failed:", cacheErr);
    }

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: serialized_item_ids?.length
        ? "Serialized items deployed successfully"
        : "Non-serialized items deployed successfully",
      data: {
        deployment_id: deployment.id,
        quantity: quantity_deployed || serialized_item_ids?.length,
      },
    });
  } catch (error) {
    await t.rollback();
    console.error("Create deployment error:", error);
    next(error);
  }
};
const updateDeploymentStatus = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { status, actual_return_date, notes, return_condition, serials } =
      req.body;

    console.log("Actual return date: ", actual_return_date);

    const deployment = await Deployment.findByPk(req.params.id, {
      include: [{ model: InventoryItem, as: "item" }],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!deployment) throw new NotFoundError("Deployment not found");
    if (deployment.status === "RETURNED")
      throw new BadRequestError("Deployment already marked as RETURNED");

    const oldStatus = deployment.status;
    let returnedGoodCount = 0;
    let goodItems = [];
    let badItems = [];
    let damagedItems = [];
    let lostItems = [];
    let stockAdjustment = 0;
    let skippedItems = [];
    let itemsToProcess = [];
    let conditionsMap = new Map();

    const hasSerializedItems = await SerialItemDeployment.count({
      where: { deployment_id: deployment.id },
      transaction: t,
    });

    if (hasSerializedItems > 0) {
      let itemsToReturn = [];

      if (Array.isArray(serials) && serials.length > 0) {
        const serialIds = serials.map((serial) => serial.id);

        const validSerialItems = await SerialItemDeployment.findAll({
          where: {
            deployment_id: deployment.id,
            serialized_item_id: serialIds,
          },
          attributes: ["serialized_item_id", "returned_at", "return_condition"],
          transaction: t,
        });

        const validSerialIds = validSerialItems.map(
          (i) => i.serialized_item_id
        );

        if (validSerialIds.length !== serialIds.length) {
          const invalidIds = serialIds.filter(
            (id) => !validSerialIds.includes(id)
          );
          throw new BadRequestError(
            `Invalid serial IDs provided: ${invalidIds.join(", ")}`
          );
        }

        itemsToProcess = [];
        skippedItems = [];

        serials.forEach((serial) => {
          const existingItem = validSerialItems.find(
            (item) => item.serialized_item_id === serial.id
          );
          const newCondition = serial.return_condition || "GOOD";

          if (
            existingItem &&
            existingItem.returned_at &&
            (existingItem.return_condition === "GOOD" ||
              !existingItem.return_condition) &&
            newCondition === "GOOD"
          ) {
            skippedItems.push({
              id: serial.id,
              reason: "Already returned in good condition",
            });
          } else {
            itemsToProcess.push(serial);
            conditionsMap.set(serial.id, newCondition);
          }
        });

        itemsToReturn = itemsToProcess.map((serial) => serial.id);

        if (skippedItems.length > 0) {
          console.log(
            "Skipped items already returned in good condition:",
            skippedItems
          );
        }
      } else {
        const unreturnedItems = await SerialItemDeployment.findAll({
          where: { deployment_id: deployment.id, returned_at: null },
          attributes: ["serialized_item_id"],
          transaction: t,
        });

        itemsToReturn = unreturnedItems.map((i) => i.serialized_item_id);

        const defaultCondition = return_condition || "GOOD";
        itemsToReturn.forEach((itemId) => {
          conditionsMap.set(itemId, defaultCondition);
        });
      }

      if (itemsToReturn.length === 0) {
        if (skippedItems && skippedItems.length > 0) {
          return res.status(StatusCodes.OK).json({
            success: true,
            message:
              "No items needed to be updated. All specified items are already returned in good condition.",
            data: {
              skippedItems: skippedItems,
              deployment: await Deployment.findByPk(deployment.id, {
                attributes: [
                  "id",
                  "status",
                  "deployment_type",
                  "deployment_location",
                ],
                include: [
                  {
                    model: InventoryItem,
                    as: "item",
                    attributes: ["id", "name", "description"],
                  },
                ],
              }),
            },
          });
        }
        throw new BadRequestError("No valid items to return");
      }

      const updateDate = actual_return_date || new Date();

      itemsToReturn.forEach((itemId) => {
        const condition = conditionsMap.get(itemId) || "GOOD";
        if (condition === "DAMAGED") {
          damagedItems.push(itemId);
          badItems.push(itemId);
        } else if (condition === "LOST") {
          lostItems.push(itemId);
          badItems.push(itemId);
        } else {
          goodItems.push(itemId);
        }
      });

      // Stock adjustment calculation
      const currentSerialItems = await SerialItemDeployment.findAll({
        where: {
          deployment_id: deployment.id,
          serialized_item_id: itemsToReturn,
        },
        attributes: ["serialized_item_id", "return_condition"],
        transaction: t,
      });

      currentSerialItems.forEach((currentItem) => {
        const oldCondition = currentItem.return_condition;
        const newCondition =
          conditionsMap.get(currentItem.serialized_item_id) || "GOOD";

        if (
          (oldCondition === "DAMAGED" || oldCondition === "LOST") &&
          newCondition === "GOOD"
        ) {
          stockAdjustment += 1;
        } else if (
          oldCondition === "GOOD" &&
          (newCondition === "DAMAGED" || newCondition === "LOST")
        ) {
          stockAdjustment -= 1;
        } else if (!oldCondition && newCondition === "GOOD") {
          stockAdjustment += 1;
        }
      });

      returnedGoodCount = goodItems.length;

      // Update serial items and create history
      for (const itemId of itemsToReturn) {
        const condition = conditionsMap.get(itemId) || "GOOD";

        const currentSerial = await SerialItemDeployment.findOne({
          where: {
            deployment_id: deployment.id,
            serialized_item_id: itemId,
          },
          attributes: ["return_condition"],
          transaction: t,
        });

        const oldCondition = currentSerial?.return_condition || null;
        const newCondition = condition;

        await SerialItemDeployment.update(
          {
            returned_at: updateDate,
            return_condition: condition,
            // Remove notes from here
          },
          {
            where: {
              deployment_id: deployment.id,
              serialized_item_id: itemId,
            },
            transaction: t,
          }
        );

        const serialStatus = condition === "GOOD" ? "AVAILABLE" : condition;
        await SerializedItem.update(
          {
            status: serialStatus,
            // Remove condition_notes update - this should be handled separately if needed
          },
          { where: { id: itemId }, transaction: t }
        );

        await SerializedItemHistory.create(
          {
            serialized_item_id: itemId,
            deployed_by: deployment.deployed_by,
            deployed_to: deployment.deployed_to,
            deployment_id: deployment.id,
            old_condition: oldCondition,
            new_condition: newCondition,
          },
          { transaction: t }
        );
      }
    } else {
      // Non-serialized items
      if (return_condition !== "DAMAGED" && return_condition !== "LOST") {
        returnedGoodCount = deployment.quantity_deployed;
      } else if (return_condition === "DAMAGED") {
        damagedItems.push(1);
      } else if (return_condition === "LOST") {
        lostItems.push(1);
      }
    }

    // Apply stock adjustment
    if (hasSerializedItems > 0 && stockAdjustment !== 0) {
      if (stockAdjustment > 0) {
        await deployment.item.increment("quantity_in_stock", {
          by: stockAdjustment,
          transaction: t,
        });
      } else {
        await deployment.item.decrement("quantity_in_stock", {
          by: Math.abs(stockAdjustment),
          transaction: t,
        });
      }
    } else if (!hasSerializedItems && returnedGoodCount > 0) {
      await deployment.item.increment("quantity_in_stock", {
        by: returnedGoodCount,
        transaction: t,
      });
    }

    // Determine new deployment status
    let newStatus = oldStatus;
    if (hasSerializedItems > 0) {
      const allSerialItems = await SerialItemDeployment.findAll({
        where: { deployment_id: deployment.id },
        attributes: ["serialized_item_id", "returned_at", "return_condition"],
        transaction: t,
      });

      const totalSerials = allSerialItems.length;
      const returnedSerials = allSerialItems.filter(
        (item) => item.returned_at !== null
      );
      const unreturnedSerials = allSerialItems.filter(
        (item) => item.returned_at === null
      );

      if (returnedSerials.length === 0) {
        newStatus = "DEPLOYED";
      } else if (unreturnedSerials.length > 0) {
        newStatus = "PARTIAL_RETURN";
      } else {
        const goodConditions = returnedSerials.filter(
          (item) => item.return_condition === "GOOD" || !item.return_condition
        );
        const damagedConditions = returnedSerials.filter(
          (item) => item.return_condition === "DAMAGED"
        );
        const lostConditions = returnedSerials.filter(
          (item) => item.return_condition === "LOST"
        );

        if (lostConditions.length === totalSerials) {
          newStatus = "LOST";
        } else if (damagedConditions.length === totalSerials) {
          newStatus = "DAMAGED";
        } else if (goodConditions.length === totalSerials) {
          newStatus = "RETURNED";
        } else {
          newStatus = "PARTIAL_RETURN";
        }
      }
    } else {
      if (return_condition === "DAMAGED") {
        newStatus = "DAMAGED";
      } else if (return_condition === "LOST") {
        newStatus = "LOST";
      } else {
        newStatus = "RETURNED";
      }
    }

    // Update deployment record (remove notes concatenation)
    await deployment.update(
      {
        status: newStatus,
        actual_return_date:
          newStatus !== "DEPLOYED" ? actual_return_date || new Date() : null,
        // Remove notes field update
      },
      { transaction: t }
    );

    // Add user note if provided
    if (notes && notes.trim()) {
      await DeploymentNotes.create(
        {
          deployment_id: deployment.id,
          note_text: notes.trim(),
          note_type: "USER",
          created_by: req.user.id,
        },
        { transaction: t }
      );
    }

    // Add system note for status update
    if (newStatus !== oldStatus) {
      await DeploymentNotes.create(
        {
          deployment_id: deployment.id,
          note_text: `Status changed from ${oldStatus} to ${newStatus}`,
          note_type: "SYSTEM",
          created_by: req.user.id,
        },
        { transaction: t }
      );
    }

    // Add system note for serial updates if applicable
    if (hasSerializedItems > 0 && itemsToProcess.length > 0) {
      const serialDetails = itemsToProcess.map((serial) => ({
        id: serial.id,
        condition: conditionsMap.get(serial.id) || "GOOD",
      }));

      await DeploymentNotes.create(
        {
          deployment_id: deployment.id,
          note_text: `Updated ${
            itemsToProcess.length
          } serial(s): ${serialDetails
            .map((s) => `${s.id} (${s.condition})`)
            .join(", ")}`,
          note_type: "SYSTEM",
          created_by: req.user.id,
        },
        { transaction: t }
      );
    }

    // Create notification
    let notifMessage;
    if (returnedGoodCount > 0 && badItems.length === 0) {
      notifMessage = `${deployment.item.name} (${returnedGoodCount} units) returned in good condition from ${deployment.deployment_location}`;
    } else if (returnedGoodCount > 0 && badItems.length > 0) {
      notifMessage = `${deployment.item.name}: ${returnedGoodCount} units good, ${damagedItems.length} damaged, ${lostItems.length} lost from ${deployment.deployment_location}`;
    } else if (damagedItems.length > 0 && lostItems.length > 0) {
      notifMessage = `${deployment.item.name}: ${damagedItems.length} damaged, ${lostItems.length} lost from ${deployment.deployment_location}`;
    } else if (damagedItems.length > 0) {
      notifMessage = `${deployment.item.name} marked as damaged from ${deployment.deployment_location}`;
    } else if (lostItems.length > 0) {
      notifMessage = `${deployment.item.name} marked as lost from ${deployment.deployment_location}`;
    }

    await InventoryNotification.create(
      {
        notification_type: "EQUIPMENT_RETURN",
        inventory_item_id: deployment.inventory_item_id,
        user_id: req.user.id,
        title: "Equipment Return Update",
        message: notifMessage,
      },
      { transaction: t }
    );

    await t.commit();

    try {
      await invalidateItemsCache();
    } catch (cacheErr) {
      console.error("Cache invalidation failed:", cacheErr);
    }

    // Fetch updated deployment with notes
    const updatedDeployment = await Deployment.findByPk(deployment.id, {
      attributes: [
        "id",
        "status",
        "deployment_type",
        "deployment_location",
        "quantity_deployed",
        "actual_return_date",
      ],
      include: [
        {
          model: InventoryItem,
          as: "item",
          attributes: [
            "id",
            "name",
            "description",
            "quantity_in_stock",
            "location",
          ],
        },
        {
          model: User,
          as: "deployer",
          attributes: ["id", "firstname", "lastname", "email", "role"],
        },
        {
          model: User,
          as: "recipient",
          attributes: ["id", "firstname", "lastname", "email", "role"],
        },
        {
          model: SerialItemDeployment,
          as: "itemDeployments",
          attributes: ["id", "returned_at", "return_condition"],
          include: [
            {
              model: SerializedItem,
              as: "item",
              attributes: ["id", "serial_number", "status"],
            },
          ],
        },
        // Notes (array)
        {
          model: DeploymentNotes,
          as: "notes",
          include: [
            {
              model: User,
              as: "createdBy",
              attributes: ["id", "firstname", "lastname", "email"],
            },
          ],
        },
      ],
      // ✅ correct way to order a nested include
      order: [[{ model: DeploymentNotes, as: "notes" }, "createdAt", "DESC"]],
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      data: updatedDeployment,
      message:
        itemsToProcess && itemsToProcess.length < serials?.length
          ? `Deployment updated successfully. ${
              (serials?.length || 0) - itemsToProcess.length
            } items were already returned in good condition and skipped.`
          : "Deployment status updated successfully",
      ...(skippedItems && skippedItems.length > 0 && { skippedItems }),
    });
  } catch (error) {
    await t.rollback();
    console.error("Deployment status update error:", error);
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
        { "$item.name$": { [Op.like]: `%${search}%` } }, // Fixed alias
        { "$deployer.firstname$": { [Op.like]: `%${search}%` } },
        { "$deployer.lastname$": { [Op.like]: `%${search}%` } },
        { "$recipient.firstname$": { [Op.like]: `%${search}%` } }, // Added recipient search
        { "$recipient.lastname$": { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows: deployments } = await Deployment.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: InventoryItem,
          as: "item", // Updated to match associations
          attributes: [
            "id",
            "name",
            "description",
            "unit_of_measure",
            "quantity_in_stock",
            "location",
          ],
        },
        {
          model: User,
          as: "deployer",
          attributes: ["id", "firstname", "lastname", "email", "role"],
        },
        {
          model: User,
          as: "recipient", // Updated to match associations
          attributes: ["id", "firstname", "lastname", "email", "role"],
          required: false,
        },
        {
          model: SerialItemDeployment,
          as: "itemDeployments", // Added serial item deployment tracking
          attributes: [
            "id",
            "deployed_at",
            "returned_at",
            "return_condition",
            "notes",
          ],
          required: false,
          include: [
            {
              model: SerializedItem,
              as: "item",
              attributes: ["id", "serial_number", "status", "condition_notes"],
            },
          ],
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
          as: "item", // Updated to match associations
          attributes: [
            "id",
            "name",
            "description",
            "unit_of_measure",
            "quantity_in_stock",
            "location",
            "is_returnable",
          ],
        },
        {
          model: User,
          as: "deployer",
          attributes: ["id", "firstname", "lastname", "email", "role"],
        },
        {
          model: DeploymentNotes,
          as: "notes",
          attributes: [
            "id",
            "note_text",
            "note_type",
            "createdAt",
            "updatedAt",
          ],
          include: [
            {
              model: User,
              as: "createdBy",
              attributes: ["id", "firstname", "lastname"],
            },
          ],
        },
        {
          model: User,
          as: "recipient", // Updated to match associations
          attributes: ["id", "firstname", "lastname", "email", "role"],
          required: false,
        },
        {
          model: SerialItemDeployment,
          as: "itemDeployments", // Added complete serial item deployment tracking
          attributes: [
            "id",
            "deployed_at",
            "returned_at",
            "return_condition",
            "notes",
          ],
          required: false,
          include: [
            {
              model: SerializedItem,
              as: "item",
              attributes: [
                "id",
                "serial_number",
                "status",
                "condition_notes",
                "last_maintenance_date",
                "next_maintenance_date",
              ],
              include: [
                {
                  model: Batch,
                  as: "batch",
                  attributes: [
                    "id",
                    "batch_number",
                    "supplier",
                    "received_date",
                  ],
                },
              ],
            },
          ],
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
            as: "item", // Updated to match associations
            attributes: [
              "id",
              "name",
              "description",
              "unit_of_measure",
              "location",
              "condition",
              "is_returnable",
            ],
          },
          {
            model: User,
            as: "deployer",
            attributes: ["id", "firstname", "lastname", "email", "role"],
          },
          {
            model: User,
            as: "recipient", // Updated to match associations
            attributes: ["id", "firstname", "lastname", "email", "role"],
            required: false,
          },
          {
            model: SerialItemDeployment,
            as: "itemDeployments", // Added to show which specific items are overdue
            attributes: [
              "id",
              "deployed_at",
              "returned_at",
              "return_condition",
            ],
            required: false,
            where: {
              returned_at: null, // Only active deployments
            },
            include: [
              {
                model: SerializedItem,
                as: "item",
                attributes: [
                  "id",
                  "serial_number",
                  "status",
                  "next_maintenance_date", // Important for overdue tracking
                ],
              },
            ],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["expected_return_date", "ASC"]],
      });

    // Calculate days overdue for each deployment
    const deploymentsWithOverdueDays = overdueDeployments.map((deployment) => {
      const daysOverdue = Math.ceil(
        (new Date() - new Date(deployment.expected_return_date)) /
          (1000 * 60 * 60 * 24)
      );

      return {
        ...deployment.toJSON(),
        daysOverdue,
        // Add count of overdue serialized items
        overdueSerializedItemsCount: deployment.itemDeployments?.length || 0,
      };
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      data: deploymentsWithOverdueDays,
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

export const getItemHistoryReport = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    // If no itemId provided, return all deployed/borrowed items with their borrowers
    if (!itemId) {
      return getAllDeployedItemsReport(req, res, next);
    }

    // Get item details with full history timeline
    const itemHistory = await SerializedItemHistory.findAll({
      where: { serialized_item_id: itemId },
      include: [
        {
          model: SerializedItem,
          as: "item",
          attributes: ["id", "serial_number", "status", "condition_notes"],
          include: [
            {
              model: InventoryItem,
              as: "item",
              attributes: ["id", "name", "description"],
            },
          ],
        },
        {
          model: User,
          as: "deployer",
          attributes: ["id", "firstname", "lastname", "email"],
          required: false,
        },
        {
          model: User,
          as: "receiver",
          attributes: ["id", "firstname", "lastname", "email"],
          required: false,
        },
        {
          model: Deployment,
          as: "deployment",
          attributes: ["id", "deployment_date", "expected_return_date"],
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]], // Most recent first
    });

    if (!itemHistory.length) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "No history found for this item",
      });
    }

    // Extract unique users who have borrowed this item
    const borrowers = new Set();
    const timeline = [];

    itemHistory.forEach((history) => {
      // Add users to borrowers set
      if (history.receiver) {
        borrowers.add(
          JSON.stringify({
            id: history.receiver.id,
            name: `${history.receiver.firstname} ${history.receiver.lastname}`,
            email: history.receiver.email,
          })
        );
      }

      // Build timeline entry
      timeline.push({
        id: history.id,
        serialId: history.item?.serial_number || "N/A",
        itemName: history.item?.item?.name || "N/A",
        deployedBy: history.deployer
          ? {
              id: history.deployer.id,
              name: `${history.deployer.firstname} ${history.deployer.lastname}`,
              email: history.deployer.email,
            }
          : null,
        deployedTo: history.receiver
          ? {
              id: history.receiver.id,
              name: `${history.receiver.firstname} ${history.receiver.lastname}`,
              email: history.receiver.email,
            }
          : null,
        deploymentId: history.deployment_id,
        deploymentDate: history.deployment?.deployment_date || null,
        expectedReturnDate: history.deployment?.expected_return_date || null,
        oldCondition: history.old_condition,
        newCondition: history.new_condition,
        notes: history.notes,
        createdAt: history.createdAt,
        updatedAt: history.updatedAt,
      });
    });

    // Convert borrowers set back to array of objects
    const uniqueBorrowers = Array.from(borrowers).map((borrower) =>
      JSON.parse(borrower)
    );

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Item history retrieved successfully",
      data: {
        itemInfo: {
          id: itemId,
          serialNumber: itemHistory[0]?.item?.serial_number,
          itemName: itemHistory[0]?.item?.item?.name,
          currentStatus: itemHistory[0]?.item?.status,
          conditionNotes: itemHistory[0]?.item?.condition_notes,
        },
        borrowers: uniqueBorrowers,
        timeline: timeline,
        totalHistoryEntries: itemHistory.length,
      },
    });
  } catch (error) {
    console.error("Error fetching item history:", error);
    next(error);
  }
};

const getAllDeployedItemsReport = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Build where condition based on status filter
    const whereCondition = {};
    if (
      status &&
      ["DEPLOYED", "LOST", "DAMAGED"].includes(status.toUpperCase())
    ) {
      whereCondition.status = status.toUpperCase();
    }

    // Get serialized items
    const deployedItems = await SerializedItem.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: InventoryItem,
          as: "item",
          attributes: ["id", "name", "description"],
          include: [
            {
              model: Category,
              as: "category",
              attributes: ["id", "name", "type"],
              required: false,
            },
          ],
        },
        {
          model: SerializedItemHistory,
          as: "history",
          required: true,
          include: [
            {
              model: User,
              as: "receiver",
              attributes: ["id", "firstname", "lastname", "email"],
              required: false,
            },
            {
              model: User,
              as: "deployer",
              attributes: ["id", "firstname", "lastname", "email"],
              required: false,
            },
            {
              model: Deployment,
              as: "deployment",
              attributes: ["id", "deployment_date", "expected_return_date"],
              required: false,
            },
          ],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["updatedAt", "DESC"]],
      distinct: true,
    });

    // Process the data to show borrower information over time
    const processedItems = deployedItems.rows
      // ✅ Filter out items with no history
      .filter((item) => item.history && item.history.length > 0)
      .map((item) => {
        // Sort history entries (newest first)
        const sortedHistory = [...item.history].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );

        const borrowers = new Set();
        const borrowingHistory = sortedHistory
          .map((historyEntry) => {
            if (!historyEntry.receiver) return null;

            const borrowerInfo = {
              id: historyEntry.receiver.id,
              name: `${historyEntry.receiver.firstname} ${historyEntry.receiver.lastname}`,
              email: historyEntry.receiver.email,
            };

            borrowers.add(JSON.stringify(borrowerInfo));

            return {
              borrower: borrowerInfo,
              deployer: historyEntry.deployer
                ? {
                    id: historyEntry.deployer.id,
                    name: `${historyEntry.deployer.firstname} ${historyEntry.deployer.lastname}`,
                    email: historyEntry.deployer.email,
                  }
                : null,
              deploymentDate: historyEntry.deployment?.deployment_date || null,
              expectedReturnDate:
                historyEntry.deployment?.expected_return_date || null,
              oldCondition: historyEntry.old_condition,
              newCondition: historyEntry.new_condition,
              notes: historyEntry.notes,
              createdAt: historyEntry.createdAt,
            };
          })
          .filter(Boolean);

        // ✅ Latest borrower is always the newest history entry
        const latestHistory =
          item.status === "DEPLOYED" && borrowingHistory.length > 0
            ? borrowingHistory[0]
            : null;

        const currentBorrower = latestHistory
          ? {
              ...latestHistory.borrower,
              deploymentDate: latestHistory.deploymentDate,
              expectedReturnDate: latestHistory.expectedReturnDate,
              daysBorrowed: latestHistory.deploymentDate
                ? Math.max(
                    1,
                    Math.floor(
                      (new Date() - new Date(latestHistory.deploymentDate)) /
                        (1000 * 60 * 60 * 24)
                    )
                  )
                : null,
            }
          : null;

        return {
          id: item.id,
          serialNumber: item.serial_number,
          status: item.status,
          itemName: item.item?.name || "N/A",
          itemCategory: item.item?.category?.name || null,
          itemDescription: item.item?.description || null,
          conditionNotes: item.condition_notes,
          currentBorrower,
          totalBorrowers: Array.from(borrowers).map((b) => JSON.parse(b)),
          borrowingHistory,
          lastUpdated: item.updatedAt,
        };
      });

    // Summary statistics
    const summary = {
      totalItems: deployedItems.count,
      currentlyDeployed: processedItems.filter(
        (item) => item.status === "DEPLOYED"
      ).length,
      lost: processedItems.filter((item) => item.status === "LOST").length,
      damaged: processedItems.filter((item) => item.status === "DAMAGED")
        .length,
      totalUniqueBorrowers: new Set(
        processedItems.flatMap((item) =>
          item.totalBorrowers.map((borrower) => borrower.id)
        )
      ).size,
    };

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "All deployed items report retrieved successfully",
      data: {
        summary,
        items: processedItems,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(deployedItems.count / limit),
          totalItems: deployedItems.count,
          itemsPerPage: parseInt(limit),
          hasNextPage: page * limit < deployedItems.count,
          hasPreviousPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching all deployed items report:", error);
    next(error);
  }
};

export const getUserLiabilityReport = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    if (!itemId) {
      throw new BadRequestError("Item ID is required");
    }

    const itemHistory = await SerializedItemHistory.findAll({
      where: { serialized_item_id: itemId },
      include: [
        {
          model: SerializedItem,
          as: "item",
          attributes: ["id", "serial_number", "status"],
          include: [
            {
              model: InventoryItem,
              as: "item",
              attributes: ["name"],
            },
          ],
        },
        {
          model: User,
          as: "deployer",
          attributes: ["id", "firstname", "lastname", "email"],
          required: false,
        },
        {
          model: User,
          as: "receiver",
          attributes: ["id", "firstname", "lastname", "email"],
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const borrowers = [
      ...new Set(
        itemHistory
          .filter((h) => h.receiver)
          .map((h) =>
            JSON.stringify({
              id: h.receiver.id,
              name: `${h.receiver.firstname} ${h.receiver.lastname}`,
              email: h.receiver.email,
            })
          )
      ),
    ].map((b) => JSON.parse(b));

    const timeline = itemHistory.map((history) => ({
      serialId: history.item?.serial_number || "N/A",
      deployedBy: history.deployer
        ? `${history.deployer.firstname} ${history.deployer.lastname}`
        : "N/A",
      deployedTo: history.receiver
        ? `${history.receiver.firstname} ${history.receiver.lastname}`
        : "N/A",
      oldCondition: history.old_condition,
      newCondition: history.new_condition,
      notes: history.notes,
      createdAt: history.createdAt,
      updatedAt: history.updatedAt,
    }));

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "User liability report generated successfully",
      data: {
        borrowers,
        timeline,
      },
    });
  } catch (error) {
    console.error("Error generating user liability report:", error);
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
