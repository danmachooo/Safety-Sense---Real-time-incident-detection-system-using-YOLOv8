const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware'); 
const adminMiddleware = require('../middlewares/adminMiddleware');

const { loginUser, registerUser } = require('../controllers/Users/authentication');

router.post('/login', loginUser);
router.post('/register', authMiddleware, adminMiddleware, registerUser);

module.exports = router;