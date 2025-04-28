const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

const {
  getDashboardSummary,
  getIncidentStats,
  getInventoryStats,
  getDeploymentStats,
  getUserActivityStats,
  getActivityFeed,
  getMapData,
} = require("../controllers/DashboardController");

router.get("/summary", getDashboardSummary);
router.get("/incidents", getIncidentStats);
router.get("/inventory", getInventoryStats);
router.get("/deployments", getDeploymentStats);
router.get("/users", getUserActivityStats);
router.get("/activity", getActivityFeed);
router.get("/map", getMapData);

module.exports = router;
