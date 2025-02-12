const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware'); 
const adminMiddleware = require('../middlewares/adminMiddleware');

const { loginUser, registerUser, verifyEmail, resetPassword, requestPasswordReset } = require('../controllers/Users/authentication');

router.post('/login', loginUser);
router.post('/register', registerUser);
router.get('/verify-email', verifyEmail);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);

module.exports = router;