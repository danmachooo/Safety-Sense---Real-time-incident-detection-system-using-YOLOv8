import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import adminMiddleware from "../middlewares/adminMiddleware.js";
import loginRateLimiter from "../middlewares/loginRateLimiter.js";

const router = express.Router();

import {
  createBatch,
  getAllBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
  restoreBatch,
  getExpiringBatches,
} from "../controllers/Inventory/batchController.js";

import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  restoreCategory,
} from "../controllers/Inventory/CategoryController.js";

import {
  createDeployment,
  getAllDeployments,
  getDeploymentById,
  updateDeploymentStatus,
  getOverdueDeployments,
} from "../controllers/Inventory/deploymentController.js";

import {
  createItem,
  getAllItems,
  getItemById,
  updateItem,
  deleteItem,
  restoreItem,
} from "../controllers/Inventory/inventoryitemController.js";

import {
  getAllNotifications,
  getUnreadNotifications,
  markAsSeen,
  markAllAsSeen,
  deleteNotification,
  restoreNotification,
} from "../controllers/Inventory/notificationController.js";

//Categories
router.get("/categories", authMiddleware, adminMiddleware, getAllCategories);
router.get("/categories/:id", authMiddleware, adminMiddleware, getCategoryById);
router.post("/categories", authMiddleware, adminMiddleware, createCategory);
router.put("/categories/:id", authMiddleware, adminMiddleware, updateCategory);
router.delete(
  "/categories/:id",
  authMiddleware,
  adminMiddleware,
  deleteCategory
);
router.patch(
  "/categories/:id",
  authMiddleware,
  adminMiddleware,
  restoreCategory
);

//Inventory Item
router.get("/items", authMiddleware, adminMiddleware, getAllItems);
router.get("/items/:id", authMiddleware, adminMiddleware, getItemById);
router.post("/items", authMiddleware, adminMiddleware, createItem);
router.put("/items/:id", authMiddleware, adminMiddleware, updateItem);
router.delete("/items/:id", authMiddleware, adminMiddleware, deleteItem);
router.patch("/items/:id", authMiddleware, adminMiddleware, restoreItem);

//Batches
router.get("/batches", authMiddleware, adminMiddleware, getAllBatches);
router.get(
  "/batches/expiring",
  authMiddleware,
  adminMiddleware,
  getExpiringBatches
);
router.get("/batches/:id", authMiddleware, adminMiddleware, getBatchById);
router.post("/batches", authMiddleware, adminMiddleware, createBatch);
router.put("/batches/:id", authMiddleware, adminMiddleware, updateBatch);
router.delete("/batches/:id", authMiddleware, adminMiddleware, deleteBatch);
router.patch("/batches/:id", authMiddleware, adminMiddleware, restoreBatch);

//Deployments
router.get("/deployment", authMiddleware, adminMiddleware, getAllDeployments);
router.get(
  "/deployment/overdue",
  authMiddleware,
  adminMiddleware,
  getOverdueDeployments
);
router.get(
  "/deployment/:id",
  authMiddleware,
  adminMiddleware,
  getDeploymentById
);
router.post("/deployment", authMiddleware, adminMiddleware, createDeployment);
router.put(
  "/deployment/:id/status",
  authMiddleware,
  adminMiddleware,
  updateDeploymentStatus
);

//Notifications
router.get(
  "/notifications",
  authMiddleware,
  adminMiddleware,
  getAllNotifications
);
router.get(
  "/notifications/unread",
  authMiddleware,
  adminMiddleware,
  getUnreadNotifications
);
router.put(
  "/notifications/:id/seen",
  authMiddleware,
  adminMiddleware,
  markAsSeen
);
router.put(
  "/notifications/mark-all",
  authMiddleware,
  adminMiddleware,
  markAllAsSeen
);
router.delete(
  "/notifications/:id",
  authMiddleware,
  adminMiddleware,
  deleteNotification
);
router.patch(
  "/notifications/:id",
  authMiddleware,
  adminMiddleware,
  restoreNotification
);

export default router;
