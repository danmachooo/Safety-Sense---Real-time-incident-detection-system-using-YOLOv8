import {
  _sendTopicNotification,
  notifyAllResponders,
} from "../controllers/Notification/fcmController.js";

import express from "express";

const router = express.Router();

router.post("/send", _sendTopicNotification);
router.post("/notify-all-responders", notifyAllResponders);

export default router;
