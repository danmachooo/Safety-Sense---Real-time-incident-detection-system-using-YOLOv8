import express from "express";
import {
  generateInventorySummaryReport,
  generateItemDeploymentReport,
  generateBatchAdditionsReport,
  generateStockMovementReport,
  generateIncidentSummaryReport,
  generateTopLocationsByIncidentsReport,
  generateResolvedVsUnresolvedReport,
  generateResponderPerformanceReport,
  generateCombinedReport,
} from "../controllers/reportController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import adminMiddleware from "../middlewares/adminMiddleware.js";

const router = express.Router();

// Inventory Reports
router.get(
  "/inventory/summary",
  authMiddleware,
  adminMiddleware,
  generateInventorySummaryReport
);
router.get(
  "/inventory/deployments",
  authMiddleware,
  adminMiddleware,
  generateItemDeploymentReport
);
router.get(
  "/inventory/batch-additions",
  authMiddleware,
  adminMiddleware,
  generateBatchAdditionsReport
);
router.get(
  "/inventory/stock-movements",
  authMiddleware,
  adminMiddleware,
  generateStockMovementReport
);

// Incident Reports
router.get(
  "/incidents/summary",
  authMiddleware,
  adminMiddleware,
  generateIncidentSummaryReport
);
router.get(
  "/incidents/top-locations",
  authMiddleware,
  adminMiddleware,
  generateTopLocationsByIncidentsReport
);
router.get(
  "/incidents/resolved-vs-unresolved",
  authMiddleware,
  adminMiddleware,
  generateResolvedVsUnresolvedReport
);
router.get(
  "/incidents/responder-performance",
  authMiddleware,
  adminMiddleware,
  generateResponderPerformanceReport
);

// Combined Reports
router.get("/combined", generateCombinedReport);

export default router;
