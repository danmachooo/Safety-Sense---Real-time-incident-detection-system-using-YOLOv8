require("dotenv").config();
const { Op } = require("sequelize");
// Import models from the index file to ensure associations are loaded
const models = require("../models/index");
const Incident = models.Incident;
const User = models.User;
const Camera = models.Camera;
const InventoryItem = models.InventoryItem;
const Batch = models.Batch;
const Deployment = models.Deployment;
const Category = models.Category;
const IncidentAcceptance = models.IncidentAcceptance;
const IncidentDismissal = models.IncidentDismissal;

const { BadRequestError, NotFoundError } = require("../utils/Error");
const { StatusCodes } = require("http-status-codes");
const sequelize = require("../config/database");

/**
 * Get dashboard summary statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getDashboardSummary = async (req, res, next) => {
  try {
    // Get total counts
    const totalIncidents = await Incident.count({
      where: { deletedAt: null },
    });

    const activeIncidents = await Incident.count({
      where: {
        status: {
          [Op.in]: ["pending", "accepted", "ongoing"],
        },
        deletedAt: null,
      },
    });

    const totalUsers = await User.count({
      where: { isBlocked: false, deletedAt: null },
    });

    const totalRescuers = await User.count({
      where: {
        role: "rescuer",
        isBlocked: false,
        deletedAt: null,
      },
    });

    const totalInventoryItems = await InventoryItem.count({
      where: { is_active: true, deletedAt: null },
    });

    const activeDeployments = await Deployment.count({
      where: {
        status: "DEPLOYED",
        deletedAt: null,
      },
    });

    // Get recent incidents
    const recentIncidents = await Incident.findAll({
      limit: 5,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Camera,
          as: "camera",
          attributes: ["id", "name", "location"],
          required: false,
        },
        {
          model: User,
          as: "accepters",
          attributes: ["id", "firstname", "lastname"],
          through: { attributes: ["acceptedAt"] },
          required: false,
        },
      ],
      where: { deletedAt: null },
    });

    // Get incident statistics by type
    const incidentsByType = await Incident.findAll({
      attributes: [
        "type",
        [sequelize.fn("COUNT", sequelize.col("type")), "count"],
      ],
      where: { deletedAt: null },
      group: ["type"],
    });

    // Get incident statistics by status
    const incidentsByStatus = await Incident.findAll({
      attributes: [
        "status",
        [sequelize.fn("COUNT", sequelize.col("status")), "count"],
      ],
      where: { deletedAt: null },
      group: ["status"],
    });

    // Get low stock inventory items
    const lowStockItems = await InventoryItem.findAll({
      where: {
        quantity_in_stock: {
          [Op.lte]: sequelize.col("min_stock_level"),
        },
        is_active: true,
        deletedAt: null,
      },
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["id", "name"],
        },
      ],
      limit: 5,
    });

    // Get recent deployments
    const recentDeployments = await Deployment.findAll({
      limit: 5,
      order: [["deployment_date", "DESC"]],
      include: [
        {
          model: InventoryItem,
          as: "inventoryDeploymentItem",
          attributes: ["id", "name", "location"],
        },
        {
          model: User,
          as: "deployer",
          attributes: ["id", "firstname", "lastname"],
        },
      ],
      where: { deletedAt: null },
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Dashboard summary retrieved successfully",
      data: {
        counts: {
          totalIncidents,
          activeIncidents,
          totalUsers,
          totalRescuers,
          totalInventoryItems,
          activeDeployments,
        },
        recentIncidents,
        incidentsByType,
        incidentsByStatus,
        lowStockItems,
        recentDeployments,
      },
    });
  } catch (error) {
    console.error("An error occurred: " + error);
    next(error);
  }
};

/**
 * Get incident statistics for dashboard
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getIncidentStats = async (req, res, next) => {
  try {
    const { timeframe } = req.query;
    let startDate = new Date();

    // Set timeframe based on query parameter
    switch (timeframe) {
      case "week":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "year":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        // Default to last 30 days
        startDate.setDate(startDate.getDate() - 30);
    }

    // Get incidents by day for the selected timeframe
    const incidentsByDay = await sequelize.query(
      `
      SELECT 
        DATE(createdAt) as date,
        COUNT(*) as count
      FROM Incidents
      WHERE createdAt >= :startDate
      AND deletedAt IS NULL
      GROUP BY DATE(createdAt)
      ORDER BY date ASC
    `,
      {
        replacements: { startDate },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Get incidents by type for the selected timeframe
    const incidentsByType = await Incident.findAll({
      attributes: [
        "type",
        [sequelize.fn("COUNT", sequelize.col("type")), "count"],
      ],
      where: {
        createdAt: { [Op.gte]: startDate },
        deletedAt: null,
      },
      group: ["type"],
    });

    // Get incidents by status for the selected timeframe
    const incidentsByStatus = await Incident.findAll({
      attributes: [
        "status",
        [sequelize.fn("COUNT", sequelize.col("status")), "count"],
      ],
      where: {
        createdAt: { [Op.gte]: startDate },
        deletedAt: null,
      },
      group: ["status"],
    });

    // Get average resolution time (in hours)
    const resolutionTimeQuery = await sequelize.query(
      `
      SELECT 
        AVG(TIMESTAMPDIFF(HOUR, createdAt, updatedAt)) as avgResolutionHours
      FROM Incidents
      WHERE status = 'resolved'
      AND createdAt >= :startDate
      AND deletedAt IS NULL
    `,
      {
        replacements: { startDate },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const avgResolutionTime = resolutionTimeQuery[0]?.avgResolutionHours || 0;

    // Get incidents by source (camera vs user reported)
    const incidentsBySource = await sequelize.query(
      `
      SELECT 
        CASE WHEN cameraId IS NULL THEN 'user-reported' ELSE 'camera-detected' END as source,
        COUNT(*) as count
      FROM Incidents
      WHERE createdAt >= :startDate
      AND deletedAt IS NULL
      GROUP BY CASE WHEN cameraId IS NULL THEN 'user-reported' ELSE 'camera-detected' END
    `,
      {
        replacements: { startDate },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Incident statistics retrieved successfully",
      data: {
        incidentsByDay,
        incidentsByType,
        incidentsByStatus,
        incidentsBySource,
        avgResolutionTime,
        timeframe: timeframe || "30days",
        totalIncidents: await Incident.count({
          where: {
            createdAt: { [Op.gte]: startDate },
            deletedAt: null,
          },
        }),
      },
    });
  } catch (error) {
    console.error("An error occurred: " + error);
    next(error);
  }
};

/**
 * Get inventory statistics for dashboard
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getInventoryStats = async (req, res, next) => {
  try {
    // Get inventory items by category
    const itemsByCategory = await sequelize.query(
      `
      SELECT 
        c.name as categoryName,
        COUNT(i.id) as itemCount,
        SUM(i.quantity_in_stock) as totalQuantity
      FROM inventory_items i
      JOIN categories c ON i.category_id = c.id
      WHERE i.deletedAt IS NULL
      AND i.is_active = true
      GROUP BY c.name
    `,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Get low stock items
    const lowStockItems = await InventoryItem.count({
      where: {
        quantity_in_stock: {
          [Op.lte]: sequelize.col("min_stock_level"),
        },
        is_active: true,
        deletedAt: null,
      },
    });

    // Get items by condition
    const itemsByCondition = await InventoryItem.findAll({
      attributes: [
        "condition",
        [sequelize.fn("COUNT", sequelize.col("condition")), "count"],
      ],
      where: {
        is_active: true,
        deletedAt: null,
      },
      group: ["condition"],
    });

    // Get items needing maintenance
    const maintenanceItems = await InventoryItem.count({
      where: {
        next_maintenance_date: {
          [Op.lte]: new Date(),
        },
        is_active: true,
        deletedAt: null,
      },
    });

    // Get expiring batches in next 30 days
    const expiringBatches = await Batch.count({
      where: {
        expiry_date: {
          [Op.between]: [
            new Date(),
            new Date(new Date().setDate(new Date().getDate() + 30)),
          ],
        },
        is_active: true,
        deletedAt: null,
      },
    });

    // Get total inventory value
    const inventoryValueQuery = await sequelize.query(
      `
      SELECT 
        SUM(b.cost * b.quantity) as totalValue
      FROM batches b
      WHERE b.deletedAt IS NULL
      AND b.is_active = true
    `,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const totalValue = inventoryValueQuery[0]?.totalValue || 0;

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Inventory statistics retrieved successfully",
      data: {
        itemsByCategory,
        lowStockItems,
        itemsByCondition,
        maintenanceItems,
        expiringBatches,
        totalValue,
        totalItems: await InventoryItem.count({
          where: {
            is_active: true,
            deletedAt: null,
          },
        }),
      },
    });
  } catch (error) {
    console.error("An error occurred: " + error);
    next(error);
  }
};

/**
 * Get deployment statistics for dashboard
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getDeploymentStats = async (req, res, next) => {
  try {
    const { timeframe } = req.query;
    let startDate = new Date();

    // Set timeframe based on query parameter
    switch (timeframe) {
      case "week":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "year":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        // Default to last 30 days
        startDate.setDate(startDate.getDate() - 30);
    }

    // Get deployments by day
    const deploymentsByDay = await sequelize.query(
      `
      SELECT 
        DATE(deployment_date) as date,
        COUNT(*) as count
      FROM deployments
      WHERE deployment_date >= :startDate
      AND deletedAt IS NULL
      GROUP BY DATE(deployment_date)
      ORDER BY date ASC
    `,
      {
        replacements: { startDate },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Get deployments by type
    const deploymentsByType = await Deployment.findAll({
      attributes: [
        "deployment_type",
        [sequelize.fn("COUNT", sequelize.col("deployment_type")), "count"],
      ],
      where: {
        deployment_date: { [Op.gte]: startDate },
        deletedAt: null,
      },
      group: ["deployment_type"],
    });

    // Get deployments by status
    const deploymentsByStatus = await Deployment.findAll({
      attributes: [
        "status",
        [sequelize.fn("COUNT", sequelize.col("status")), "count"],
      ],
      where: {
        deployment_date: { [Op.gte]: startDate },
        deletedAt: null,
      },
      group: ["status"],
    });

    // Get top deployment locations
    const topLocations = await sequelize.query(
      `
      SELECT 
        deployment_location as location,
        COUNT(*) as count
      FROM deployments
      WHERE deployment_date >= :startDate
      AND deletedAt IS NULL
      GROUP BY deployment_location
      ORDER BY count DESC
      LIMIT 5
    `,
      {
        replacements: { startDate },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Get top deployers (users)
    const topDeployers = await sequelize.query(
      `
      SELECT 
        u.id,
        CONCAT(u.firstname, ' ', u.lastname) as name,
        COUNT(d.id) as deploymentCount
      FROM deployments d
      JOIN users u ON d.deployed_by = u.id
      WHERE d.deployment_date >= :startDate
      AND d.deletedAt IS NULL
      GROUP BY d.deployed_by, u.id, u.firstname, u.lastname
      ORDER BY deploymentCount DESC
      LIMIT 5
    `,
      {
        replacements: { startDate },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Deployment statistics retrieved successfully",
      data: {
        deploymentsByDay,
        deploymentsByType,
        deploymentsByStatus,
        topLocations,
        topDeployers,
        timeframe: timeframe || "30days",
        totalDeployments: await Deployment.count({
          where: {
            deployment_date: { [Op.gte]: startDate },
            deletedAt: null,
          },
        }),
      },
    });
  } catch (error) {
    console.error("An error occurred: " + error);
    next(error);
  }
};

/**
 * Get user activity statistics for dashboard
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getUserActivityStats = async (req, res, next) => {
  try {
    const { timeframe } = req.query;
    let startDate = new Date();

    // Set timeframe based on query parameter
    switch (timeframe) {
      case "week":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "year":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        // Default to last 30 days
        startDate.setDate(startDate.getDate() - 30);
    }

    // Get top responders (users who accepted most incidents)
    const topResponders = await sequelize.query(
      `
      SELECT 
        u.id,
        CONCAT(u.firstname, ' ', u.lastname) as name,
        COUNT(ia.incidentId) as acceptedCount
      FROM IncidentAcceptance ia
      JOIN users u ON ia.userId = u.id
      WHERE ia.acceptedAt >= :startDate
      GROUP BY ia.userId, u.id, u.firstname, u.lastname
      ORDER BY acceptedCount DESC
      LIMIT 5
    `,
      {
        replacements: { startDate },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Get new users registered in timeframe
    const newUsers = await User.count({
      where: {
        createdAt: { [Op.gte]: startDate },
        deletedAt: null,
      },
    });

    // Get active users (users who accepted at least one incident)
    const activeUsers = await sequelize.query(
      `
      SELECT COUNT(DISTINCT userId) as count
      FROM IncidentAcceptance
      WHERE acceptedAt >= :startDate
    `,
      {
        replacements: { startDate },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Get incident acceptance rate
    const acceptanceRateQuery = await sequelize.query(
      `
      SELECT 
        COUNT(DISTINCT ia.incidentId) as acceptedIncidents,
        COUNT(DISTINCT i.id) as totalIncidents
      FROM Incidents i
      LEFT JOIN IncidentAcceptance ia ON i.id = ia.incidentId
      WHERE i.createdAt >= :startDate
      AND i.deletedAt IS NULL
    `,
      {
        replacements: { startDate },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const acceptedIncidents = acceptanceRateQuery[0]?.acceptedIncidents || 0;
    const totalIncidents = acceptanceRateQuery[0]?.totalIncidents || 0;
    const acceptanceRate =
      totalIncidents > 0 ? (acceptedIncidents / totalIncidents) * 100 : 0;

    // Get average response time (time between incident creation and acceptance)
    const responseTimeQuery = await sequelize.query(
      `
      SELECT 
        AVG(TIMESTAMPDIFF(MINUTE, i.createdAt, ia.acceptedAt)) as avgResponseMinutes
      FROM Incidents i
      JOIN IncidentAcceptance ia ON i.id = ia.incidentId
      WHERE i.createdAt >= :startDate
      AND i.deletedAt IS NULL
    `,
      {
        replacements: { startDate },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const avgResponseTime = responseTimeQuery[0]?.avgResponseMinutes || 0;
    console.log("Avg response time: ", avgResponseTime);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "User activity statistics retrieved successfully",
      data: {
        topResponders,
        newUsers,
        activeUsers: activeUsers[0]?.count || 0,
        acceptanceRate: parseFloat(acceptanceRate.toFixed(2)),
        avgResponseTime: parseFloat(Number(avgResponseTime).toFixed(2)),
        timeframe: timeframe || "30days",
        totalUsers: await User.count({
          where: {
            isBlocked: false,
            deletedAt: null,
          },
        }),
      },
    });
  } catch (error) {
    console.error("An error occurred: " + error);
    next(error);
  }
};

/**
 * Get recent activity feed for dashboard
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */

