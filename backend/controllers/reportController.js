import { Op } from "sequelize";
import { BadRequestError } from "../utils/Error.js";
import { StatusCodes } from "http-status-codes";
import sequelize from "../config/database.js";
import { validateReportParams } from "../utils/reports/reportHelper.js";
import models from "../models/index.js";
const {
  User,
  Incident,
  InventoryItem,
  Batch,
  Deployment,
  Category,
  YOLOIncident,
  HumanIncident,
} = models;

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
          as: "item",
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
          as: "item",
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
        SUM(b.unit_price * b.quantity) as totalValue
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

    const reportData = {
      reportType: "Batch Additions Report",
      generatedAt: new Date(),
      filters: { startDate, endDate, supplierId, categoryId },
      summary: {
        totalBatches: batches.length,
        totalValue: batches.reduce(
          (sum, b) => sum + b.unit_price * b.quantity,
          0
        ),
      },
      batches,
      batchStats,
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
      reportType, // human, yolo, or both
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

    if (reportType && reportType !== "all") {
      whereClause.reportType = reportType;
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

    // Get incidents by report type (human vs yolo)
    const incidentsByReportType = await Incident.findAll({
      attributes: [
        "reportType",
        [sequelize.fn("COUNT", sequelize.col("reportType")), "count"],
      ],
      where: whereClause,
      group: ["reportType"],
    });

    // Get response time statistics (only for accepted incidents)
    const responseTimeStats = await sequelize.query(
      `
        SELECT 
          AVG(TIMESTAMPDIFF(MINUTE, i.createdAt, ia.acceptedAt)) as avgResponseMinutes,
          MIN(TIMESTAMPDIFF(MINUTE, i.createdAt, ia.acceptedAt)) as minResponseMinutes,
          MAX(TIMESTAMPDIFF(MINUTE, i.createdAt, ia.acceptedAt)) as maxResponseMinutes
        FROM Incidents i
        LEFT JOIN IncidentAcceptance ia ON i.id = ia.incidentId
        WHERE i.deletedAt IS NULL
        ${
          Object.keys(dateRange).length > 0
            ? "AND i.createdAt >= :startDate"
            : ""
        }
        ${incidentType ? "AND i.type = :incidentType" : ""}
        ${
          reportType && reportType !== "all"
            ? "AND i.reportType = :reportType"
            : ""
        }
      `,
      {
        replacements: {
          startDate:
            dateRange.createdAt?.[Op.gte] ||
            dateRange.createdAt?.[Op.between]?.[0],
          incidentType,
          reportType: reportType && reportType !== "all" ? reportType : null,
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
        ${
          Object.keys(dateRange).length > 0 ? "AND createdAt >= :startDate" : ""
        }
        ${incidentType ? "AND type = :incidentType" : ""}
        ${status ? "AND status = :status" : ""}
        ${
          reportType && reportType !== "all"
            ? "AND reportType = :reportType"
            : ""
        }
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
          reportType: reportType && reportType !== "all" ? reportType : null,
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Get AI detection statistics for YOLO incidents
    const aiDetectionStats = await YOLOIncident.findAll({
      attributes: [
        "aiType",
        [sequelize.fn("COUNT", sequelize.col("aiType")), "count"],
        [sequelize.fn("AVG", sequelize.col("confidence")), "avgConfidence"],
        [
          sequelize.fn("AVG", sequelize.col("processingTime")),
          "avgProcessingTime",
        ],
      ],
      include: [
        {
          model: Incident,
          as: "incident",
          where: whereClause,
          required: true,
        },
      ],
      group: ["aiType"],
    });

    const reportData = {
      reportType: `${
        period.charAt(0).toUpperCase() + period.slice(1)
      } Incident Summary Report`,
      generatedAt: new Date(),
      period,
      filters: { startDate, endDate, incidentType, status, reportType },
      summary: {
        totalIncidents,
        avgResponseTime: responseTimeStats[0]?.avgResponseMinutes || 0,
        minResponseTime: responseTimeStats[0]?.minResponseMinutes || 0,
        maxResponseTime: responseTimeStats[0]?.maxResponseMinutes || 0,
      },
      incidentsByType,
      incidentsByStatus,
      incidentsByReportType,
      incidentsByTime,
      aiDetectionStats,
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

    const {
      startDate,
      endDate,
      incidentType,
      reportType,
      limit = 10,
    } = req.query;

    // Socorro Municipality Barangay Database
    const getSocorroLocation = (lat, lng) => {
      const numLat = parseFloat(lat);
      const numLng = parseFloat(lng);

      // Define Socorro barangays with their approximate boundaries
      const socorroBarangays = [
        // Central/Poblacion area
        {
          name: "Zone I",
          city: "Socorro",
          province: "Oriental Mindoro",
          bounds: {
            minLat: 13.045,
            maxLat: 13.055,
            minLng: 121.33,
            maxLng: 121.34,
          },
          population: 1114,
        },
        {
          name: "Zone II",
          city: "Socorro",
          province: "Oriental Mindoro",
          bounds: {
            minLat: 13.04,
            maxLat: 13.05,
            minLng: 121.335,
            maxLng: 121.345,
          },
          population: 950,
        },
        {
          name: "Zone III",
          city: "Socorro",
          province: "Oriental Mindoro",
          bounds: {
            minLat: 13.035,
            maxLat: 13.045,
            minLng: 121.34,
            maxLng: 121.35,
          },
          population: 800,
        },
        {
          name: "Zone IV",
          city: "Socorro",
          province: "Oriental Mindoro",
          bounds: {
            minLat: 13.03,
            maxLat: 13.04,
            minLng: 121.345,
            maxLng: 121.355,
          },
          population: 1200,
        },
        // Northern barangays
        {
          name: "Subaan",
          city: "Socorro",
          province: "Oriental Mindoro",
          bounds: {
            minLat: 13.06,
            maxLat: 13.08,
            minLng: 121.32,
            maxLng: 121.35,
          },
          population: 2772,
        },
        {
          name: "Bagsok",
          city: "Socorro",
          province: "Oriental Mindoro",
          bounds: {
            minLat: 13.05,
            maxLat: 13.07,
            minLng: 121.3,
            maxLng: 121.33,
          },
          population: 1884,
        },
        {
          name: "Malugay",
          city: "Socorro",
          province: "Oriental Mindoro",
          bounds: {
            minLat: 13.07,
            maxLat: 13.09,
            minLng: 121.31,
            maxLng: 121.34,
          },
          population: 734,
        },
        // Eastern barangays
        {
          name: "Bayuin",
          city: "Socorro",
          province: "Oriental Mindoro",
          bounds: {
            minLat: 13.02,
            maxLat: 13.045,
            minLng: 121.36,
            maxLng: 121.39,
          },
          population: 1500,
        },
        {
          name: "Catiningan",
          city: "Socorro",
          province: "Oriental Mindoro",
          bounds: {
            minLat: 13.03,
            maxLat: 13.06,
            minLng: 121.37,
            maxLng: 121.4,
          },
          population: 2100,
        },
        {
          name: "Ma. Concepcion",
          city: "Socorro",
          province: "Oriental Mindoro",
          bounds: {
            minLat: 13.01,
            maxLat: 13.04,
            minLng: 121.38,
            maxLng: 121.41,
          },
          population: 1800,
        },
        // Western barangays
        {
          name: "Fortuna",
          city: "Socorro",
          province: "Oriental Mindoro",
          bounds: {
            minLat: 13.0,
            maxLat: 13.03,
            minLng: 121.28,
            maxLng: 121.31,
          },
          population: 1600,
        },
        {
          name: "Kilo-kilo",
          city: "Socorro",
          province: "Oriental Mindoro",
          bounds: {
            minLat: 13.01,
            maxLat: 13.04,
            minLng: 121.29,
            maxLng: 121.32,
          },
          population: 1300,
        },
        {
          name: "Leuteboro",
          city: "Socorro",
          province: "Oriental Mindoro",
          bounds: {
            minLat: 12.99,
            maxLat: 13.02,
            minLng: 121.3,
            maxLng: 121.33,
          },
          population: 1400,
        },
        // Southern barangays
        {
          name: "Calubcub",
          city: "Socorro",
          province: "Oriental Mindoro",
          bounds: {
            minLat: 12.96,
            maxLat: 12.99,
            minLng: 121.32,
            maxLng: 121.35,
          },
          population: 1100,
        },
        {
          name: "Cabugao",
          city: "Socorro",
          province: "Oriental Mindoro",
          bounds: {
            minLat: 12.97,
            maxLat: 13.0,
            minLng: 121.31,
            maxLng: 121.34,
          },
          population: 1250,
        },
        {
          name: "Bulaklakan",
          city: "Socorro",
          province: "Oriental Mindoro",
          bounds: {
            minLat: 12.98,
            maxLat: 13.01,
            minLng: 121.33,
            maxLng: 121.36,
          },
          population: 900,
        },
        // Agricultural/Rural areas
        {
          name: "Batuhan",
          city: "Socorro",
          province: "Oriental Mindoro",
          bounds: {
            minLat: 12.95,
            maxLat: 12.98,
            minLng: 121.34,
            maxLng: 121.37,
          },
          population: 1050,
        },
        {
          name: "Calocmahan",
          city: "Socorro",
          province: "Oriental Mindoro",
          bounds: {
            minLat: 12.99,
            maxLat: 13.02,
            minLng: 121.36,
            maxLng: 121.39,
          },
          population: 1350,
        },
        {
          name: "Catmon",
          city: "Socorro",
          province: "Oriental Mindoro",
          bounds: {
            minLat: 13.02,
            maxLat: 13.05,
            minLng: 121.27,
            maxLng: 121.3,
          },
          population: 1180,
        },
        {
          name: "Dampulan",
          city: "Socorro",
          province: "Oriental Mindoro",
          bounds: {
            minLat: 13.06,
            maxLat: 13.09,
            minLng: 121.28,
            maxLng: 121.31,
          },
          population: 850,
        },
        {
          name: "Hiwahiwan",
          city: "Socorro",
          province: "Oriental Mindoro",
          bounds: {
            minLat: 12.94,
            maxLat: 12.97,
            minLng: 121.36,
            maxLng: 121.39,
          },
          population: 1450,
        },
        {
          name: "Leuteboro II",
          city: "Socorro",
          province: "Oriental Mindoro",
          bounds: {
            minLat: 12.98,
            maxLat: 13.01,
            minLng: 121.28,
            maxLng: 121.31,
          },
          population: 920,
        },
        {
          name: "Malarayat",
          city: "Socorro",
          province: "Oriental Mindoro",
          bounds: {
            minLat: 12.96,
            maxLat: 12.99,
            minLng: 121.29,
            maxLng: 121.32,
          },
          population: 1280,
        },
        {
          name: "Matandang Sabang",
          city: "Socorro",
          province: "Oriental Mindoro",
          bounds: {
            minLat: 12.93,
            maxLat: 12.96,
            minLng: 121.33,
            maxLng: 121.36,
          },
          population: 1150,
        },
        {
          name: "Parang",
          city: "Socorro",
          province: "Oriental Mindoro",
          bounds: {
            minLat: 13.07,
            maxLat: 13.1,
            minLng: 121.32,
            maxLng: 121.35,
          },
          population: 1680,
        },
        {
          name: "Santo Niño",
          city: "Socorro",
          province: "Oriental Mindoro",
          bounds: {
            minLat: 12.92,
            maxLat: 12.95,
            minLng: 121.35,
            maxLng: 121.38,
          },
          population: 1380,
        },
      ];

      // Check if coordinates fall within any Socorro barangay
      for (const barangay of socorroBarangays) {
        const { bounds } = barangay;
        if (
          numLat >= bounds.minLat &&
          numLat <= bounds.maxLat &&
          numLng >= bounds.minLng &&
          numLng <= bounds.maxLng
        ) {
          return `Barangay ${barangay.name}, Socorro, Oriental Mindoro`;
        }
      }

      // If not in specific barangay bounds but within Socorro general area
      if (
        numLat >= 12.92 &&
        numLat <= 13.1 &&
        numLng >= 121.27 &&
        numLng <= 121.41
      ) {
        return "Socorro Municipality, Oriental Mindoro";
      }

      return null;
    };

    // Enhanced geocoding function with Socorro-specific handling
    const getHumanReadableLocation = async (latitude, longitude) => {
      if (!latitude || !longitude) return "Unknown Location";

      // First try local Socorro database
      const localResult = getSocorroLocation(latitude, longitude);
      if (localResult) {
        console.log(`Found local Socorro match: ${localResult}`);
        return localResult;
      }

      // If not in local database, try external APIs
      try {
        const axios = require("axios");

        const response = await axios.get(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=en,tl&countrycodes=ph`,
          {
            headers: {
              "User-Agent": "SocorroMDRRMO-IncidentReporting/1.0",
            },
            timeout: 8000,
          }
        );

        const data = response.data;

        if (data && data.address) {
          const address = data.address;
          const parts = [];

          if (address.house_number && address.road) {
            parts.push(`${address.house_number} ${address.road}`);
          } else if (address.road) {
            parts.push(address.road);
          }

          let barangayName = null;
          if (address.village) {
            barangayName = address.village;
          } else if (address.neighbourhood) {
            barangayName = address.neighbourhood;
          } else if (address.suburb) {
            barangayName = address.suburb;
          }

          if (barangayName) {
            if (!barangayName.toLowerCase().startsWith("barangay")) {
              parts.push(`Barangay ${barangayName}`);
            } else {
              parts.push(barangayName);
            }
          }

          if (address.city && address.city.toLowerCase().includes("socorro")) {
            parts.push("Socorro");
          } else {
            parts.push("Socorro Municipality");
          }

          parts.push("Oriental Mindoro");

          if (parts.length > 0) {
            return parts.join(", ");
          }
        }

        return await getSocorroLocationFallback(latitude, longitude);
      } catch (error) {
        console.warn(
          `Geocoding failed for ${latitude}, ${longitude}:`,
          error.message
        );
        return await getSocorroLocationFallback(latitude, longitude);
      }
    };

    // Socorro-specific fallback geocoding
    const getSocorroLocationFallback = async (latitude, longitude) => {
      const numLat = parseFloat(latitude);
      const numLng = parseFloat(longitude);

      if (
        numLat >= 12.9 &&
        numLat <= 13.12 &&
        numLng >= 121.25 &&
        numLng <= 121.43
      ) {
        let sector = "Central Socorro";

        if (numLat > 13.05) {
          sector = "Northern Socorro (Near Naujan Lake)";
        } else if (numLat < 12.98) {
          sector = "Southern Socorro";
        }

        if (numLng < 121.3) {
          sector = "Western Socorro";
        } else if (numLng > 121.37) {
          sector = "Eastern Socorro";
        }

        return `${sector}, Socorro, Oriental Mindoro (${numLat.toFixed(
          4
        )}°N, ${numLng.toFixed(4)}°E)`;
      }

      return `Outside Socorro Municipality (${numLat.toFixed(
        4
      )}°N, ${numLng.toFixed(4)}°E)`;
    };

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

    if (reportType && reportType !== "all") {
      whereClause.reportType = reportType;
    }

    // 🔹 REFACTORED QUERY - Now uses Incident table for coordinates
    // Camera coordinates are fetched via association when cameraId exists
    const incidentsWithCoordinates = await sequelize.query(
      `
    SELECT 
      i.id,
      i.type,
      i.reportType,
      i.status,
      i.createdAt,
      i.latitude,
      i.longitude,
      
      -- Camera details (now coming from YOLOIncident -> Camera)
      y.cameraId,
      c.location as cameraLocation,
      c.latitude as cameraLatitude,
      c.longitude as cameraLongitude,

      -- YOLO AI details
      y.aiType as yoloAiType,
      y.confidence as yoloConfidence,
      y.modelVersion as yoloModelVersion,
      y.detectionFrameUrl,
      y.detectedObjects,

      -- Human report details
      h.reportedBy as humanReporter

    FROM Incidents i
    LEFT JOIN YOLOIncidents y ON i.id = y.incidentId
    LEFT JOIN Cameras c ON y.cameraId = c.id
    LEFT JOIN HumanIncidents h ON i.id = h.incidentId
    WHERE i.deletedAt IS NULL
      ${
        startDate && endDate
          ? "AND i.createdAt BETWEEN :startDate AND :endDate"
          : ""
      }
      ${incidentType ? "AND i.type = :incidentType" : ""}
      ${
        reportType && reportType !== "all"
          ? "AND i.reportType = :reportType"
          : ""
      }
  `,
      {
        replacements: {
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          incidentType,
          reportType: reportType && reportType !== "all" ? reportType : null,
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Group coordinates to minimize API calls
    const uniqueCoordinates = new Map();
    const coordinateToLocation = new Map();

    incidentsWithCoordinates.forEach((incident) => {
      // Determine final coordinates: use incident's coordinates if available,
      // otherwise fall back to camera coordinates
      let finalLat = incident.latitude;
      let finalLng = incident.longitude;

      if (
        (!finalLat || !finalLng) &&
        incident.cameraLatitude &&
        incident.cameraLongitude
      ) {
        finalLat = incident.cameraLatitude;
        finalLng = incident.cameraLongitude;
      }

      if (finalLat && finalLng) {
        const coordKey = `${parseFloat(finalLat).toFixed(6)},${parseFloat(
          finalLng
        ).toFixed(6)}`;
        uniqueCoordinates.set(coordKey, {
          lat: finalLat,
          lng: finalLng,
        });
      }
    });

    console.log(
      `Processing ${uniqueCoordinates.size} unique coordinate pairs for Socorro-specific geocoding...`
    );

    // Process coordinates with appropriate delays
    for (const [coordKey, coords] of uniqueCoordinates.entries()) {
      const location = await getHumanReadableLocation(coords.lat, coords.lng);
      coordinateToLocation.set(coordKey, location);
      console.log(`Resolved: ${coords.lat}, ${coords.lng} -> ${location}`);

      // Delay to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }

    // Apply resolved locations to incidents
    const incidentsWithResolvedLocations = incidentsWithCoordinates.map(
      (incident) => {
        let resolvedLocation = incident.cameraLocation;

        // Determine final coordinates for location resolution
        let finalLat = incident.latitude;
        let finalLng = incident.longitude;

        if (
          (!finalLat || !finalLng) &&
          incident.cameraLatitude &&
          incident.cameraLongitude
        ) {
          finalLat = incident.cameraLatitude;
          finalLng = incident.cameraLongitude;
        }

        if (!resolvedLocation && finalLat && finalLng) {
          const coordKey = `${parseFloat(finalLat).toFixed(6)},${parseFloat(
            finalLng
          ).toFixed(6)}`;
          resolvedLocation =
            coordinateToLocation.get(coordKey) || "Unknown Location";
        }

        return {
          ...incident,
          finalLatitude: finalLat,
          finalLongitude: finalLng,
          resolvedLocation: resolvedLocation || "Unknown Location",
        };
      }
    );

    // Group and aggregate data with report type information
    const locationCounts = {};
    const locationBreakdownData = {};

    incidentsWithResolvedLocations.forEach((incident) => {
      const location = incident.resolvedLocation;

      if (!locationCounts[location]) {
        locationCounts[location] = {
          location,
          incidentCount: 0,
          incidentTypes: new Set(),
          reportTypes: new Set(),
          humanReports: 0,
          yoloReports: 0,
          latitude: incident.finalLatitude,
          longitude: incident.finalLongitude,
        };
      }

      locationCounts[location].incidentCount++;
      locationCounts[location].incidentTypes.add(incident.type);
      locationCounts[location].reportTypes.add(incident.reportType);

      if (incident.reportType === "human") {
        locationCounts[location].humanReports++;
      } else if (incident.reportType === "yolo") {
        locationCounts[location].yoloReports++;
      }

      if (!locationBreakdownData[location]) {
        locationBreakdownData[location] = {};
      }
      const key = `${incident.type}-${incident.status}-${incident.reportType}`;
      if (!locationBreakdownData[location][key]) {
        locationBreakdownData[location][key] = {
          location,
          type: incident.type,
          status: incident.status,
          reportType: incident.reportType,
          count: 0,
        };
      }
      locationBreakdownData[location][key].count++;
    });

    // Format results
    const topLocationsByCount = Object.values(locationCounts)
      .map((loc) => ({
        ...loc,
        incidentTypes: Array.from(loc.incidentTypes).join(","),
        reportTypes: Array.from(loc.reportTypes).join(","),
      }))
      .sort((a, b) => b.incidentCount - a.incidentCount)
      .slice(0, Number.parseInt(limit));

    const locationBreakdown = Object.values(locationBreakdownData)
      .flatMap((locationData) => Object.values(locationData))
      .sort((a, b) => {
        if (a.location === b.location) {
          return b.count - a.count;
        }
        return a.location.localeCompare(b.location);
      });

    const locationCoordinates = topLocationsByCount
      .filter((loc) => loc.latitude && loc.longitude)
      .map((loc) => ({
        location: loc.location,
        latitude: parseFloat(loc.latitude),
        longitude: parseFloat(loc.longitude),
        incidentCount: loc.incidentCount,
        humanReports: loc.humanReports,
        yoloReports: loc.yoloReports,
      }));

    // Socorro-specific statistics
    const socorroStats = {
      incidentsInSocorro: incidentsWithResolvedLocations.filter((i) =>
        i.resolvedLocation.toLowerCase().includes("socorro")
      ).length,
      incidentsOutsideSocorro: incidentsWithResolvedLocations.filter(
        (i) => !i.resolvedLocation.toLowerCase().includes("socorro")
      ).length,
      barangaysWithIncidents: topLocationsByCount.filter((loc) =>
        loc.location.toLowerCase().includes("barangay")
      ).length,
      humanReportsInSocorro: incidentsWithResolvedLocations.filter(
        (i) =>
          i.resolvedLocation.toLowerCase().includes("socorro") &&
          i.reportType === "human"
      ).length,
      yoloReportsInSocorro: incidentsWithResolvedLocations.filter(
        (i) =>
          i.resolvedLocation.toLowerCase().includes("socorro") &&
          i.reportType === "yolo"
      ).length,
    };

    const reportData = {
      reportType: "Socorro MDRRMO - Top Locations by Incidents Report",
      generatedAt: new Date(),
      jurisdiction: "Municipality of Socorro, Oriental Mindoro",
      filters: { startDate, endDate, incidentType, reportType, limit },
      summary: {
        totalLocations: topLocationsByCount.length,
        totalIncidents: topLocationsByCount.reduce(
          (sum, loc) => sum + loc.incidentCount,
          0
        ),
        totalHumanReports: topLocationsByCount.reduce(
          (sum, loc) => sum + loc.humanReports,
          0
        ),
        totalYOLOReports: topLocationsByCount.reduce(
          (sum, loc) => sum + loc.yoloReports,
          0
        ),
        socorroSpecificStats: socorroStats,
        geocodingStats: {
          uniqueCoordinatesProcessed: uniqueCoordinates.size,
          socorroLocalMatches: Array.from(coordinateToLocation.values()).filter(
            (loc) => loc.includes("Barangay") && loc.includes("Socorro")
          ).length,
          externalApiResolves: Array.from(coordinateToLocation.values()).filter(
            (loc) => loc.includes("Socorro") || loc.includes("Oriental Mindoro")
          ).length,
        },
      },
      topLocationsByCount,
      locationBreakdown,
      locationCoordinates,
    };

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Socorro MDRRMO location report generated successfully",
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

    const { startDate, endDate, incidentType, reportType } = req.query;

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

    if (reportType && reportType !== "all") {
      whereClause.reportType = reportType;
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

    // Get unresolved incidents with reasons, including report type breakdown
    const unresolvedIncidents = await sequelize.query(
      `
      SELECT 
        status,
        reportType,
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
      ${
        reportType && reportType !== "all" ? "AND reportType = :reportType" : ""
      }
      GROUP BY status, reportType
    `,
      {
        replacements: {
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          incidentType,
          reportType: reportType && reportType !== "all" ? reportType : null,
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Calculate resolution rate by report type
    const resolutionRateByType = await sequelize.query(
      `
      SELECT 
        reportType,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
        ROUND((SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as resolutionRate
      FROM Incidents
      WHERE deletedAt IS NULL
      ${
        startDate && endDate
          ? "AND createdAt BETWEEN :startDate AND :endDate"
          : ""
      }
      ${incidentType ? "AND type = :incidentType" : ""}
      GROUP BY reportType
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

    // Calculate overall resolution rate
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
      ${
        reportType && reportType !== "all" ? "AND reportType = :reportType" : ""
      }
    `,
      {
        replacements: {
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          incidentType,
          reportType: reportType && reportType !== "all" ? reportType : null,
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Get resolution trends over time
    const resolutionTrends = await sequelize.query(
      `
      SELECT 
        DATE(createdAt) as date,
        reportType,
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
      ${
        reportType && reportType !== "all" ? "AND reportType = :reportType" : ""
      }
      GROUP BY DATE(createdAt), reportType
      ORDER BY date DESC
      LIMIT 30
    `,
      {
        replacements: {
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          incidentType,
          reportType: reportType && reportType !== "all" ? reportType : null,
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const reportData = {
      reportType: "Resolved vs Unresolved Incidents Report",
      generatedAt: new Date(),
      filters: { startDate, endDate, incidentType, reportType },
      summary: {
        totalIncidents,
        resolvedIncidents,
        unresolvedIncidents: totalIncidents - resolvedIncidents,
        resolutionRate: Number.parseFloat(resolutionRate.toFixed(2)),
        avgResolutionTime: resolutionTimeStats[0]?.avgResolutionHours || 0,
      },
      resolutionRateByType,
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

    const { startDate, endDate, userId, reportType, limit = 20 } = req.query;

    // Build date filter
    let dateFilter = "";
    if (startDate && endDate) {
      dateFilter = "AND ia.acceptedAt BETWEEN :startDate AND :endDate";
    }

    // Get responder performance statistics with report type information
    const responderStats = await sequelize.query(
      `
      SELECT 
        u.id,
        CONCAT(u.firstname, ' ', u.lastname) as responderName,
        u.role,
        COUNT(ia.incidentId) as incidentsAccepted,
        COUNT(CASE WHEN i.status = 'resolved' THEN 1 END) as incidentsResolved,
        COUNT(CASE WHEN i.reportType = 'human' THEN 1 END) as humanIncidents,
        COUNT(CASE WHEN i.reportType = 'yolo' THEN 1 END) as yoloIncidents,
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
      ${
        reportType && reportType !== "all"
          ? "AND i.reportType = :reportType"
          : ""
      }
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
          reportType: reportType && reportType !== "all" ? reportType : null,
          limit: Number.parseInt(limit),
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Get incident types handled by each responder, including report type
    const responderIncidentTypes = await sequelize.query(
      `
      SELECT 
        u.id as userId,
        CONCAT(u.firstname, ' ', u.lastname) as responderName,
        i.type as incidentType,
        i.reportType,
        COUNT(*) as count
      FROM IncidentAcceptance ia
      JOIN users u ON ia.userId = u.id
      JOIN Incidents i ON ia.incidentId = i.id
      WHERE u.deletedAt IS NULL
      AND i.deletedAt IS NULL
      ${userId ? "AND u.id = :userId" : ""}
      ${
        reportType && reportType !== "all"
          ? "AND i.reportType = :reportType"
          : ""
      }
      ${dateFilter}
      GROUP BY u.id, u.firstname, u.lastname, i.type, i.reportType
      ORDER BY u.id, count DESC
    `,
      {
        replacements: {
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          userId,
          reportType: reportType && reportType !== "all" ? reportType : null,
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Get team performance with report type breakdown
    const teamPerformance = await sequelize.query(
      `
      SELECT 
        u.role as team,
        COUNT(DISTINCT u.id) as teamSize,
        COUNT(ia.incidentId) as totalIncidentsHandled,
        COUNT(CASE WHEN i.reportType = 'human' THEN 1 END) as humanIncidents,
        COUNT(CASE WHEN i.reportType = 'yolo' THEN 1 END) as yoloIncidents,
        AVG(TIMESTAMPDIFF(MINUTE, i.createdAt, ia.acceptedAt)) as avgTeamResponseTime,
        ROUND((COUNT(CASE WHEN i.status = 'resolved' THEN 1 END) / COUNT(ia.incidentId)) * 100, 2) as teamResolutionRate
      FROM IncidentAcceptance ia
      JOIN users u ON ia.userId = u.id
      JOIN Incidents i ON ia.incidentId = i.id
      WHERE u.deletedAt IS NULL
      AND i.deletedAt IS NULL
      ${
        reportType && reportType !== "all"
          ? "AND i.reportType = :reportType"
          : ""
      }
      ${dateFilter}
      GROUP BY u.role
      ORDER BY totalIncidentsHandled DESC
    `,
      {
        replacements: {
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          reportType: reportType && reportType !== "all" ? reportType : null,
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
      filters: { startDate, endDate, userId, reportType, limit },
      summary: {
        totalResponders: responderStats.length,
        totalIncidentsHandled: responderStats.reduce(
          (sum, r) => sum + Number.parseInt(r.incidentsAccepted),
          0
        ),
        totalHumanIncidents: responderStats.reduce(
          (sum, r) => sum + Number.parseInt(r.humanIncidents),
          0
        ),
        totalYOLOIncidents: responderStats.reduce(
          (sum, r) => sum + Number.parseInt(r.yoloIncidents),
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
      period = "monthly",
      incidentType,
      status,
      reportType, // human, yolo, or all
      limit = 20,
    } = req.query;

    if (!reportTypes) {
      throw new BadRequestError("Report types are required");
    }

    const requestedReports = reportTypes.split(",").map((type) => type.trim());
    const combinedData = {
      reportType: "Combined Report",
      generatedAt: new Date(),
      filters: {
        startDate,
        endDate,
        period,
        incidentType,
        status,
        reportType,
        limit,
      },
      reports: {},
    };

    // Common query parameters for all reports
    const commonParams = {
      startDate,
      endDate,
      period,
      incidentType,
      status,
      reportType,
      limit,
    };

    // Generate each requested report
    for (const reportTypeName of requestedReports) {
      try {
        switch (reportTypeName) {
          case "inventory_summary":
            const inventoryReq = { query: commonParams };
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
              query: { ...commonParams, period: period || "monthly" },
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
              query: { ...commonParams, limit: limit || 100 },
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
              query: { ...commonParams, limit: limit || 100 },
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
              query: { ...commonParams, limit: limit || 100 },
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
              query: { ...commonParams, limit: limit || 10 },
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
              query: commonParams,
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
              query: { ...commonParams, limit: limit || 20 },
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
            console.warn(`Unknown report type: ${reportTypeName}`);
            combinedData.reports[reportTypeName] = {
              error: `Unknown report type: ${reportTypeName}. Available types: inventory_summary, incident_summary, item_deployment, batch_additions, stock_movement, top_locations, resolved_unresolved, responder_performance, ai_detection_analysis, human_reports_analysis`,
            };
        }

        // Add a small delay between report generations to prevent database overload
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error generating ${reportTypeName}:`, error);
        combinedData.reports[reportTypeName] = {
          error: error.message,
          stack:
            process.env.NODE_ENV === "development" ? error.stack : undefined,
        };
      }
    }

    // Generate cross-report insights
    combinedData.crossReportInsights = generateCrossReportInsights(
      combinedData.reports
    );

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Combined report generated successfully",
      data: combinedData,
    });
  } catch (error) {
    console.error("An error occurred in generateCombinedReport: " + error);
    next(error);
  }
};

const generateCrossReportInsights = (reports) => {
  const insights = [];

  try {
    // Insight 1: Compare incident volume with inventory usage
    if (reports.incident_summary && reports.inventory_summary) {
      const totalIncidents = reports.incident_summary.summary?.totalIncidents;
      const totalInventory = reports.inventory_summary.summary?.totalItems;

      if (totalIncidents > 0 && totalInventory > 0) {
        const incidentsPerItem = (totalIncidents / totalInventory).toFixed(2);
        insights.push({
          type: "incident_inventory_ratio",
          title: "Incident to Inventory Ratio",
          description: `There are ${incidentsPerItem} incidents per inventory item`,
          severity:
            incidentsPerItem > 5
              ? "high"
              : incidentsPerItem > 2
              ? "medium"
              : "low",
        });
      }
    }

    // Insight 2: Response time vs resolution rate correlation
    if (reports.incident_summary && reports.responder_performance) {
      const avgResponseTime = reports.incident_summary.summary?.avgResponseTime;
      const avgResolutionRate =
        reports.responder_performance.summary?.avgResolutionRate;

      if (avgResponseTime && avgResolutionRate) {
        let insight = "";
        if (avgResponseTime < 30 && avgResolutionRate > 80) {
          insight =
            "Excellent performance: Fast response times with high resolution rates";
        } else if (avgResponseTime > 60 && avgResolutionRate < 50) {
          insight =
            "Attention needed: Slow response times with low resolution rates";
        }

        if (insight) {
          insights.push({
            type: "performance_correlation",
            title: "Response Time vs Resolution Rate",
            description: insight,
            severity: avgResponseTime > 60 ? "high" : "medium",
          });
        }
      }
    }

    // Insight 3: Location-based incident patterns
    if (reports.top_locations && reports.incident_summary) {
      const topLocation = reports.top_locations.topLocationsByCount?.[0];
      const incidentTypes = reports.incident_summary.incidentsByType;

      if (topLocation && incidentTypes) {
        insights.push({
          type: "hotspot_analysis",
          title: "Incident Hotspot Identified",
          description: `Highest incident concentration at ${topLocation.location} with ${topLocation.incidentCount} incidents`,
          severity: topLocation.incidentCount > 10 ? "high" : "medium",
        });
      }
    }

    // Insight 4: Report type effectiveness
    if (reports.resolved_unresolved && reports.incident_summary) {
      const resolutionByType = reports.resolved_unresolved.resolutionRateByType;

      if (resolutionByType && resolutionByType.length > 0) {
        const bestPerformer = resolutionByType.reduce((prev, current) =>
          prev.resolutionRate > current.resolutionRate ? prev : current
        );

        const worstPerformer = resolutionByType.reduce((prev, current) =>
          prev.resolutionRate < current.resolutionRate ? prev : current
        );

        insights.push({
          type: "report_type_effectiveness",
          title: "Report Type Performance",
          description: `Best resolution rate: ${bestPerformer.reportType} (${bestPerformer.resolutionRate}%), Lowest: ${worstPerformer.reportType} (${worstPerformer.resolutionRate}%)`,
          severity: worstPerformer.resolutionRate < 50 ? "medium" : "low",
        });
      }
    }

    // Insight 5: Resource deployment patterns
    if (reports.item_deployment && reports.incident_summary) {
      const deployments = reports.item_deployment.recentDeployments;
      const incidentTrends = reports.incident_summary.incidentsByTime;

      if (
        deployments &&
        incidentTrends &&
        deployments.length > 0 &&
        incidentTrends.length > 0
      ) {
        const avgDeploymentsPerDay = (deployments.length / 30).toFixed(1); // Assuming 30-day period
        insights.push({
          type: "deployment_frequency",
          title: "Resource Deployment Frequency",
          description: `Average of ${avgDeploymentsPerDay} deployments per day`,
          severity:
            avgDeploymentsPerDay > 5
              ? "high"
              : avgDeploymentsPerDay > 2
              ? "medium"
              : "low",
        });
      }
    }
  } catch (error) {
    console.error("Error generating cross-report insights:", error);
    insights.push({
      type: "insight_error",
      title: "Analysis Incomplete",
      description:
        "Some insights could not be generated due to data inconsistencies",
      severity: "low",
    });
  }

  return insights;
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
