const express = require("express")
const router = express.Router()
const authMiddleware = require("../middlewares/authMiddleware")
const adminMiddleware = require("../middlewares/adminMiddleware")

const {
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
  getIncidentsByUser,
  getUsersByIncident,
  getIncidentStats,
} = require("../controllers/Incidents/incidentController")

// Get all incidents with filtering
router.get("/", authMiddleware, getIncidents)

// Get incident statistics
router.get("/stats", authMiddleware, getIncidentStats)

// Get deleted incidents - admin only
router.get("/deleted", authMiddleware, adminMiddleware, getDeletedIncidents)

// Get specific incident by ID
router.get("/:id", authMiddleware, getIncident)

// Get users who accepted an incident
router.get("/:incidentId/users", authMiddleware, getUsersByIncident)

// Get incidents accepted by a user
router.get("/user/:userId", authMiddleware, getIncidentsByUser)

// Create new incident (general purpose) - kept for backward compatibility
router.post("/", createIncident)

// Create new incident from citizen report - public endpoint, no auth required
router.post("/citizen-report", createCitizenReport)

// Create new incident from camera detection - requires authentication
router.post("/camera-detection", authMiddleware, createCameraDetection)

// Accept an incident
router.post("/:incidentId/accept", authMiddleware, acceptIncident)
// Resolve an incident
router.put("/:id/resolve", authMiddleware, resolveIncident)
// Update incident - admin only
router.put("/:id", authMiddleware, adminMiddleware, updateIncident)

// Restore soft deleted incident - admin only
router.put("/:id/restore", authMiddleware, adminMiddleware, restoreIncident)

// Delete incident (soft delete) - admin only
router.delete("/:id", authMiddleware, adminMiddleware, softDeleteIncident)

module.exports = router