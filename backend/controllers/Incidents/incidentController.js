import { Op } from "sequelize"; // Import models from the index file to ensure associations are loaded
import models from "../../models/index.js";
const { Incident, Camera, User, IncidentAcceptance, IncidentDismissal } =
  models;

import { BadRequestError, NotFoundError } from "../../utils/Error.js";
import { StatusCodes } from "http-status-codes";
import sequelize from "../../config/database.js";
import { sendTopicNotification } from "../../services/firebase/fcmService.js";

import xlsx from "xlsx";
import path from "path";
import { fileURLToPath } from "url";
import { getFileUrl, getFilePath } from "../../config/multer.js";
import supabase from "../../config/supabase/supabase.js";

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
 * Create citizen report with file upload in one step
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const createCitizenReport = async (req, res, next) => {
  console.log("Running citizen report");
  let transaction;

  try {
    transaction = await sequelize.transaction();

    // Log what we received
    console.log("Request body:", req.body);
    console.log("Request file:", req.file ? "Present" : "None");
    console.log("Upload error:", req.uploadError?.message || "None");

    // Extract data from form fields or JSON body
    const {
      reportedBy,
      contact,
      type,
      description,
      longitude,
      latitude,
      snapshotUrl,
    } = req.body;

    // Get IP address from request
    const ipAddress =
      req.ip ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      "unknown";

    console.debug("Extracted fields:", {
      type,
      description,
      longitude,
      latitude,
      ipAddress,
      reportedBy,
      contact,
      snapshotUrl, // Log the snapshotUrl from request body
    });

    // Handle image upload - SIMPLIFIED
    let finalSnapshotUrl = null;
    const warnings = [];

    // Priority 1: Check if snapshotUrl was provided in request body
    if (snapshotUrl && snapshotUrl.trim() !== "") {
      // Image was already uploaded, just use the path as-is
      finalSnapshotUrl = snapshotUrl;
      console.log("Image path from request body:", finalSnapshotUrl);
    }
    // Priority 2: Check if file was uploaded through multer middleware
    else if (req.file && req.file.supabasePath && !req.uploadError) {
      finalSnapshotUrl = req.file.supabasePath;
      console.log("Image uploaded via middleware:", finalSnapshotUrl);
    }
    // Priority 3: Handle upload errors
    else if (req.file && req.uploadError) {
      console.warn("Image upload failed:", req.uploadError.message);
      warnings.push(`Image upload failed: ${req.uploadError.message}`);
    } else {
      console.log("No image file provided - proceeding without image");
    }

    // Validate required fields
    const missingFields = [];
    if (!type) missingFields.push("type");
    if (!description) missingFields.push("description");
    if (!longitude) missingFields.push("longitude");
    if (!latitude) missingFields.push("latitude");

    if (missingFields.length > 0) {
      throw new BadRequestError(
        `Required fields are missing: ${missingFields.join(", ")}`
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
      throw new BadRequestError(
        `Invalid incident type. Must be one of: ${validTypes.join(", ")}`
      );
    }

    // Validate and parse coordinates
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      throw new BadRequestError("Invalid latitude. Must be between -90 and 90");
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      throw new BadRequestError(
        "Invalid longitude. Must be between -180 and 180"
      );
    }

    // Create incident record
    const incidentData = {
      cameraId: null,
      reportedBy: reportedBy || "Anonymous Citizen",
      contact: contact || "No contact provided",
      type,
      snapshotUrl: finalSnapshotUrl, // Use the processed snapshot URL
      description,
      longitude: lng,
      latitude: lat,
      ipAddress,
      status: "pending",
    };

    console.log("Creating incident with data:", incidentData);

    const incident = await Incident.create(incidentData, { transaction });

    // Send push notification to responders
    try {
      const shortDescription =
        incident.description.length > 100
          ? `${incident.description.substring(0, 100)}...`
          : incident.description;

      const notificationTitle = `${type} Incident Alert!`;
      const notificationBody = `${shortDescription} - Reported by: ${incident.reportedBy}`;

      console.log("Broadcasting notification to:", process.env.RESPONDER_TOPIC);

      await sendTopicNotification(
        process.env.RESPONDER_TOPIC || "all_responders",
        notificationTitle,
        notificationBody,
        {
          incidentId: incident.id.toString(),
          type: incident.type,
          latitude: incident.latitude.toString(),
          longitude: incident.longitude.toString(),
          hasImage: !!incident.snapshotUrl,
        }
      );

      console.log("Notification sent successfully");
    } catch (notificationError) {
      console.error("FCM notification failed:", notificationError);
      warnings.push("Notification to responders failed");
      // Don't fail the request if notification fails
    }

    await transaction.commit();
    transaction = null;

    // Success response
    const responseMessage =
      warnings.length > 0
        ? "Citizen report created successfully with warnings"
        : "Citizen report created successfully";

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: responseMessage,
      data: {
        id: incident.id,
        type: incident.type,
        description: incident.description,
        latitude: incident.latitude,
        longitude: incident.longitude,
        reportedBy: incident.reportedBy,
        contact: incident.contact,
        snapshotUrl: incident.snapshotUrl,
        status: incident.status,
        createdAt: incident.createdAt,
        hasImage: !!incident.snapshotUrl,
      },
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (error) {
    // Rollback transaction if it exists
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error("Transaction rollback failed:", rollbackError);
      }
    }

    console.error("Error creating citizen report:", error);
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

    if (search) {
      whereCondition[Op.or] = [
        { description: { [Op.like]: `%${search}%` } },
        { reportedBy: { [Op.like]: `%${search}%` } },
        { contact: { [Op.like]: `%${search}%` } },
      ];
    }

    if (status) whereCondition.status = status;
    if (type) whereCondition.type = type;
    if (cameraId) whereCondition.cameraId = cameraId;

    if (source === "citizen") {
      whereCondition.cameraId = null;
    } else if (source === "camera") {
      whereCondition.cameraId = { [Op.not]: null };
    }

    if (startDate || endDate) {
      whereCondition.createdAt = {};
      if (startDate) whereCondition.createdAt[Op.gte] = new Date(startDate);
      if (endDate) whereCondition.createdAt[Op.lte] = new Date(endDate);
    }

    const pageNumber = Number.parseInt(page) || 1;
    const limitNumber = Number.parseInt(limit) || 10;
    const offset = (pageNumber - 1) * limitNumber;

    const paranoidOption = showDeleted === "true" ? false : true;

    const validSortColumns = ["createdAt", "type", "status", "updatedAt"];
    const validSortOrders = ["asc", "desc"];

    let order = [["createdAt", "desc"]];

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
          required: false,
        },
        {
          model: User,
          as: "accepters",
          attributes: ["id", "firstname", "lastname", "email", "contact"],
          through: { attributes: ["acceptedAt"] },
          required: false,
        },
        {
          model: User,
          as: "dismissers",
          attributes: ["id", "firstname", "lastname", "email", "contact"],
          through: { attributes: ["dismissedAt"] },
          required: false,
        },
      ],
      paranoid: paranoidOption,
      offset,
      limit: limitNumber,
      order,
      distinct: true,
    });

    // Generate signed URLs for snapshot paths
    const dataWithSignedUrls = await Promise.all(
      rows.map(async (incident) => {
        if (incident.snapshotUrl) {
          const { data: signed, error } = await supabase.storage
            .from("uploads") // your bucket name
            .createSignedUrl(incident.snapshotUrl, 3600); // 1 hour expiry

          if (!error && signed?.signedUrl) {
            incident.dataValues.snapshotSignedUrl = signed.signedUrl;
          }
        }
        return incident;
      })
    );

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Incidents retrieved successfully",
      totalIncidents: count,
      totalPages: Math.ceil(count / limitNumber),
      currentPage: pageNumber,
      data: dataWithSignedUrls,
    });
  } catch (error) {
    console.error("An error occurred: " + error);
    next(error);
  }
};

