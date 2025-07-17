import { Op } from "sequelize";
import { BadRequestError } from "../utils/Error.js";
import { StatusCodes } from "http-status-codes";
import sequelize from "../config/database.js";
import { validateReportParams } from "../utils/reports/reportHelper.js";
import models from "../models/index.js";

const { User, Incident, InventoryItem, Batch, Deployment, Category } = models;

/**
 * Generate Inventory Summary Report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const generateInventorySummaryReport = async (req, res, next) => {
  try {
    // Add validation
    const validation = validateReportParams(req.query);
    if (!validation.isValid) {
      throw new BadRequestError(validation.errors.join(", "));
    }

    const { categoryId } = req.query;

    // Build where clause for category filter
    const whereClause = {
      is_active: true,
      deletedAt: null,
    };

    if (categoryId) {
      whereClause.category_id = categoryId;
    }

    // Get total items count
    const totalItems = await InventoryItem.count({ where: whereClause });

    // Get items by category
    const itemsByCategory = await sequelize.query(
      `
      SELECT 
        c.id,
        c.name as categoryName,
        COUNT(i.id) as itemCount,
        SUM(i.quantity_in_stock) as totalQuantity,
        SUM(CASE WHEN i.quantity_in_stock <= i.min_stock_level THEN 1 ELSE 0 END) as lowStockCount
      FROM inventory_items i
      JOIN categories c ON i.category_id = c.id
      WHERE i.deletedAt IS NULL 
      AND i.is_active = true
      ${categoryId ? "AND c.id = :categoryId" : ""}
      GROUP BY c.id, c.name
      ORDER BY c.name
    `,
      {
        replacements: { categoryId },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Get stock level distribution
    const stockLevels = await sequelize.query(
      `
      SELECT 
        CASE 
          WHEN quantity_in_stock = 0 THEN 'Out of Stock'
          WHEN quantity_in_stock <= min_stock_level THEN 'Low Stock'
          WHEN quantity_in_stock <= (min_stock_level * 2) THEN 'Medium Stock'
          ELSE 'High Stock'
        END as stockLevel,
        COUNT(*) as count
      FROM inventory_items
      WHERE deletedAt IS NULL AND is_active = true
      ${categoryId ? "AND category_id = :categoryId" : ""}
      GROUP BY stockLevel
    `,
      {
        replacements: { categoryId },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Get reorder alerts (items below minimum stock)
    const reorderAlerts = await InventoryItem.findAll({
      where: {
        ...whereClause,
        quantity_in_stock: {
          [Op.lte]: sequelize.col("min_stock_level"),
        },
      },
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["id", "name"],
        },
      ],
      attributes: [
        "id",
        "name",
        "quantity_in_stock",
        "min_stock_level",
        "location",
      ],
      order: [["quantity_in_stock", "ASC"]],
    });

    // Get items by condition
    const itemsByCondition = await InventoryItem.findAll({
      attributes: [
        "condition",
        [sequelize.fn("COUNT", sequelize.col("condition")), "count"],
      ],
      where: whereClause,
      group: ["condition"],
    });

    const reportData = {
      reportType: "Inventory Summary Report",
      generatedAt: new Date(),
      filters: { categoryId },
      summary: {
        totalItems,
        totalCategories: itemsByCategory.length,
        totalLowStockItems: reorderAlerts.length,
      },
      itemsByCategory,
      stockLevels,
      reorderAlerts,
      itemsByCondition,
    };

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Inventory summary report generated successfully",
      data: reportData,
    });
  } catch (error) {
    console.error("An error occurred: " + error);
    next(error);
  }
};

/**
 * Generate Item Deployment Report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const generateItemDeploymentReport = async (req, res, next) => {
  try {
    // Add validation
    const validation = validateReportParams(req.query);
    if (!validation.isValid) {
      throw new BadRequestError(validation.errors.join(", "));
    }

    const {
      startDate,
      endDate,
      location,
      deploymentType,
      status,
      limit = 100,
    } = req.query;

    // Build where clause
    const whereClause = { deletedAt: null };

    if (startDate && endDate) {
      whereClause.deployment_date = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }

    if (location) {
      whereClause.deployment_location = { [Op.like]: `%${location}%` };
    }

    if (deploymentType) {
      whereClause.deployment_type = deploymentType;
    }

    if (status) {
      whereClause.status = status;
    }

    // Get deployments with details
    const deployments = await Deployment.findAll({
      where: whereClause,
      include: [
        {
          model: InventoryItem,
          as: "inventoryItem",
          attributes: ["id", "name", "location"],
          include: [
            {
              model: Category,
              as: "category",
              attributes: ["name"],
            },
          ],
        },
        {
          model: User,
          as: "deployer",
          attributes: ["id", "firstname", "lastname"],
        },
      ],
      order: [["deployment_date", "DESC"]],
      limit: Number.parseInt(limit),
    });

    // Get deployment summary statistics
    const deploymentStats = await sequelize.query(
      `
      SELECT 
        deployment_type,
        status,
        COUNT(*) as count,
        SUM(quantity_deployed) as totalQuantity
      FROM deployments
      WHERE deletedAt IS NULL
      ${
        startDate && endDate
          ? "AND deployment_date BETWEEN :startDate AND :endDate"
          : ""
      }
      ${location ? "AND deployment_location LIKE :location" : ""}
      GROUP BY deployment_type, status
    `,
      {
        replacements: {
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          location: location ? `%${location}%` : null,
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Get top deployment locations
    const topLocations = await sequelize.query(
      `
      SELECT 
        deployment_location,
        COUNT(*) as deploymentCount,
        SUM(quantity_deployed) as totalQuantity
      FROM deployments
      WHERE deletedAt IS NULL
      ${
        startDate && endDate
          ? "AND deployment_date BETWEEN :startDate AND :endDate"
          : ""
      }
      GROUP BY deployment_location
      ORDER BY deploymentCount DESC
      LIMIT 10
    `,
      {
        replacements: {
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const reportData = {
      reportType: "Item Deployment Report",
      generatedAt: new Date(),
      filters: { startDate, endDate, location, deploymentType, status },
      summary: {
        totalDeployments: deployments.length,
        totalQuantityDeployed: deployments.reduce(
          (sum, d) => sum + (d.quantity_deployed || 0),
          0
        ),
      },
      deployments,
      deploymentStats,
      topLocations,
    };

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Item deployment report generated successfully",
      data: reportData,
    });
  } catch (error) {
    console.error("An error occurred: " + error);
    next(error);
  }
};

/**
 * Generate Batch Additions Report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const generateBatchAdditionsReport = async (req, res, next) => {
  try {
    // Add validation
    const validation = validateReportParams(req.query);
    if (!validation.isValid) {
      throw new BadRequestError(validation.errors.join(", "));
    }

    const {
      startDate,
      endDate,
      supplierId,
      categoryId,
      limit = 100,
    } = req.query;

    // Build where clause
    const whereClause = {
      deletedAt: null,
      is_active: true,
    };

    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }

    if (supplierId) {
      whereClause.supplier_id = supplierId;
    }

    // Get batches with details
    const batches = await Batch.findAll({
      where: whereClause,
      include: [
        {
          model: InventoryItem,
          as: "inventoryItem",
          attributes: ["id", "name", "location"],
          where: categoryId ? { category_id: categoryId } : {},
          required: categoryId ? true : false,
          include: [
            {
              model: Category,
              as: "category",
              attributes: ["name"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: Number.parseInt(limit),
    });

    // Get batch statistics
    const batchStats = await sequelize.query(
      `
      SELECT 
        DATE(b.createdAt) as addedDate,
        COUNT(*) as batchCount,
        SUM(b.quantity) as totalQuantity,
        SUM(b.cost * b.quantity) as totalValue
      FROM batches b
      JOIN inventory_items i ON b.inventory_item_id = i.id
      WHERE b.deletedAt IS NULL 
      AND b.is_active = true
      ${
        startDate && endDate
          ? "AND b.createdAt BETWEEN :startDate AND :endDate"
          : ""
      }
      ${categoryId ? "AND i.category_id = :categoryId" : ""}
      GROUP BY DATE(b.createdAt)
      ORDER BY addedDate DESC
    `,
      {
        replacements: {
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          categoryId,
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Get expiring batches (next 30 days)
    const expiringBatches = await Batch.findAll({
      where: {
        ...whereClause,
        expiry_date: {
          [Op.between]: [
            new Date(),
            new Date(new Date().setDate(new Date().getDate() + 30)),
          ],
        },
      },
      include: [
        {
          model: InventoryItem,
          as: "inventoryItem",
          attributes: ["id", "name"],
          include: [
            {
              model: Category,
              as: "category",
              attributes: ["name"],
            },
          ],
        },
      ],
      order: [["expiry_date", "ASC"]],
    });

    const reportData = {
      reportType: "Batch Additions Report",
      generatedAt: new Date(),
      filters: { startDate, endDate, supplierId, categoryId },
      summary: {
        totalBatches: batches.length,
        totalValue: batches.reduce((sum, b) => sum + b.cost * b.quantity, 0),
        expiringBatchesCount: expiringBatches.length,
      },
      batches,
      batchStats,
      expiringBatches,
    };

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Batch additions report generated successfully",
      data: reportData,
    });
  } catch (error) {
    console.error("An error occurred: " + error);
    next(error);
  }
};

/**
 * Generate Stock Movement Report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const generateStockMovementReport = async (req, res, next) => {
  try {
    // Add validation
    const validation = validateReportParams(req.query);
    if (!validation.isValid) {
      throw new BadRequestError(validation.errors.join(", "));
    }

    const { startDate, endDate, itemId, movementType, limit = 100 } = req.query;

    // Get deployments (outflow)
    const deploymentMovements = await sequelize.query(
      `
      SELECT 
        d.id,
        'DEPLOYED' as movementType,
        d.quantity_deployed as quantity,
        d.deployment_date as movementDate,
        i.name as itemName,
        i.quantity_in_stock as currentStock,
        d.deployment_location as location,
        CONCAT(u.firstname, ' ', u.lastname) as responsiblePerson
      FROM deployments d
      JOIN inventory_items i ON d.inventory_item_id = i.id
      JOIN users u ON d.deployed_by = u.id
      WHERE d.deletedAt IS NULL
      ${
        startDate && endDate
          ? "AND d.deployment_date BETWEEN :startDate AND :endDate"
          : ""
      }
      ${itemId ? "AND d.inventory_item_id = :itemId" : ""}
      ORDER BY d.deployment_date DESC
      LIMIT :limit
    `,
      {
        replacements: {
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          itemId,
          limit: Number.parseInt(limit) / 2,
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Get batch additions (inflow)
    const batchMovements = await sequelize.query(
      `
      SELECT 
        b.id,
        'REPLENISHED' as movementType,
        b.quantity,
        b.createdAt as movementDate,
        i.name as itemName,
        i.quantity_in_stock as currentStock,
        i.location,
        'System' as responsiblePerson
      FROM batches b
      JOIN inventory_items i ON b.inventory_item_id = i.id
      WHERE b.deletedAt IS NULL 
      AND b.is_active = true
      ${
        startDate && endDate
          ? "AND b.createdAt BETWEEN :startDate AND :endDate"
          : ""
      }
      ${itemId ? "AND b.inventory_item_id = :itemId" : ""}
      ORDER BY b.createdAt DESC
      LIMIT :limit
    `,
      {
        replacements: {
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          itemId,
          limit: Number.parseInt(limit) / 2,
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Combine and sort movements
    const allMovements = [...deploymentMovements, ...batchMovements].sort(
      (a, b) => new Date(b.movementDate) - new Date(a.movementDate)
    );

    // Get movement summary
    const movementSummary = await sequelize.query(
      `
      SELECT 
        'DEPLOYED' as type,
        COUNT(*) as count,
        SUM(quantity_deployed) as totalQuantity
      FROM deployments
      WHERE deletedAt IS NULL
      ${
        startDate && endDate
          ? "AND deployment_date BETWEEN :startDate AND :endDate"
          : ""
      }
      ${itemId ? "AND inventory_item_id = :itemId" : ""}
      
      UNION ALL
      
      SELECT 
        'REPLENISHED' as type,
        COUNT(*) as count,
        SUM(quantity) as totalQuantity
      FROM batches
      WHERE deletedAt IS NULL AND is_active = true
      ${
        startDate && endDate
          ? "AND createdAt BETWEEN :startDate AND :endDate"
          : ""
      }
      ${itemId ? "AND inventory_item_id = :itemId" : ""}
    `,
      {
        replacements: {
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          itemId,
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const reportData = {
      reportType: "Stock Movement Report",
      generatedAt: new Date(),
      filters: { startDate, endDate, itemId, movementType },
      summary: {
        totalMovements: allMovements.length,
        movementSummary,
      },
      movements: allMovements,
    };

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Stock movement report generated successfully",
      data: reportData,
    });
  } catch (error) {
    console.error("An error occurred: " + error);
    next(error);
  }
};

/**
 * Generate Incident Summary Report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const generateIncidentSummaryReport = async (req, res, next) => {
  try {
    // Add validation
    const validation = validateReportParams(req.query);
    if (!validation.isValid) {
      throw new BadRequestError(validation.errors.join(", "));
    }

    const {
      period = "monthly", // daily, weekly, monthly
      startDate,
      endDate,
      incidentType,
      status,
    } = req.query;

    // Calculate date range based on period
    let dateRange = {};
    const now = new Date();
    if (startDate && endDate) {
      dateRange = {
        createdAt: {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        },
      };
    } else {
      switch (period) {
        case "daily":
          dateRange = {
            createdAt: {
              [Op.gte]: new Date(now.setDate(now.getDate() - 1)),
            },
          };
          break;
        case "weekly":
          dateRange = {
            createdAt: {
              [Op.gte]: new Date(now.setDate(now.getDate() - 7)),
            },
          };
          break;
        case "monthly":
        default:
          dateRange = {
            createdAt: {
              [Op.gte]: new Date(now.setMonth(now.getMonth() - 1)),
            },
          };
          break;
      }
    }

    // Build where clause
    const whereClause = {
      ...dateRange,
      deletedAt: null,
    };

    if (incidentType) {
      whereClause.type = incidentType;
    }

    if (status) {
      whereClause.status = status;
    }

    // Get total incidents
    const totalIncidents = await Incident.count({ where: whereClause });

    // Get incidents by type
    const incidentsByType = await Incident.findAll({
      attributes: [
        "type",
        [sequelize.fn("COUNT", sequelize.col("type")), "count"],
      ],
      where: whereClause,
      group: ["type"],
    });

    // Get incidents by status
    const incidentsByStatus = await Incident.findAll({
      attributes: [
        "status",
        [sequelize.fn("COUNT", sequelize.col("status")), "count"],
      ],
      where: whereClause,
      group: ["status"],
    });

    // Get response time statistics
    const responseTimeStats = await sequelize.query(
      `
      SELECT 
        AVG(TIMESTAMPDIFF(MINUTE, i.createdAt, ia.acceptedAt)) as avgResponseMinutes,
        MIN(TIMESTAMPDIFF(MINUTE, i.createdAt, ia.acceptedAt)) as minResponseMinutes,
        MAX(TIMESTAMPDIFF(MINUTE, i.createdAt, ia.acceptedAt)) as maxResponseMinutes
      FROM Incidents i
      JOIN IncidentAcceptance ia ON i.id = ia.incidentId
      WHERE i.deletedAt IS NULL
      ${
        Object.keys(dateRange).length > 0 ? "AND i.createdAt >= :startDate" : ""
      }
      ${incidentType ? "AND i.type = :incidentType" : ""}
    `,
      {
        replacements: {
          startDate:
            dateRange.createdAt?.[Op.gte] ||
            dateRange.createdAt?.[Op.between]?.[0],
          incidentType,
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Get incidents by time period
    const timeFormat = period === "daily" ? "%H:00" : "%Y-%m-%d";
    const incidentsByTime = await sequelize.query(
      `
      SELECT 
        DATE_FORMAT(createdAt, '${timeFormat}') as timePeriod,
        COUNT(*) as count
      FROM Incidents
      WHERE deletedAt IS NULL
      ${Object.keys(dateRange).length > 0 ? "AND createdAt >= :startDate" : ""}
      ${incidentType ? "AND type = :incidentType" : ""}
      ${status ? "AND status = :status" : ""}
      GROUP BY timePeriod
      ORDER BY timePeriod
    `,
      {
        replacements: {
          startDate:
            dateRange.createdAt?.[Op.gte] ||
            dateRange.createdAt?.[Op.between]?.[0],
          incidentType,
          status,
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const reportData = {
      reportType: `${
        period.charAt(0).toUpperCase() + period.slice(1)
      } Incident Summary Report`,
      generatedAt: new Date(),
      period,
      filters: { startDate, endDate, incidentType, status },
      summary: {
        totalIncidents,
        avgResponseTime: responseTimeStats[0]?.avgResponseMinutes || 0,
        minResponseTime: responseTimeStats[0]?.minResponseMinutes || 0,
        maxResponseTime: responseTimeStats[0]?.maxResponseMinutes || 0,
      },
      incidentsByType,
      incidentsByStatus,
      incidentsByTime,
    };

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Incident summary report generated successfully",
      data: reportData,
    });
  } catch (error) {
    console.error("An error occurred: " + error);
    next(error);
  }
};

/**
 * Generate Top Locations by Incidents Report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const generateTopLocationsByIncidentsReport = async (req, res, next) => {
  try {
    // Add validation
    const validation = validateReportParams(req.query);
    if (!validation.isValid) {
      throw new BadRequestError(validation.errors.join(", "));
    }

    const { startDate, endDate, incidentType, limit = 10 } = req.query;

    // Build where clause
    const whereClause = { deletedAt: null };
    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }

    if (incidentType) {
      whereClause.type = incidentType;
    }

    // Get top locations by incident count
    const topLocationsByCount = await sequelize.query(
      `
      SELECT 
        COALESCE(c.location, 'User Reported') as location,
        COUNT(*) as incidentCount,
        GROUP_CONCAT(DISTINCT i.type) as incidentTypes
      FROM Incidents i
      LEFT JOIN cameras c ON i.cameraId = c.id
      WHERE i.deletedAt IS NULL
      ${
        startDate && endDate
          ? "AND i.createdAt BETWEEN :startDate AND :endDate"
          : ""
      }
      ${incidentType ? "AND i.type = :incidentType" : ""}
      GROUP BY COALESCE(c.location, 'User Reported')
      ORDER BY incidentCount DESC
      LIMIT :limit
    `,
      {
        replacements: {
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          incidentType,
          limit: Number.parseInt(limit),
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Get incident breakdown by type for each top location
    const locationBreakdown = await sequelize.query(
      `
      SELECT 
        COALESCE(c.location, 'User Reported') as location,
        i.type,
        COUNT(*) as count,
        i.status
      FROM Incidents i
      LEFT JOIN cameras c ON i.cameraId = c.id
      WHERE i.deletedAt IS NULL
      ${
        startDate && endDate
          ? "AND i.createdAt BETWEEN :startDate AND :endDate"
          : ""
      }
      ${incidentType ? "AND i.type = :incidentType" : ""}
      GROUP BY COALESCE(c.location, 'User Reported'), i.type, i.status
      ORDER BY location, count DESC
    `,
      {
        replacements: {
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          incidentType,
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Get geographic coordinates for mapping (if available)
    const locationCoordinates = await sequelize.query(
      `
      SELECT DISTINCT
        COALESCE(c.location, 'User Reported') as location,
        AVG(COALESCE(c.latitude, i.latitude)) as latitude,
        AVG(COALESCE(c.longitude, i.longitude)) as longitude,
        COUNT(*) as incidentCount
      FROM Incidents i
      LEFT JOIN cameras c ON i.cameraId = c.id
      WHERE i.deletedAt IS NULL
      ${
        startDate && endDate
          ? "AND i.createdAt BETWEEN :startDate AND :endDate"
          : ""
      }
      ${incidentType ? "AND i.type = :incidentType" : ""}
      AND (c.latitude IS NOT NULL OR i.latitude IS NOT NULL)
      GROUP BY COALESCE(c.location, 'User Reported')
      HAVING latitude IS NOT NULL AND longitude IS NOT NULL
    `,
      {
        replacements: {
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          incidentType,
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const reportData = {
      reportType: "Top Locations by Incidents Report",
      generatedAt: new Date(),
      filters: { startDate, endDate, incidentType, limit },
      summary: {
        totalLocations: topLocationsByCount.length,
        totalIncidents: topLocationsByCount.reduce(
          (sum, loc) => sum + Number.parseInt(loc.incidentCount),
          0
        ),
      },
      topLocationsByCount,
      locationBreakdown,
      locationCoordinates,
    };

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Top locations by incidents report generated successfully",
      data: reportData,
    });
  } catch (error) {
    console.error("An error occurred: " + error);
    next(error);
  }
};

/**
 * Generate Resolved vs Unresolved Incidents Report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const generateResolvedVsUnresolvedReport = async (req, res, next) => {
  try {
    // Add validation
    const validation = validateReportParams(req.query);
    if (!validation.isValid) {
      throw new BadRequestError(validation.errors.join(", "));
    }

    const { startDate, endDate, incidentType } = req.query;

    // Build where clause
    const whereClause = { deletedAt: null };
    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }

    if (incidentType) {
      whereClause.type = incidentType;
    }

    // Get total incidents
    const totalIncidents = await Incident.count({ where: whereClause });

    // Get resolved incidents
    const resolvedIncidents = await Incident.count({
      where: {
        ...whereClause,
        status: "resolved",
      },
    });

    // Get unresolved incidents with reasons
    const unresolvedIncidents = await sequelize.query(
      `
      SELECT 
        status,
        COUNT(*) as count,
        CASE 
          WHEN status = 'pending' THEN 'Awaiting Response'
          WHEN status = 'accepted' THEN 'In Progress'
          WHEN status = 'ongoing' THEN 'Active Response'
          WHEN status = 'dismissed' THEN 'Dismissed/False Alarm'
          ELSE 'Other'
        END as reason
      FROM Incidents
      WHERE deletedAt IS NULL
      AND status != 'resolved'
      ${
        startDate && endDate
          ? "AND createdAt BETWEEN :startDate AND :endDate"
          : ""
      }
      ${incidentType ? "AND type = :incidentType" : ""}
      GROUP BY status
    `,
      {
        replacements: {
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          incidentType,
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Calculate resolution rate
    const resolutionRate =
      totalIncidents > 0 ? (resolvedIncidents / totalIncidents) * 100 : 0;

    // Get average resolution time
    const resolutionTimeStats = await sequelize.query(
      `
      SELECT 
        AVG(TIMESTAMPDIFF(HOUR, createdAt, updatedAt)) as avgResolutionHours,
        MIN(TIMESTAMPDIFF(HOUR, createdAt, updatedAt)) as minResolutionHours,
        MAX(TIMESTAMPDIFF(HOUR, createdAt, updatedAt)) as maxResolutionHours
      FROM Incidents
      WHERE status = 'resolved'
      AND deletedAt IS NULL
      ${
        startDate && endDate
          ? "AND createdAt BETWEEN :startDate AND :endDate"
          : ""
      }
      ${incidentType ? "AND type = :incidentType" : ""}
    `,
      {
        replacements: {
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          incidentType,
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Get resolution trends over time
    const resolutionTrends = await sequelize.query(
      `
      SELECT 
        DATE(createdAt) as date,
        COUNT(*) as totalIncidents,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolvedIncidents,
        ROUND((SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as resolutionRate
      FROM Incidents
      WHERE deletedAt IS NULL
      ${
        startDate && endDate
          ? "AND createdAt BETWEEN :startDate AND :endDate"
          : ""
      }
      ${incidentType ? "AND type = :incidentType" : ""}
      GROUP BY DATE(createdAt)
      ORDER BY date DESC
      LIMIT 30
    `,
      {
        replacements: {
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          incidentType,
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const reportData = {
      reportType: "Resolved vs Unresolved Incidents Report",
      generatedAt: new Date(),
      filters: { startDate, endDate, incidentType },
      summary: {
        totalIncidents,
        resolvedIncidents,
        unresolvedIncidents: totalIncidents - resolvedIncidents,
        resolutionRate: Number.parseFloat(resolutionRate.toFixed(2)),
        avgResolutionTime: resolutionTimeStats[0]?.avgResolutionHours || 0,
      },
      unresolvedBreakdown: unresolvedIncidents,
      resolutionTimeStats: resolutionTimeStats[0],
      resolutionTrends,
    };

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Resolved vs unresolved incidents report generated successfully",
      data: reportData,
    });
  } catch (error) {
    console.error("An error occurred: " + error);
    next(error);
  }
};

/**
 * Generate Responder Performance Report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const generateResponderPerformanceReport = async (req, res, next) => {
  try {
    // Add validation
    const validation = validateReportParams(req.query);
    if (!validation.isValid) {
      throw new BadRequestError(validation.errors.join(", "));
    }

    const { startDate, endDate, userId, limit = 20 } = req.query;

    // Build date filter
    let dateFilter = "";
    if (startDate && endDate) {
      dateFilter = "AND ia.acceptedAt BETWEEN :startDate AND :endDate";
    }

    // Get responder performance statistics
    const responderStats = await sequelize.query(
      `
      SELECT 
        u.id,
        CONCAT(u.firstname, ' ', u.lastname) as responderName,
        u.role,
        COUNT(ia.incidentId) as incidentsAccepted,
        COUNT(CASE WHEN i.status = 'resolved' THEN 1 END) as incidentsResolved,
        AVG(TIMESTAMPDIFF(MINUTE, i.createdAt, ia.acceptedAt)) as avgResponseTimeMinutes,
        MIN(TIMESTAMPDIFF(MINUTE, i.createdAt, ia.acceptedAt)) as minResponseTimeMinutes,
        MAX(TIMESTAMPDIFF(MINUTE, i.createdAt, ia.acceptedAt)) as maxResponseTimeMinutes,
        ROUND((COUNT(CASE WHEN i.status = 'resolved' THEN 1 END) / COUNT(ia.incidentId)) * 100, 2) as resolutionRate
      FROM IncidentAcceptance ia
      JOIN users u ON ia.userId = u.id
      JOIN Incidents i ON ia.incidentId = i.id
      WHERE u.deletedAt IS NULL
      AND i.deletedAt IS NULL
      ${userId ? "AND u.id = :userId" : ""}
      ${dateFilter}
      GROUP BY u.id, u.firstname, u.lastname, u.role
      ORDER BY incidentsAccepted DESC
      LIMIT :limit
    `,
      {
        replacements: {
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          userId,
          limit: Number.parseInt(limit),
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Get incident types handled by each responder
    const responderIncidentTypes = await sequelize.query(
      `
      SELECT 
        u.id as userId,
        CONCAT(u.firstname, ' ', u.lastname) as responderName,
        i.type as incidentType,
        COUNT(*) as count
      FROM IncidentAcceptance ia
      JOIN users u ON ia.userId = u.id
      JOIN Incidents i ON ia.incidentId = i.id
      WHERE u.deletedAt IS NULL
      AND i.deletedAt IS NULL
      ${userId ? "AND u.id = :userId" : ""}
      ${dateFilter}
      GROUP BY u.id, u.firstname, u.lastname, i.type
      ORDER BY u.id, count DESC
    `,
      {
        replacements: {
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          userId,
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Get team performance (if teams are defined by role)
    const teamPerformance = await sequelize.query(
      `
      SELECT 
        u.role as team,
        COUNT(DISTINCT u.id) as teamSize,
        COUNT(ia.incidentId) as totalIncidentsHandled,
        AVG(TIMESTAMPDIFF(MINUTE, i.createdAt, ia.acceptedAt)) as avgTeamResponseTime,
        ROUND((COUNT(CASE WHEN i.status = 'resolved' THEN 1 END) / COUNT(ia.incidentId)) * 100, 2) as teamResolutionRate
      FROM IncidentAcceptance ia
      JOIN users u ON ia.userId = u.id
      JOIN Incidents i ON ia.incidentId = i.id
      WHERE u.deletedAt IS NULL
      AND i.deletedAt IS NULL
      ${dateFilter}
      GROUP BY u.role
      ORDER BY totalIncidentsHandled DESC
    `,
      {
        replacements: {
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Get top performers
    const topPerformers = responderStats
      .sort((a, b) => {
        // Sort by resolution rate first, then by incidents resolved
        if (b.resolutionRate !== a.resolutionRate) {
          return b.resolutionRate - a.resolutionRate;
        }
        return b.incidentsResolved - a.incidentsResolved;
      })
      .slice(0, 5);

    const reportData = {
      reportType: "Responder Performance Report",
      generatedAt: new Date(),
      filters: { startDate, endDate, userId, limit },
      summary: {
        totalResponders: responderStats.length,
        totalIncidentsHandled: responderStats.reduce(
          (sum, r) => sum + Number.parseInt(r.incidentsAccepted),
          0
        ),
        avgResolutionRate:
          responderStats.reduce(
            (sum, r) => sum + Number.parseFloat(r.resolutionRate),
            0
          ) / responderStats.length || 0,
      },
      responderStats,
      responderIncidentTypes,
      teamPerformance,
      topPerformers,
    };

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Responder performance report generated successfully",
      data: reportData,
    });
  } catch (error) {
    console.error("An error occurred: " + error);
    next(error);
  }
};

/**
 * Generate Combined Report (Multiple report types in one)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const generateCombinedReport = async (req, res, next) => {
  try {
    const {
      reportTypes, // comma-separated list of report types
      startDate,
      endDate,
    } = req.query;

    if (!reportTypes) {
      throw new BadRequestError("Report types are required");
    }

    const requestedReports = reportTypes.split(",").map((type) => type.trim());
    const combinedData = {
      reportType: "Combined Report",
      generatedAt: new Date(),
      filters: { startDate, endDate },
      reports: {},
    };

    // Generate each requested report
    for (const reportType of requestedReports) {
      try {
        switch (reportType) {
          case "inventory_summary":
            const inventoryReq = { query: { startDate, endDate } };
            const inventoryRes = {
              status: () => ({
                json: (data) => {
                  combinedData.reports.inventory_summary = data.data;
                  return inventoryRes;
                },
              }),
            };
            await generateInventorySummaryReport(
              inventoryReq,
              inventoryRes,
              () => {}
            );
            break;
          case "incident_summary":
            const incidentReq = {
              query: { startDate, endDate, period: "monthly" },
            };
            const incidentRes = {
              status: () => ({
                json: (data) => {
                  combinedData.reports.incident_summary = data.data;
                  return incidentRes;
                },
              }),
            };
            await generateIncidentSummaryReport(
              incidentReq,
              incidentRes,
              () => {}
            );
            break;
          case "item_deployment":
            const deploymentReq = {
              query: { startDate, endDate, limit: 100 },
            };
            const deploymentRes = {
              status: () => ({
                json: (data) => {
                  combinedData.reports.item_deployment = data.data;
                  return deploymentRes;
                },
              }),
            };
            await generateItemDeploymentReport(
              deploymentReq,
              deploymentRes,
              () => {}
            );
            break;
          case "batch_additions":
            const batchReq = {
              query: { startDate, endDate, limit: 100 },
            };
            const batchRes = {
              status: () => ({
                json: (data) => {
                  combinedData.reports.batch_additions = data.data;
                  return batchRes;
                },
              }),
            };
            await generateBatchAdditionsReport(batchReq, batchRes, () => {});
            break;
          case "stock_movement":
            const stockReq = {
              query: { startDate, endDate, limit: 100 },
            };
            const stockRes = {
              status: () => ({
                json: (data) => {
                  combinedData.reports.stock_movement = data.data;
                  return stockRes;
                },
              }),
            };
            await generateStockMovementReport(stockReq, stockRes, () => {});
            break;
          case "top_locations":
            const locationsReq = {
              query: { startDate, endDate, limit: 10 },
            };
            const locationsRes = {
              status: () => ({
                json: (data) => {
                  combinedData.reports.top_locations = data.data;
                  return locationsRes;
                },
              }),
            };
            await generateTopLocationsByIncidentsReport(
              locationsReq,
              locationsRes,
              () => {}
            );
            break;
          case "resolved_unresolved":
            const resolvedReq = {
              query: { startDate, endDate },
            };
            const resolvedRes = {
              status: () => ({
                json: (data) => {
                  combinedData.reports.resolved_unresolved = data.data;
                  return resolvedRes;
                },
              }),
            };
            await generateResolvedVsUnresolvedReport(
              resolvedReq,
              resolvedRes,
              () => {}
            );
            break;
          case "responder_performance":
            const responderReq = {
              query: { startDate, endDate, limit: 20 },
            };
            const responderRes = {
              status: () => ({
                json: (data) => {
                  combinedData.reports.responder_performance = data.data;
                  return responderRes;
                },
              }),
            };
            await generateResponderPerformanceReport(
              responderReq,
              responderRes,
              () => {}
            );
            break;
          default:
            console.warn(`Unknown report type: ${reportType}`);
            combinedData.reports[reportType] = {
              error: `Unknown report type: ${reportType}. Available types: inventory_summary, incident_summary, item_deployment, batch_additions, stock_movement, top_locations, resolved_unresolved, responder_performance`,
            };
        }
      } catch (error) {
        console.error(`Error generating ${reportType}:`, error);
        combinedData.reports[reportType] = { error: error.message };
      }
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Combined report generated successfully",
      data: combinedData,
    });
  } catch (error) {
    console.error("An error occurred: " + error);
    next(error);
  }
};

export {
  generateInventorySummaryReport,
  generateItemDeploymentReport,
  generateBatchAdditionsReport,
  generateStockMovementReport,
  generateIncidentSummaryReport,
  generateTopLocationsByIncidentsReport,
  generateResolvedVsUnresolvedReport,
  generateResponderPerformanceReport,
  generateCombinedReport,
};
