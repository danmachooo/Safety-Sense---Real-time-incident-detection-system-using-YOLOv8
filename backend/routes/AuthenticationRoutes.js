const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware'); 
const adminMiddleware = require('../middlewares/adminMiddleware');

const { loginUser, logoutUser, registerUser, verifyEmail, resetPassword, requestPasswordReset, changePassword } = require('../controllers/Users/authentication');
const { getLoginHistory } = require('../controllers/Users/LoginHistory');

router.post('/login', loginUser); //ok
router.get('/logout', authMiddleware, logoutUser); //ok
router.get('/login-history', authMiddleware, getLoginHistory); //ok
router.post('/register', registerUser); //ok
router.get('/verify-email', authMiddleware, verifyEmail); //ok
router.post('/request-password-reset', authMiddleware, requestPasswordReset); //ok
router.post('/reset-password', authMiddleware,resetPassword); //ok
router.patch('/change-password', authMiddleware,changePassword); //ok

module.exports = router;