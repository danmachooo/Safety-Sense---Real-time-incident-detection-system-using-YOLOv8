const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware'); 
const adminMiddleware = require('../middlewares/adminMiddleware');
const {getNotifications, markNotificationAsRead, getUnreadCount} = require('../controllers/Notification/Notification')

router.get('/notifications',authMiddleware, adminMiddleware, getNotifications); //ok
router.get('/notifications/unread-count',authMiddleware, adminMiddleware, getUnreadCount); //ok
router.patch('/notifications/mark-as-read/:id',authMiddleware, adminMiddleware, markNotificationAsRead); //ok


module.exports = router;