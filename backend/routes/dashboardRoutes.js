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
router.get("/incidents", authMiddleware, getIncidentStats);
router.get("/inventory", getInventoryStats);
router.get("/deployments", authMiddleware, getDeploymentStats);
router.get("/users", authMiddleware, getUserActivityStats);
router.get("/activity", authMiddleware, getActivityFeed);
router.get("/map", authMiddleware, getMapData);

export default router;
