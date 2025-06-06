import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import adminMiddleware from "../middlewares/adminMiddleware.js";
import loginRateLimiter from "../middlewares/loginRateLimiter.js";

const router = express.Router();
import {
  getNotifications,
  markNotificationAsRead,
  getUnreadCount,
} from "../controllers/Notification/Notification.js";

router.get("/notifications", authMiddleware, adminMiddleware, getNotifications); //ok
router.get(
  "/notifications/unread-count",
  authMiddleware,
  adminMiddleware,
  getUnreadCount
); //ok
router.patch(
  "/notifications/mark-as-read/:id",
  authMiddleware,
  adminMiddleware,
  markNotificationAsRead
); //ok

export default router;
