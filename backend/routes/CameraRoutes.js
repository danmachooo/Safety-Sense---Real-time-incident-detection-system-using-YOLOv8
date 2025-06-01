import {
  registerCamera,
  updateCamera,
  deleteCamera,
  getCameras,
  getCamera,
  restoreCamera,
  getDeletedCameras,
} from "../controllers/Camera/cameraController.js";

import {
  checkAllCameraStatus,
  checkAndAlertOfflineCameras,
  getHealthHistory,
} from "../controllers/Camera/cameraHealthController.js";

import {
  getCameraLogs,
  getAllLogs,
} from "../controllers/Camera/cameraLogController.js";

import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import adminMiddleware from "../middlewares/adminMiddleware.js";
import loginRateLimiter from "../middlewares/loginRateLimiter.js";

const router = express.Router();

router.post("/register", authMiddleware, adminMiddleware, registerCamera); //ok
router.get("/get/:id", authMiddleware, adminMiddleware, getCamera); //ok
router.get("/get-all", authMiddleware, adminMiddleware, getCameras); //ok
router.put("/update/:id", authMiddleware, adminMiddleware, updateCamera); //ok
router.delete("/delete/:id", authMiddleware, adminMiddleware, deleteCamera); //ok
router.get("/get-deleted", authMiddleware, adminMiddleware, getDeletedCameras); //ok
router.patch("/restore/:id", authMiddleware, adminMiddleware, restoreCamera); //ok

router.get(
  "/check-status",
  authMiddleware,
  adminMiddleware,
  checkAllCameraStatus
);
router.get(
  "/check-alert-offline-cameras",
  authMiddleware,
  adminMiddleware,
  checkAndAlertOfflineCameras
);
router.get(
  "/get-health-history",
  authMiddleware,
  adminMiddleware,
  getHealthHistory
);

router.get("/camera-logs/:id", authMiddleware, adminMiddleware, getCameraLogs);
router.get("/camera-logs", authMiddleware, adminMiddleware, getAllLogs);

export default router;
