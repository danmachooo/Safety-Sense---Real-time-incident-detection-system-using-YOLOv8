import { Op } from "sequelize"; // Import models from the index file to ensure associations are loaded
import models from "../../models/index.js";
const { Incident, Camera, User, IncidentAcceptance, IncidentDismissal } =
  models;
// const Camera = models.Camera;
// const User = models.User;
// const IncidentAcceptance = models.IncidentAcceptance;
// const IncidentDismissal = models.IncidentDismissal; // Add this line

// const { BadRequestError, NotFoundError } = require("../../utils/Error");
// const { StatusCodes } = require("http-status-codes");
// const sequelize = require("../../config/database");
// const fcmService = require("../../services/firebase/fcmService");

import { BadRequestError, NotFoundError } from "../../utils/Error.js";
import { StatusCodes } from "http-status-codes";
import sequelize from "../../config/database.js";
import { _sendTopicNotification } from "../Notification/fcmController.js";
/**
 * Create a new incident (handles both citizen reports and camera detections)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const createIncident = async (req, res, next) => {
  let transaction;

  try {
    transaction = await sequelize.transaction();

    const {
      cameraId,
      reportedBy,
      contact,
      type,
      snapshotUrl,
      description,
      longitude,
      latitude,
    } = req.body;

    // Determine if this is a citizen report or system detection
    const isCitizenReport = !cameraId;

    // Only require type, snapshotUrl, longitude, and latitude
    if (!type || !snapshotUrl || !longitude || !latitude) {
      throw new BadRequestError(
        "Required fields are missing: type, snapshotUrl, longitude, latitude"
      );
    }

    // Validate camera exists if cameraId is provided
    if (cameraId) {
      const camera = await Camera.findByPk(cameraId);
      if (!camera) {
        throw new NotFoundError("Camera not found");
      }
    }

    // Validate incident type
    const validTypes = [
      "Fire",
      "Accident",
      "Medical",
      "Crime",
      "Flood",
      "Other",
    ];
    if (!validTypes.includes(type)) {
      throw new BadRequestError("Invalid incident type");
    }

    const incident = await Incident.create(
      {
        cameraId, // This will be null for citizen reports
        reportedBy:
          reportedBy ||
          (isCitizenReport ? "Anonymous Citizen" : "System Detection"),
        contact, // Optional contact info for citizen reports
        type,
        snapshotUrl,
        description,
        longitude,
        latitude,
        status: "pending",
      },
      { transaction }
    );

    await transaction.commit();
    transaction = null; // Set to null after commit to prevent double rollback

    // Fetch the created incident with associations
    const createdIncident = await Incident.findByPk(incident.id, {
      include: [
        {
          model: Camera,
          as: "camera",
          attributes: ["id", "name", "location", "status"],
          required: false,
        },
      ],
    });

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: isCitizenReport
        ? "Citizen report created successfully"
        : "Incident detected successfully",
      data: createdIncident,
    });
  } catch (error) {
    // Only roll back if transaction exists and hasn't been committed/rolled back
    if (transaction) await transaction.rollback();

    console.error("An error occurred: " + error);
    next(error);
  }
};

/**
 * Create a new incident specifically from citizen report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const createCitizenReport = async (req, res, next) => {
  let transaction;

  try {
    transaction = await sequelize.transaction();

    const {
      reportedBy,
      contact,
      type,
      snapshotUrl,
      description,
      longitude,
      latitude,
    } = req.body;

    // Only require type, snapshotUrl, longitude, and latitude
    if (!type || !snapshotUrl || !longitude || !latitude || !description) {
      throw new BadRequestError(
        "Required fields are missing: type, snapshotUrl, description, longitude, latitude"
      );
    }

    // Validate incident type
    const validTypes = [
      "Fire",
      "Accident",
      "Medical",
      "Crime",
      "Flood",
      "Other",
    ];
    if (!validTypes.includes(type)) {
      throw new BadRequestError("Invalid incident type");
    }
    const incident = await Incident.create(
      {
        cameraId: null,
        reportedBy: reportedBy || "Anonymous Citizen",
        contact: contact || "No contact provided.",
        type,
        snapshotUrl,
        description,
        longitude,
        latitude,
        status: "pending",
      },
      { transaction }
    );

    try {
      const shortDescription =
        incident.description.length > 100
          ? `${incident.description.substring(0, 100)}...`
          : incident.description;

      console.log(process.env.RESPONDER_TOPIC);
      await _sendTopicNotification(
        process.env.RESPONDER_TOPIC || "all_responders",
        "Incident Alert!",
        shortDescription,
        incident.id,
        {} // Explicit empty data parameter
      );
    } catch (error) {
      console.error("FCM notification failed:", error);
    }
    await transaction.commit();
    transaction = null; // Set to null after commit to prevent double rollback

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Citizen report created successfully",
      data: incident,
    });
  } catch (error) {
    // Only roll back if transaction exists and hasn't been committed/rolled back
    if (transaction) await transaction.rollback();

    console.error("An error occurred: " + error);
    next(error);
  }
};

/**
 * Create a new incident specifically from camera detection
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const createCameraDetection = async (req, res, next) => {
  let transaction;

  try {
    transaction = await sequelize.transaction();

    const { cameraId, type, snapshotUrl, description, longitude, latitude } =
      req.body;

    // Validate required fields
    if (!cameraId || !type || !snapshotUrl || !longitude || !latitude) {
      throw new BadRequestError(
        "Required fields are missing: cameraId, type, snapshotUrl, longitude, latitude"
      );
    }

    // Validate camera exists
    const camera = await Camera.findByPk(cameraId);
    if (!camera) {
      throw new NotFoundError("Camera not found");
    }

    // Validate incident type
    const validTypes = [
      "Fire",
      "Accident",
      "Medical",
      "Crime",
      "Flood",
      "Other",
    ];
    if (!validTypes.includes(type)) {
      throw new BadRequestError("Invalid incident type");
    }

    const incident = await Incident.create(
      {
        cameraId,
        reportedBy: "System Detection",
        contact: null,
        type,
        snapshotUrl,
        description,
        longitude,
        latitude,
        status: "pending",
      },
      { transaction }
    );

    await transaction.commit();
    transaction = null; // Set to null after commit to prevent double rollback

    // Fetch the created incident with camera association
    const createdIncident = await Incident.findByPk(incident.id, {
      include: [
        {
          model: Camera,
          as: "camera",
          attributes: ["id", "name", "location", "status"],
          required: false,
        },
      ],
    });

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Camera detection created successfully",
      data: createdIncident,
    });
  } catch (error) {
    // Only roll back if transaction exists and hasn't been committed/rolled back
    if (transaction) await transaction.rollback();

    console.error("An error occurred: " + error);
    next(error);
  }
};

/**
 * Get all incidents with optional filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getIncidents = async (req, res, next) => {
  try {
    const {
      search,
      status,
      type,
      cameraId,
      startDate,
      endDate,
      page,
      limit,
      showDeleted,
      sortBy,
      sortOrder,
      source,
    } = req.query;

    const whereCondition = {};

    // Search condition
    if (search) {
      whereCondition[Op.or] = [
        { description: { [Op.like]: `%${search}%` } },
        { reportedBy: { [Op.like]: `%${search}%` } },
        { contact: { [Op.like]: `%${search}%` } },
      ];
    }

    // Filter conditions
    if (status) whereCondition.status = status;
    if (type) whereCondition.type = type;
    if (cameraId) whereCondition.cameraId = cameraId;

    // Filter by source (citizen vs camera)
    if (source === "citizen") {
      whereCondition.cameraId = null;
    } else if (source === "camera") {
      whereCondition.cameraId = { [Op.not]: null };
    }

    // Date range filter
    if (startDate || endDate) {
      whereCondition.createdAt = {};
      if (startDate) whereCondition.createdAt[Op.gte] = new Date(startDate);
      if (endDate) whereCondition.createdAt[Op.lte] = new Date(endDate);
    }

    // Pagination
    const pageNumber = Number.parseInt(page) || 1;
    const limitNumber = Number.parseInt(limit) || 10;
    const offset = (pageNumber - 1) * limitNumber;

    // Paranoid option for soft deleted records
    const paranoidOption = showDeleted === "true" ? false : true;

    // Sorting
    const validSortColumns = ["createdAt", "type", "status", "updatedAt"];
    const validSortOrders = ["asc", "desc"];

    let order = [["createdAt", "desc"]]; // Default sorting

    if (sortBy && validSortColumns.includes(sortBy.toLowerCase())) {
      const direction = validSortOrders.includes(sortOrder?.toLowerCase())
        ? sortOrder
        : "desc";
      order = [[sortBy, direction]];
    }

    const { count, rows } = await Incident.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: Camera,
          as: "camera",
          attributes: ["id", "name", "location", "status"],
          required: false, // LEFT JOIN
        },
        {
          model: User,
          as: "accepters",
          attributes: ["id", "firstname", "lastname", "email", "contact"],
          through: { attributes: ["acceptedAt"] },
          required: false, // LEFT JOIN
        },
        {
          model: User,
          as: "dismissers",
          attributes: ["id", "firstname", "lastname", "email", "contact"],
          through: { attributes: ["dismissedAt"] },
          required: false, // LEFT JOIN
        },
      ],
      paranoid: paranoidOption,
      offset,
      limit: limitNumber,
      order,
      distinct: true, // Important for correct count with associations
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Incidents retrieved successfully",
      totalIncidents: count,
      totalPages: Math.ceil(count / limitNumber),
      currentPage: pageNumber,
      data: rows,
    });
  } catch (error) {
    console.error("An error occurred: " + error);
    next(error);
  }
};

/**
 * Get incident by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getIncident = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) throw new BadRequestError("Incident ID is required");

    const incident = await Incident.findByPk(id, {
      include: [
        {
          model: Camera,
          as: "camera",
          attributes: ["id", "name", "location", "status", "ipAddress"],
          required: false, // LEFT JOIN
        },
        {
          model: User,
          as: "accepters",
          attributes: ["id", "firstname", "lastname", "email", "contact"],
          through: { attributes: ["acceptedAt"] },
        },
      ],
    });

    if (!incident) throw new NotFoundError("Incident not found");

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Incident found",
      data: incident,
    });
  } catch (error) {
    console.error("An error occurred: " + error);
    next(error);
  }
};

/**
 * Update incident
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const updateIncident = async (req, res, next) => {
  let transaction;

  try {
    transaction = await sequelize.transaction();

    const { id } = req.params;
    const {
      cameraId,
      reportedBy,
      contact,
      type,
      snapshotUrl,
      description,
      status,
      longitude,
      latitude,
    } = req.body;

    if (!id) throw new BadRequestError("Incident ID is required");

    if (
      cameraId === undefined &&
      !reportedBy &&
      !contact &&
      !type &&
      !snapshotUrl &&
      description === undefined &&
      !status &&
      !longitude &&
      !latitude
    ) {
      throw new BadRequestError("At least one field to update is required");
    }

    const incident = await Incident.findByPk(id);

    if (!incident) {
      throw new NotFoundError("Incident not found");
    }

    // Validate camera if provided
    if (cameraId) {
      const camera = await Camera.findByPk(cameraId);
      if (!camera) {
        throw new NotFoundError("Camera not found");
      }
    }

    // Validate incident type if provided
    if (type) {
      const validTypes = [
        "Fire",
        "Accident",
        "Medical",
        "Crime",
        "Flood",
        "Other",
      ];
      if (!validTypes.includes(type)) {
        throw new BadRequestError("Invalid incident type");
      }
    }

    // Validate status if provided
    if (status) {
      const validStatuses = [
        "pending",
        "verified",
        "accepted",
        "resolved",
        "dismissed",
      ];
      if (!validStatuses.includes(status)) {
        throw new BadRequestError("Invalid incident status");
      }
    }

    // Update incident with only provided fields
    const updateData = {};
    // Allow setting cameraId to null explicitly
    if (cameraId === null || cameraId) updateData.cameraId = cameraId;
    if (reportedBy) updateData.reportedBy = reportedBy;
    if (contact) updateData.contact = contact;
    if (type) updateData.type = type;
    if (snapshotUrl) updateData.snapshotUrl = snapshotUrl;
    if (description !== undefined) updateData.description = description;
    if (status) updateData.status = status;
    if (longitude) updateData.longitude = longitude;
    if (latitude) updateData.latitude = latitude;

    await incident.update(updateData, { transaction });

    await transaction.commit();
    transaction = null; // Set to null after commit to prevent double rollback

    // Fetch updated incident with associations
    const updatedIncident = await Incident.findByPk(id, {
      include: [
        {
          model: Camera,
          as: "camera",
          attributes: ["id", "name", "location", "status"],
          required: false,
        },
        {
          model: User,
          as: "accepters",
          attributes: ["id", "firstname", "lastname", "email"],
          through: { attributes: ["acceptedAt"] },
        },
      ],
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Incident updated successfully",
      data: updatedIncident,
    });
  } catch (error) {
    // Only roll back if transaction exists and hasn't been committed/rolled back
    if (transaction) await transaction.rollback();

    console.error("An error occurred: " + error);
    next(error);
  }
};

/**
 * Soft delete incident
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const softDeleteIncident = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) throw new BadRequestError("Incident ID is required");

    const incident = await Incident.findByPk(id);

    if (!incident) throw new NotFoundError("Incident not found");

    await incident.destroy(); // Soft delete since paranoid is true

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Incident has been soft deleted",
    });
  } catch (error) {
    console.error("An error occurred: " + error);
    next(error);
  }
};

/**
 * Restore soft deleted incident
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const restoreIncident = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) throw new BadRequestError("Incident ID is required");

    const incident = await Incident.findOne({ where: { id }, paranoid: false });

    if (!incident) throw new NotFoundError("Incident not found");

    await incident.restore(); // Restore soft deleted incident

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Incident has been restored",
    });
  } catch (error) {
    console.error("An error occurred: " + error);
    next(error);
  }
};

/**
 * Get deleted incidents
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getDeletedIncidents = async (req, res, next) => {
  try {
    const { search, status, type, cameraId, page, limit, sortBy, sortOrder } =
      req.query;

    const whereCondition = {
      deletedAt: { [Op.ne]: null }, // Fetch only soft-deleted incidents
    };

    // Search condition
    if (search) {
      whereCondition[Op.or] = [
        { description: { [Op.like]: `%${search}%` } },
        { reportedBy: { [Op.like]: `%${search}%` } },
        { contact: { [Op.like]: `%${search}%` } },
      ];
    }

    // Filter conditions
    if (status) whereCondition.status = status;
    if (type) whereCondition.type = type;
    if (cameraId) whereCondition.cameraId = cameraId;

    // Pagination
    const pageNumber = Number.parseInt(page) || 1;
    const limitNumber = Number.parseInt(limit) || 10;
    const offset = (pageNumber - 1) * limitNumber;

    // Sorting
    const validSortColumns = ["createdAt", "type", "status", "updatedAt"];
    const validSortOrders = ["asc", "desc"];

    let order = [["createdAt", "desc"]]; // Default sorting

    if (sortBy && validSortColumns.includes(sortBy.toLowerCase())) {
      const direction = validSortOrders.includes(sortOrder?.toLowerCase())
        ? sortOrder
        : "desc";
      order = [[sortBy, direction]];
    }

    // Modified to handle optional camera association
    const { count, rows } = await Incident.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: Camera,
          as: "camera",
          attributes: ["id", "name", "location", "status"],
          required: false, // Make this a LEFT JOIN instead of INNER JOIN
        },
      ],
      paranoid: false, // Include soft-deleted records
      offset,
      limit: limitNumber,
      order,
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Deleted incidents retrieved successfully",
      totalIncidents: count,
      totalPages: Math.ceil(count / limitNumber),
      currentPage: pageNumber,
      data: rows,
    });
  } catch (error) {
    console.error("An error occurred: " + error);
    next(error);
  }
};

/**
 * Accept an incident by a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const acceptIncident = async (req, res, next) => {
  let transaction;

  try {
    transaction = await sequelize.transaction();

    const { incidentId } = req.params;
    const { userId } = req.body;

    if (!incidentId || !userId)
      throw new BadRequestError("Incident ID and User ID are required");

    // Validate incident exists
    const incident = await Incident.findByPk(incidentId);
    if (!incident) {
      throw new NotFoundError("Incident not found");
    }

    // Validate user exists
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Check if already accepted
    const existingAcceptance = await IncidentAcceptance.findOne({
      where: {
        incidentId,
        userId,
      },
    });

    if (existingAcceptance) {
      throw new BadRequestError("Incident already accepted by this user");
    }

    // Create acceptance record
    await IncidentAcceptance.create(
      {
        incidentId,
        userId,
        acceptedAt: new Date(),
      },
      { transaction }
    );

    // Update incident status to accepted if not already
    if (incident.status === "pending" || incident.status === "verified") {
      await incident.update(
        {
          status: "accepted",
        },
        { transaction }
      );
    }

    await transaction.commit();
    transaction = null; // Set to null after commit to prevent double rollback

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Incident accepted successfully",
    });
  } catch (error) {
    // Only roll back if transaction exists and hasn't been committed/rolled back
    if (transaction) await transaction.rollback();

    console.error("An error occurred: " + error);
    next(error);
  }
};

/**
 * Resolve an incident
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const resolveIncident = async (req, res, next) => {
  let transaction;

  try {
    transaction = await sequelize.transaction();

    const { id } = req.params;
    const { resolutionNotes } = req.body;

    if (!id) throw new BadRequestError("Incident ID is required");

    const incident = await Incident.findByPk(id);

    if (!incident) {
      throw new NotFoundError("Incident not found");
    }

    // Update incident status to resolved
    await incident.update(
      {
        status: "resolved",
        description: resolutionNotes
          ? `${
              incident.description || ""
            }\n\nResolution Notes: ${resolutionNotes}`
          : incident.description,
      },
      { transaction }
    );

    await transaction.commit();
    transaction = null;

    // Fetch updated incident with associations
    const resolvedIncident = await Incident.findByPk(id, {
      include: [
        {
          model: Camera,
          as: "camera",
          attributes: ["id", "name", "location", "status"],
          required: false,
        },
        {
          model: User,
          as: "accepters",
          attributes: ["id", "firstname", "lastname", "email"],
          through: { attributes: ["acceptedAt"] },
        },
      ],
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Incident resolved successfully",
      data: resolvedIncident,
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("An error occurred: " + error);
    next(error);
  }
};

/**
 * Dismiss an incident for a specific user (per-user dismissal)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const dismissIncident = async (req, res, next) => {
  let transaction;

  try {
    transaction = await sequelize.transaction();

    const { incidentId } = req.params;
    const { userId, reason } = req.body;

    if (!incidentId || !userId)
      throw new BadRequestError("Incident ID and User ID are required");

    // Validate incident exists
    const incident = await Incident.findByPk(incidentId);
    if (!incident) {
      throw new NotFoundError("Incident not found");
    }

    // Validate user exists
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Check if already dismissed by this user
    const existingDismissal = await IncidentDismissal.findOne({
      where: {
        incidentId,
        userId,
      },
    });

    if (existingDismissal) {
      throw new BadRequestError("Incident already dismissed by this user");
    }

    // Create dismissal record
    await IncidentDismissal.create(
      {
        incidentId,
        userId,
        dismissedAt: new Date(),
        reason: reason || null,
      },
      { transaction }
    );

    await transaction.commit();
    transaction = null; // Set to null after commit to prevent double rollback

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Incident dismissed for this user successfully",
    });
  } catch (error) {
    // Only roll back if transaction exists and hasn't been committed/rolled back
    if (transaction) await transaction.rollback();

    console.error("An error occurred: " + error);
    next(error);
  }
};

/**
 * Globally dismiss an incident (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const globalDismissIncident = async (req, res, next) => {
  let transaction;

  try {
    transaction = await sequelize.transaction();

    const { id } = req.params;
    const { userId, reason } = req.body;

    if (!id) throw new BadRequestError("Incident ID is required");
    if (!reason) throw new BadRequestError("Reason for dismissal is required");

    // Validate incident exists
    const incident = await Incident.findByPk(id);
    if (!incident) {
      throw new NotFoundError("Incident not found");
    }

    // If userId is provided, validate user exists and record the dismissal
    if (userId) {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      // Check if user has admin privileges (this should be handled by middleware)
      // For now, we'll just create the dismissal record
      await IncidentDismissal.create(
        {
          incidentId: id,
          userId,
          dismissedAt: new Date(),
          reason,
        },
        { transaction }
      );
    }

    // Update incident status to dismissed
    await incident.update(
      {
        status: "dismissed",
        description: reason
          ? `${incident.description || ""}\n\nDismissal Reason: ${reason}`
          : incident.description,
      },
      { transaction }
    );

    await transaction.commit();
    transaction = null;

    // Fetch updated incident with associations
    const dismissedIncident = await Incident.findByPk(id, {
      include: [
        {
          model: Camera,
          as: "camera",
          attributes: ["id", "name", "location", "status"],
          required: false,
        },
        {
          model: User,
          as: "accepters",
          attributes: ["id", "firstname", "lastname", "email"],
          through: { attributes: ["acceptedAt"] },
        },
        {
          model: User,
          as: "dismissers",
          attributes: ["id", "firstname", "lastname", "email"],
          through: { attributes: ["dismissedAt", "reason"] },
        },
      ],
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Incident globally dismissed successfully",
      data: dismissedIncident,
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("An error occurred: " + error);
    next(error);
  }
};

/**
 * Get incidents dismissed by a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getDismissedIncidentsByUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page, limit } = req.query;

    if (!userId) throw new BadRequestError("User ID is required");

    // Validate user exists
    const user = await User.findByPk(userId);
    if (!user) throw new NotFoundError("User not found");

    // Pagination
    const pageNumber = Number.parseInt(page) || 1;
    const limitNumber = Number.parseInt(limit) || 10;
    const offset = (pageNumber - 1) * limitNumber;

    // Get incidents dismissed by this user
    const incidents = await User.findByPk(userId, {
      include: [
        {
          model: Incident,
          as: "dismissedIncidents",
          include: [
            {
              model: Camera,
              as: "camera",
              attributes: ["id", "name", "location", "status"],
              required: false,
            },
          ],
          through: { attributes: ["dismissedAt", "reason"] },
        },
      ],
      limit: limitNumber,
      offset,
    });

    if (!incidents || !incidents.dismissedIncidents) {
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "No dismissed incidents found for this user",
        data: [],
        count: 0,
      });
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "User dismissed incidents retrieved successfully",
      data: incidents.dismissedIncidents,
      count: incidents.dismissedIncidents.length,
    });
  } catch (error) {
    console.error("An error occurred: " + error);
    next(error);
  }
};

/**
 * Get users who dismissed an incident
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getUsersByDismissedIncident = async (req, res, next) => {
  try {
    const { incidentId } = req.params;

    if (!incidentId) throw new BadRequestError("Incident ID is required");

    // Validate incident exists
    const incident = await Incident.findByPk(incidentId);
    if (!incident) throw new NotFoundError("Incident not found");

    const users = await Incident.findByPk(incidentId, {
      include: [
        {
          model: User,
          as: "dismissers",
          attributes: [
            "id",
            "firstname",
            "lastname",
            "email",
            "contact",
            "role",
          ],
          through: { attributes: ["dismissedAt", "reason"] },
        },
      ],
    });

    if (!users || !users.dismissers) {
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "No users have dismissed this incident",
        data: [],
        count: 0,
      });
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Incident dismissers retrieved successfully",
      data: users.dismissers,
      count: users.dismissers.length,
    });
  } catch (error) {
    console.error("An error occurred: " + error);
    next(error);
  }
};

/**
 * Get incident statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getIncidentStats = async (req, res, next) => {
  try {
    // Count incidents by status
    const statusCounts = await Incident.findAll({
      attributes: [
        "status",
        [sequelize.fn("COUNT", sequelize.col("status")), "count"],
      ],
      group: ["status"],
    });

    // Count incidents by type
    const typeCounts = await Incident.findAll({
      attributes: [
        "type",
        [sequelize.fn("COUNT", sequelize.col("type")), "count"],
      ],
      group: ["type"],
    });

    // Get recent incidents - with limited associations to avoid issues
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
      ],
    });

    // Get count of incidents created in the last 24 hours
    const last24Hours = await Incident.count({
      where: {
        createdAt: {
          [Op.gte]: new Date(new Date() - 24 * 60 * 60 * 1000),
        },
      },
    });

    // Get count of incidents created in the last 7 days
    const last7Days = await Incident.count({
      where: {
        createdAt: {
          [Op.gte]: new Date(new Date() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    // Count incidents by source (camera vs user reported) using raw SQL with backticks for MariaDB
    const sourceStats = await sequelize.query(
      `
      SELECT 
        CASE WHEN \`cameraId\` IS NULL THEN 'user-reported' ELSE 'camera-detected' END as source,
        COUNT(*) as count
      FROM \`Incidents\`
      WHERE \`deletedAt\` IS NULL
      GROUP BY CASE WHEN \`cameraId\` IS NULL THEN 'user-reported' ELSE 'camera-detected' END
    `,
      { type: sequelize.QueryTypes.SELECT }
    );

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Incident statistics retrieved successfully",
      data: {
        byStatus: statusCounts,
        byType: typeCounts,
        bySource: sourceStats,
        recentIncidents,
        last24Hours,
        last7Days,
        total: await Incident.count(),
      },
    });
  } catch (error) {
    console.error("An error occurred: " + error);
    next(error);
  }
};

/**
 * Get incidents accepted by a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getIncidentsByUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page, limit } = req.query;

    if (!userId) throw new BadRequestError("User ID is required");

    // Validate user exists
    const user = await User.findByPk(userId);
    if (!user) throw new NotFoundError("User not found");

    // Pagination
    const pageNumber = Number.parseInt(page) || 1;
    const limitNumber = Number.parseInt(limit) || 10;
    const offset = (pageNumber - 1) * limitNumber;

    // Get incidents accepted by this user
    const incidents = await User.findByPk(userId, {
      include: [
        {
          model: Incident,
          as: "acceptedIncidents",
          include: [
            {
              model: Camera,
              as: "camera",
              attributes: ["id", "name", "location", "status"],
              required: false,
            },
          ],
          through: { attributes: ["acceptedAt"] },
        },
      ],
      limit: limitNumber,
      offset,
    });

    if (!incidents || !incidents.acceptedIncidents) {
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "No accepted incidents found for this user",
        data: [],
        count: 0,
      });
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "User accepted incidents retrieved successfully",
      data: incidents.acceptedIncidents,
      count: incidents.acceptedIncidents.length,
    });
  } catch (error) {
    console.error("An error occurred: " + error);
    next(error);
  }
};

/**
 * Get users who accepted an incident
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getUsersByIncident = async (req, res, next) => {
  try {
    const { incidentId } = req.params;

    if (!incidentId) throw new BadRequestError("Incident ID is required");

    // Validate incident exists
    const incident = await Incident.findByPk(incidentId);
    if (!incident) throw new NotFoundError("Incident not found");

    const users = await Incident.findByPk(incidentId, {
      include: [
        {
          model: User,
          as: "accepters",
          attributes: [
            "id",
            "firstname",
            "lastname",
            "email",
            "contact",
            "role",
          ],
          through: { attributes: ["acceptedAt"] },
        },
      ],
    });

    if (!users || !users.accepters) {
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "No users have accepted this incident",
        data: [],
        count: 0,
      });
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Incident accepters retrieved successfully",
      data: users.accepters,
      count: users.accepters.length,
    });
  } catch (error) {
    console.error("An error occurred: " + error);
    next(error);
  }
};

export {
  createIncident,
  createCitizenReport,
  createCameraDetection,
  getIncidents,
  getIncident,
  updateIncident,
  softDeleteIncident,
  restoreIncident,
  getDeletedIncidents,
  acceptIncident,
  resolveIncident,
  dismissIncident,
  globalDismissIncident,
  getIncidentsByUser,
  getUsersByIncident,
  getDismissedIncidentsByUser,
  getUsersByDismissedIncident,
  getIncidentStats,
};
