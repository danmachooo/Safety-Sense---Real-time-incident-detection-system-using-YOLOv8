import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import adminMiddleware from "../middlewares/adminMiddleware.js";
import loginRateLimiter from "../middlewares/loginRateLimiter.js";

const router = express.Router();

import {
  getDashboardSummary,
  getIncidentStats,
  getInventoryStats,
  getDeploymentStats,
  getUserActivityStats,
  getActivityFeed,
  getMapData,
} from "../controllers/DashboardController.js";

router.get("/summary", getDashboardSummary);
router.get("/incidents", getIncidentStats);
router.get("/inventory", getInventoryStats);
router.get("/deployments", getDeploymentStats);
router.get("/users", getUserActivityStats);
router.get("/activity", getActivityFeed);
router.get("/map", getMapData);

export default router;
