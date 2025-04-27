const express = require("express");
const router = express.Router();
const {
  sendTopicNotification,
  notifyAllResponders,
} = require("../controllers/Notification/fcmController");

router.post("/send", sendTopicNotification);
router.post("/notify-all-responders", notifyAllResponders);

module.exports = router;
