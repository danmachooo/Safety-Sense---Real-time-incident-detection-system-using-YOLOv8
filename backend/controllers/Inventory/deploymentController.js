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
  Batch,
  Category,
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
          notes, // Fixed: was using condition_notes
          deployment_type,
          deployment_location,
          deployment_date: finalDeploymentDate,
          status: "DEPLOYED",
        },
        { transaction: t }
      );

      // Link serialized items - REMOVED redundant deployed_to and condition_notes
      const serialDeployments = serial_item_ids.map((id) => ({
        deployment_id: deployment.id,
        serialized_item_id: id,
        deployed_at: finalDeploymentDate,
        notes, // Only store notes in SerialItemDeployment, not redundantly
      }));

      await SerialItemDeployment.bulkCreate(serialDeployments, {
        transaction: t,
      });

      // Update serialized item statuses - REMOVED redundant fields
      await SerializedItem.update(
        {
          status: "DEPLOYED",
          // REMOVED: deployed_date, deployed_to, condition_notes (now tracked in SerialItemDeployment)
        },
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
          notes, // Fixed: was using condition_notes
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

const updateDeploymentStatus = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { status, actual_return_date, notes, return_condition, serials } =
      req.body;

    // 1️⃣ Find deployment with item details
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
    let skippedItems = []; // ✅ Declare at function level
    let itemsToProcess = []; // ✅ Also declare this at function level

    // 2️⃣ Check if this deployment has serialized items
    const hasSerializedItems = await SerialItemDeployment.count({
      where: { deployment_id: deployment.id },
      transaction: t,
    });

    if (hasSerializedItems > 0) {
      // Determine which items are being returned
      let itemsToReturn = [];
      let conditionsMap = new Map(); // Map serial_id to return_condition

      if (Array.isArray(serials) && serials.length > 0) {
        // Extract serial IDs and their conditions from the serials array
        const serialIds = serials.map((serial) => serial.id);

        // Validate serial_ids exist in SerialItemDeployment and get current status
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

        // Check if any provided serial_ids are invalid
        if (validSerialIds.length !== serialIds.length) {
          const invalidIds = serialIds.filter(
            (id) => !validSerialIds.includes(id)
          );
          throw new BadRequestError(
            `Invalid serial IDs provided: ${invalidIds.join(", ")}`
          );
        }

        // Filter out items that are already returned in good condition
        // ✅ Reset these arrays since they're now declared at function level
        itemsToProcess = [];
        skippedItems = [];

        serials.forEach((serial) => {
          const existingItem = validSerialItems.find(
            (item) => item.serialized_item_id === serial.id
          );
          const newCondition = serial.return_condition || "GOOD";

          // Skip if item is already returned in good condition and new condition is also good
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

        // Log skipped items for debugging
        if (skippedItems.length > 0) {
          console.log(
            "Skipped items already returned in good condition:",
            skippedItems
          );
        }
      } else {
        // No serials provided, fetch all unreturned items only
        const unreturnedItems = await SerialItemDeployment.findAll({
          where: { deployment_id: deployment.id, returned_at: null },
          attributes: ["serialized_item_id"],
          transaction: t,
        });

        itemsToReturn = unreturnedItems.map((i) => i.serialized_item_id);

        // Apply single condition to all items if provided
        const defaultCondition = return_condition || "GOOD";
        itemsToReturn.forEach((itemId) => {
          conditionsMap.set(itemId, defaultCondition);
        });
      }

      if (itemsToReturn.length === 0) {
        // Check if all items were skipped because they're already returned in good condition
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

      // Separate items by condition using the conditions map
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

      // Handle stock increment/decrement logic
      // First, get current conditions of items being updated
      const currentSerialItems = await SerialItemDeployment.findAll({
        where: {
          deployment_id: deployment.id,
          serialized_item_id: itemsToReturn,
        },
        attributes: ["serialized_item_id", "return_condition"],
        transaction: t,
      });

      // Calculate stock adjustment based on condition changes
      currentSerialItems.forEach((currentItem) => {
        const oldCondition = currentItem.return_condition;
        const newCondition =
          conditionsMap.get(currentItem.serialized_item_id) || "GOOD";

        // If changing from DAMAGED/LOST to GOOD, increment stock
        if (
          (oldCondition === "DAMAGED" || oldCondition === "LOST") &&
          newCondition === "GOOD"
        ) {
          stockAdjustment += 1;
        }
        // If changing from GOOD to DAMAGED/LOST, decrement stock
        else if (
          oldCondition === "GOOD" &&
          (newCondition === "DAMAGED" || newCondition === "LOST")
        ) {
          stockAdjustment -= 1;
        }
        // If item was never returned before and now returned as GOOD
        else if (!oldCondition && newCondition === "GOOD") {
          stockAdjustment += 1;
        }
      });

      returnedGoodCount = goodItems.length;

      // Update SerialItemDeployment history for each item with its specific condition
      for (const itemId of itemsToReturn) {
        const condition = conditionsMap.get(itemId) || "GOOD";

        await SerialItemDeployment.update(
          {
            returned_at: updateDate,
            return_condition: condition,
            notes: notes || null,
          },
          {
            where: {
              deployment_id: deployment.id,
              serialized_item_id: itemId,
            },
            transaction: t,
          }
        );
      }

      // Update SerializedItem statuses based on condition
      if (goodItems.length > 0) {
        await SerializedItem.update(
          {
            status: "AVAILABLE",
            ...(notes && {
              condition_notes: sequelize.fn(
                "CONCAT",
                sequelize.fn("COALESCE", sequelize.col("condition_notes"), ""),
                notes.trim() ? `\n${notes}` : ""
              ),
            }),
          },
          { where: { id: goodItems }, transaction: t }
        );
      }

      // Update damaged items
      if (damagedItems.length > 0) {
        await SerializedItem.update(
          {
            status: "DAMAGED",
            ...(notes && {
              condition_notes: sequelize.fn(
                "CONCAT",
                sequelize.fn("COALESCE", sequelize.col("condition_notes"), ""),
                notes.trim() ? `\n${notes}` : ""
              ),
            }),
          },
          { where: { id: damagedItems }, transaction: t }
        );
      }

      // Update lost items
      if (lostItems.length > 0) {
        await SerializedItem.update(
          {
            status: "LOST",
            ...(notes && {
              condition_notes: sequelize.fn(
                "CONCAT",
                sequelize.fn("COALESCE", sequelize.col("condition_notes"), ""),
                notes.trim() ? `\n${notes}` : ""
              ),
            }),
          },
          { where: { id: lostItems }, transaction: t }
        );
      }
    } else {
      // Non-serialized: Only increment stock if not damaged/lost
      if (return_condition !== "DAMAGED" && return_condition !== "LOST") {
        returnedGoodCount = deployment.quantity_deployed;
      } else if (return_condition === "DAMAGED") {
        damagedItems.push(1); // Just to track that we have damaged items
      } else if (return_condition === "LOST") {
        lostItems.push(1); // Just to track that we have lost items
      }
    }

    // 3️⃣ Apply stock adjustment
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
      // Non-serialized items - only increment if good condition
      await deployment.item.increment("quantity_in_stock", {
        by: returnedGoodCount,
        transaction: t,
      });
    }

    // 4️⃣ Determine new deployment status
    let newStatus = oldStatus;
    if (hasSerializedItems > 0) {
      // Get all serial items for this deployment to determine overall status
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
        // Some items are still not returned
        newStatus = "PARTIAL_RETURN";
      } else {
        // All items have been returned - determine status based on conditions
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
          // All items are lost
          newStatus = "LOST";
        } else if (damagedConditions.length === totalSerials) {
          // All items are damaged
          newStatus = "DAMAGED";
        } else if (goodConditions.length === totalSerials) {
          // All items are in good condition
          newStatus = "RETURNED";
        } else {
          // Mixed conditions (some good, some damaged, some lost)
          newStatus = "PARTIAL_RETURN";
        }
      }
    } else {
      // Non-serialized
      if (return_condition === "DAMAGED") {
        newStatus = "DAMAGED";
      } else if (return_condition === "LOST") {
        newStatus = "LOST";
      } else {
        newStatus = "RETURNED";
      }
    }

    // 5️⃣ Update deployment record
    await deployment.update(
      {
        status: newStatus,
        actual_return_date:
          newStatus !== "DEPLOYED" ? actual_return_date || new Date() : null,
        notes: notes
          ? `${deployment.notes || ""}${
              notes.trim() && deployment.notes ? "\n" : ""
            }${notes || ""}`
          : deployment.notes,
      },
      { transaction: t }
    );

    // 6️⃣ Create notification
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

    // Clear cache
    try {
      await invalidateItemsCache();
    } catch (cacheErr) {
      console.error("Cache invalidation failed:", cacheErr);
    }

    // Fetch updated deployment
    const updatedDeployment = await Deployment.findByPk(deployment.id, {
      attributes: [
        "id",
        "status",
        "deployment_type",
        "deployment_location",
        "quantity_deployed",
        "actual_return_date",
        "notes",
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
          attributes: ["id", "returned_at", "return_condition", "notes"],
          include: [
            {
              model: SerializedItem,
              as: "item",
              attributes: ["id", "serial_number", "status", "condition_notes"],
            },
          ],
        },
      ],
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
                    "expiry_date",
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
const getUserLiabilityReport = async (req, res, next) => {
  try {
    // Query to get all serialized items with their deployment history
    const liabilityReport = await SerializedItem.findAll({
      include: [
        {
          model: InventoryItem,
          as: "item",
          attributes: ["name", "description", "category_id"],
        },
        {
          model: SerialItemDeployment,
          as: "deploymentHistory",
          include: [
            {
              model: Deployment,
              as: "deployment",
              include: [
                {
                  model: User,
                  as: "recipient", // User who received the item
                  attributes: ["id", "firstname", "lastname", "email"],
                },
                {
                  model: User,
                  as: "deployer", // User who deployed the item
                  attributes: ["id", "firstname", "lastname", "email"],
                },
              ],
              attributes: [
                "deployment_type",
                "deployment_location",
                "deployment_date",
                "status",
              ],
            },
          ],
          attributes: [
            "deployed_at",
            "returned_at",
            "return_condition",
            "notes",
          ],
          order: [["deployed_at", "DESC"]], // Most recent deployments first
        },
      ],
      attributes: ["id", "serial_number", "status", "condition_notes"],
      order: [["serial_number", "ASC"]],
    });

    // Process the data to create a more readable liability report
    const processedReport = liabilityReport.map((item) => {
      const deploymentHistory = item.deploymentHistory.map((deployment) => {
        const recipient = deployment.deployment?.recipient;
        const deployer = deployment.deployment?.deployer;

        // Determine liability status based on return condition
        let liabilityStatus = "NO_LIABILITY";
        let liabilityReason = "";

        if (deployment.return_condition) {
          switch (deployment.return_condition) {
            case "DAMAGED":
              liabilityStatus = "LIABLE_FOR_DAMAGE";
              liabilityReason = "Item returned in damaged condition";
              break;
            case "LOST":
              liabilityStatus = "LIABLE_FOR_LOSS";
              liabilityReason = "Item was lost during deployment";
              break;
            case "FAIR":
              liabilityStatus = "MINOR_LIABILITY";
              liabilityReason = "Item returned in fair condition (normal wear)";
              break;
            case "GOOD":
              liabilityStatus = "NO_LIABILITY";
              liabilityReason = "Item returned in good condition";
              break;
          }
        } else if (!deployment.returned_at) {
          liabilityStatus = "CURRENTLY_DEPLOYED";
          liabilityReason = "Item is still deployed";
        }

        return {
          deploymentId: deployment.deployment?.id,
          borrower: recipient
            ? {
                id: recipient.id,
                name: `${recipient.firstname} ${recipient.lastname}`,
                email: recipient.email,
              }
            : null,
          deployer: deployer
            ? {
                id: deployer.id,
                name: `${deployer.firstname} ${deployer.lastname}`,
                email: deployer.email,
              }
            : null,
          deployedAt: deployment.deployed_at,
          returnedAt: deployment.returned_at,
          returnCondition: deployment.return_condition,
          deploymentType: deployment.deployment?.deployment_type,
          deploymentLocation: deployment.deployment?.deployment_location,
          deploymentStatus: deployment.deployment?.status,
          liabilityStatus,
          liabilityReason,
          notes: deployment.notes,
          daysDeployed: deployment.returned_at
            ? Math.ceil(
                (new Date(deployment.returned_at) -
                  new Date(deployment.deployed_at)) /
                  (1000 * 60 * 60 * 24)
              )
            : Math.ceil(
                (new Date() - new Date(deployment.deployed_at)) /
                  (1000 * 60 * 60 * 24)
              ),
        };
      });

      return {
        serialNumber: item.serial_number,
        itemId: item.id,
        itemName: item.item?.name || "Unknown Item",
        itemDescription: item.item?.description,
        currentStatus: item.status,
        conditionNotes: item.condition_notes,
        totalDeployments: deploymentHistory.length,
        deploymentHistory,
        // Summary of liability issues
        liabilitySummary: {
          totalDamaged: deploymentHistory.filter(
            (d) => d.returnCondition === "DAMAGED"
          ).length,
          totalLost: deploymentHistory.filter(
            (d) => d.returnCondition === "LOST"
          ).length,
          currentlyDeployed: deploymentHistory.filter((d) => !d.returnedAt)
            .length,
          usersWithLiability: [
            ...new Set(
              deploymentHistory
                .filter((d) => d.liabilityStatus.includes("LIABLE"))
                .map((d) => d.borrower?.id)
                .filter(Boolean)
            ),
          ],
        },
      };
    });

    // Generate summary statistics
    const summary = {
      totalItems: processedReport.length,
      totalDeployments: processedReport.reduce(
        (sum, item) => sum + item.totalDeployments,
        0
      ),
      itemsWithLiabilityIssues: processedReport.filter(
        (item) =>
          item.liabilitySummary.totalDamaged > 0 ||
          item.liabilitySummary.totalLost > 0
      ).length,
      currentlyDeployedItems: processedReport.filter(
        (item) => item.liabilitySummary.currentlyDeployed > 0
      ).length,
      totalDamagedReturns: processedReport.reduce(
        (sum, item) => sum + item.liabilitySummary.totalDamaged,
        0
      ),
      totalLostItems: processedReport.reduce(
        (sum, item) => sum + item.liabilitySummary.totalLost,
        0
      ),
    };

    // Get user liability summary
    const userLiabilityMap = new Map();

    processedReport.forEach((item) => {
      item.deploymentHistory.forEach((deployment) => {
        if (
          deployment.borrower &&
          deployment.liabilityStatus.includes("LIABLE")
        ) {
          const userId = deployment.borrower.id;
          if (!userLiabilityMap.has(userId)) {
            userLiabilityMap.set(userId, {
              user: deployment.borrower,
              liabilityCount: 0,
              damagedItems: [],
              lostItems: [],
              totalDaysWithItems: 0,
            });
          }

          const userLiability = userLiabilityMap.get(userId);
          userLiability.liabilityCount++;
          userLiability.totalDaysWithItems += deployment.daysDeployed;

          if (deployment.returnCondition === "DAMAGED") {
            userLiability.damagedItems.push({
              serialNumber: item.serialNumber,
              itemName: item.itemName,
              deploymentDate: deployment.deployedAt,
              returnDate: deployment.returnedAt,
            });
          } else if (deployment.returnCondition === "LOST") {
            userLiability.lostItems.push({
              serialNumber: item.serialNumber,
              itemName: item.itemName,
              deploymentDate: deployment.deployedAt,
            });
          }
        }
      });
    });

    const userLiabilityReport = Array.from(userLiabilityMap.values()).sort(
      (a, b) => b.liabilityCount - a.liabilityCount
    );

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "User liability report generated successfully",
      data: {
        summary,
        items: processedReport,
        userLiabilityReport,
        generatedAt: new Date().toISOString(),
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
  getUserLiabilityReport,
};
