const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware'); 
const adminMiddleware = require('../middlewares/adminMiddleware');

const {changeUserRole, changeAccess} = require('../controllers/Users/authorization');

router.patch('/change-role/:id', authMiddleware, adminMiddleware, changeUserRole); //ok
router.patch('/change-access/:id', authMiddleware, adminMiddleware, changeAccess); //ok
module.exports = router;