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

const router = express.Router();

// Inventory Reports
router.get("/inventory/summary", generateInventorySummaryReport);
router.get("/inventory/deployments", generateItemDeploymentReport);
router.get("/inventory/batch-additions", generateBatchAdditionsReport);
router.get("/inventory/stock-movements", generateStockMovementReport);

// Incident Reports
router.get("/incidents/summary", generateIncidentSummaryReport);
router.get("/incidents/top-locations", generateTopLocationsByIncidentsReport);
router.get(
  "/incidents/resolved-vs-unresolved",
  generateResolvedVsUnresolvedReport
);
router.get(
  "/incidents/responder-performance",
  generateResponderPerformanceReport
);

// Combined Reports
router.get("/combined", generateCombinedReport);

export default router;
