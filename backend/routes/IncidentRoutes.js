import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import adminMiddleware from "../middlewares/adminMiddleware.js";
import loginRateLimiter from "../middlewares/loginRateLimiter.js";

const router = express.Router();

import {
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
  getIncidentStats,
  getIncidentsForHeatmap,
} from "../controllers/Incidents/incidentController.js";
import { uploadSingle } from "../config/multer.js";
import { uploadIncidentImage } from "../controllers/Incidents/uploadController.js";
import cameraAuthMiddleware from "../middlewares/cameraAuthMiddleware.js";
import checkIpStatusMiddleware from "../middlewares/checkIPStatusMiddleware.js";
import { penalizeReporter } from "../controllers/Incidents/penalizeReporterController.js";
// Get all incidents with filtering
router.get("/", getIncidents);

// Get all incidents with filtering for heatmap
router.get("/heatmap", getIncidentsForHeatmap);

// Get incident statistics
router.get("/stats", authMiddleware, getIncidentStats);

// Get deleted incidents - admin only
router.get("/deleted", authMiddleware, adminMiddleware, getDeletedIncidents);

// Get specific incident by ID
router.get("/:id", authMiddleware, getIncident);

// Get users who accepted an incident
router.get("/:incidentId/users", authMiddleware, getUsersByIncident);

// Get users who dismissed an incident
router.get(
  "/:incidentId/dismissers",
  authMiddleware,
  getDismissedIncidentsByUser
);

// Get incidents accepted by a user
router.get("/user/:userId", authMiddleware, getIncidentsByUser);

// Get incidents dismissed by a user
router.get(
  "/user/:userId/dismissed",
  authMiddleware,
  getDismissedIncidentsByUser
);

// Create new incident (general purpose) - kept for backward compatibility
router.post("/", createIncident);

// Create new incident
router.post("/citizen", checkIpStatusMiddleware, createCitizenReport);
router.post("/ai", cameraAuthMiddleware, createCameraDetection);
router.post(
  "/upload-image",
  checkIpStatusMiddleware,
  uploadSingle,
  uploadIncidentImage
);

// Accept an incident
router.post("/:incidentId/accept", authMiddleware, acceptIncident);

// Dismiss an incident for a specific user
router.post("/:incidentId/dismiss", authMiddleware, dismissIncident);

// Globally dismiss an incident - admin only
router.post(
  "/:id/global-dismiss",
  authMiddleware,
  adminMiddleware,
  globalDismissIncident
);

router.post(
  "/penalize-reporter",
  authMiddleware,
  adminMiddleware,
  penalizeReporter
);

// Resolve an incident
router.put("/:id/resolve", authMiddleware, resolveIncident);

// Update incident - admin only
router.put("/:id", authMiddleware, adminMiddleware, updateIncident);

// Restore soft deleted incident - admin only
router.put("/:id/restore", authMiddleware, adminMiddleware, restoreIncident);

// Delete incident (soft delete) - admin only
router.delete("/:id", authMiddleware, adminMiddleware, softDeleteIncident);

export default router;
