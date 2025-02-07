const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware'); 
const adminMiddleware = require('../middlewares/adminMiddleware');

const changeUserRole = require('../controllers/Users/authorization');

router.post('/change-role/:id', authMiddleware, adminMiddleware, changeUserRole);

module.exports = router;