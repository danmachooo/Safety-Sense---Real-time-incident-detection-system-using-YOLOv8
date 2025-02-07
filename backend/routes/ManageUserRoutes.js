const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware'); 
const { getUser, getAllUsers } = require('../controllers/Users/ManageUser');
const adminMiddleware = require('../middlewares/adminMiddleware');

router.get('/get/:id', authMiddleware, adminMiddleware, getUser);
router.get('/get-all', authMiddleware, adminMiddleware, getAllUsers);

module.exports = router;