const getIncidentsForHeatmap = async (req, res, next) => {
  try {
    const { filter, startDate, endDate, type } = req.query;

    const where = {};

    // 🔎 Date filtering logic
    if (filter === "last7days") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      where.createdAt = { [Op.gte]: sevenDaysAgo };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    // 🎯 Incident type filter
    if (type) {
      where.type = type.toLowerCase();
    }

    // 📥 Query incidents (only what's needed)
    const incidents = await Incident.findAll({
      where,
      attributes: ["latitude", "longitude", "type"],
      raw: true,
    });

    // 📊 Intensity weights by type
    const TYPE_INTENSITY = {
      fire: 5,
      medical: 4,
      accident: 3,
      crime: 4,
      flood: 3,
      other: 1,
    };

    const coordMap = {};
    const round = (val, precision = 4) => Number(val).toFixed(precision); // ~10m accuracy

    for (const { latitude, longitude, type } of incidents) {
      if (!latitude || !longitude) continue;

      const lat = round(latitude);
      const lon = round(longitude);
      const key = `${lat},${lon}`;

      const normalizedType = type?.toLowerCase() || "other";
      const intensity = TYPE_INTENSITY[normalizedType] || TYPE_INTENSITY.other;

      coordMap[key] = (coordMap[key] || 0) + intensity;
    }

    // 🔄 Transform to frontend-friendly format
    const heatmapData = Object.entries(coordMap).map(([key, intensity]) => {
      const [lat, lon] = key.split(",").map(Number);
      return [lat, lon, intensity];
    });

    // 🧪 Optional debugging log
    console.log(`Heatmap response: ${heatmapData.length} bubbles`);

    return res.status(StatusCodes.OK).json({
      success: true,
      data: heatmapData,
    });
  } catch (error) {
    console.error("Heatmap Error:", error.message);
    return next(error);
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

const generateEmptyTemplate = async (req, res, next) => {
  try {
    const headers = [
      "name",
      "description",
      "category",
      "type",
      "quantity_in_stock",
      "unit_price",
      "min_stock_level",
      "reorder_level",
      "unit_of_measure",
      "condition",
      "location",
      "is_deployable",
      "supplier",
      "funding_source",
      "batch_notes",
      "notes",
    ];

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.aoa_to_sheet([headers]);

    worksheet["!cols"] = headers.map(() => ({ wch: 20 }));

    xlsx.utils.book_append_sheet(workbook, worksheet, "Inventory Template");

    const buffer = xlsx.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="inventory_template_empty.xlsx"'
    );

    res.status(StatusCodes.OK).send(buffer);
  } catch (error) {
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
  generateEmptyTemplate,
  getIncidentsForHeatmap,
};