const getActivityFeed = async (req, res, next) => {
  try {
    const { limit } = req.query;
    const limitNumber = parseInt(limit) || 20;

    // Get recent incidents
    const incidents = await Incident.findAll({
      attributes: ["id", "type", "status", "createdAt", "updatedAt"],
      limit: limitNumber,
      order: [["createdAt", "DESC"]],
      where: { deletedAt: null },
    });

    // Get recent incident acceptances WITHOUT using associations
    const acceptances = await IncidentAcceptance.findAll({
      attributes: ["incidentId", "userId", "acceptedAt"],
      limit: limitNumber,
      order: [["acceptedAt", "DESC"]],
    });

    // Get all incident IDs from acceptances
    const incidentIds = acceptances.map((acceptance) => acceptance.incidentId);

    // Get all user IDs from acceptances
    const userIds = acceptances.map((acceptance) => acceptance.userId);

    // Fetch incidents and users separately
    const acceptedIncidents = await Incident.findAll({
      attributes: ["id", "type"],
      where: {
        id: incidentIds,
        deletedAt: null,
      },
    });

    const users = await User.findAll({
      attributes: ["id", "firstname", "lastname"],
      where: {
        id: userIds,
        deletedAt: null,
      },
    });

    // Create maps for easy lookup
    const incidentMap = {};
    acceptedIncidents.forEach((incident) => {
      incidentMap[incident.id] = incident;
    });

    const userMap = {};
    users.forEach((user) => {
      userMap[user.id] = user;
    });

    // Get recent deployments
    const deployments = await Deployment.findAll({
      attributes: [
        "id",
        "deployment_type",
        "status",
        "deployment_date",
        "deployment_location",
      ],
      include: [
        {
          model: User,
          as: "deployer",
          attributes: ["id", "firstname", "lastname"],
        },
        {
          model: InventoryItem,
          as: "inventoryDeploymentItem", // Fixed typo
          attributes: ["id", "name"],
        },
      ],
      limit: limitNumber,
      order: [["deployment_date", "DESC"]],
      where: { deletedAt: null },
    });

    // Combine and sort all activities by date
    const activities = [
      ...incidents.map((incident) => ({
        type: "incident_created",
        timestamp: incident.createdAt,
        data: incident,
      })),
      ...acceptances.map((acceptance) => ({
        type: "incident_accepted",
        timestamp: acceptance.acceptedAt,
        data: {
          incident: incidentMap[acceptance.incidentId],
          user: userMap[acceptance.userId],
        },
      })),
      ...deployments.map((deployment) => ({
        type: "deployment",
        timestamp: deployment.deployment_date,
        data: deployment,
      })),
    ];

    // Sort by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Limit to requested number
    const limitedActivities = activities.slice(0, limitNumber);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Activity feed retrieved successfully",
      data: limitedActivities,
    });
  } catch (error) {
    console.error("An error occurred: " + error);
    next(error);
  }
};

