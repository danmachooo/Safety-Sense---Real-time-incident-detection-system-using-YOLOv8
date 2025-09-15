import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import adminMiddleware from "../middlewares/adminMiddleware.js";
import loginRateLimiter from "../middlewares/loginRateLimiter.js";

const router = express.Router();

import {
  changeUserRole,
  changeAccess,
} from "../controllers/Users/authorization.js";

router.patch(
  "/change-role/:id",

  changeUserRole
); //ok
router.patch(
  "/change-access/:id",
  authMiddleware,
  adminMiddleware,
  changeAccess
); //ok
export default router;
