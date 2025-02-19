const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware'); 
const adminMiddleware = require('../middlewares/adminMiddleware');

const {changeUserRole, changeAccess} = require('../controllers/Users/authorization');

router.patch('/change-role/:id', changeUserRole);
router.patch('/change-access/:id', changeAccess);
module.exports = router;