/**
 * Get map data for dashboard
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getMapData = async (req, res, next) => {
  try {
    const { timeframe } = req.query;
    let startDate = new Date();

    // Set timeframe based on query parameter
    switch (timeframe) {
      case "day":
        startDate.setDate(startDate.getDate() - 1);
        break;
      case "week":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      default:
        // Default to last 24 hours
        startDate.setDate(startDate.getDate() - 1);
    }

    // Get active incidents with location data
    const incidents = await Incident.findAll({
      attributes: [
        "id",
        "type",
        "status",
        "longitude",
        "latitude",
        "createdAt",
        "snapshotUrl",
        "description",
      ],
      where: {
        createdAt: { [Op.gte]: startDate },
        status: {
          [Op.in]: ["pending", "accepted", "ongoing"],
        },
        deletedAt: null,
      },
      include: [
        {
          model: Camera,
          as: "camera",
          attributes: ["id", "name", "location"],
          required: false,
        },
      ],
    });

    // Get camera locations
    const cameras = await Camera.findAll({
      attributes: ["id", "name", "location", "status", "longitude", "latitude"],
      where: {
        status: "active",
        deletedAt: null,
      },
    });

    // Get active deployments with location data
    const deployments = await Deployment.findAll({
      attributes: [
        "id",
        "deployment_type",
        "status",
        "deployment_location",
        "deployment_date",
      ],
      where: {
        status: "DEPLOYED",
        deletedAt: null,
        deployment_date: { [Op.gte]: startDate },
      },
      include: [
        {
          model: InventoryItem,
          as: "inventoryDeploymentItem",
          attributes: ["id", "name"],
        },
      ],
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Map data retrieved successfully",
      data: {
        incidents,
        cameras,
        deployments,
        timeframe: timeframe || "day",
      },
    });
  } catch (error) {
    console.error("An error occurred: " + error);
    next(error);
  }
};

module.exports = {
  getDashboardSummary,
  getIncidentStats,
  getInventoryStats,
  getDeploymentStats,
  getUserActivityStats,
  getActivityFeed,
  getMapData,
};
