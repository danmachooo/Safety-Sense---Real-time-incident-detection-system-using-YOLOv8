const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware'); 
const adminMiddleware = require('../middlewares/adminMiddleware');

const { loginUser, registerUser, verifyEmail, resetPassword, requestPasswordReset } = require('../controllers/Users/authentication');

router.post('/login', loginUser); //ok
router.post('/register', registerUser); //ok
router.get('/verify-email', verifyEmail); //ok
router.post('/request-password-reset', requestPasswordReset); //ok
router.post('/reset-password', resetPassword); //ok

module.exports = router;