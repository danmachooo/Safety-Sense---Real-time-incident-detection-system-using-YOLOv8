const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");
const loginRateLimiter = require("../middlewares/loginRateLimiter");

const {
  loginUser,
  logoutUser,
  registerUser,
  verifyEmail,
  resetPassword,
  requestPasswordReset,
  changePassword,
  updateFcmToken,

  refreshAccessToken,
} = require("../controllers/Users/authentication");
const { getLoginHistory } = require("../controllers/Users/LoginHistory");

router.post("/login", loginRateLimiter, loginUser); //ok
router.patch("/update-fcm-token", authMiddleware, updateFcmToken);
router.post("/logout", authMiddleware, logoutUser); //ok
router.get("/login-history", authMiddleware, getLoginHistory); //ok
router.post("/register", registerUser); //ok
router.get("/verify-email", authMiddleware, verifyEmail); //ok
router.post("/request-password-reset", authMiddleware, requestPasswordReset); //ok
router.post("/reset-password", authMiddleware, resetPassword); //ok
router.patch("/change-password", authMiddleware, changePassword); //ok
router.post("/refresh", refreshAccessToken);
module.exports = router;
