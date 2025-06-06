import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import adminMiddleware from "../middlewares/adminMiddleware.js";
import loginRateLimiter from "../middlewares/loginRateLimiter.js";

const router = express.Router();
import {
  getUser,
  getUsers,
  updateUser,
  softDeleteUser,
  restoreUser,
  getDeletedUsers,
  createUser,
} from "../controllers/Users/ManageUser.js";

router.post("/create", authMiddleware, createUser); //ok
router.get("/get/:id", authMiddleware, getUser); //ok
router.get("/get-all", authMiddleware, adminMiddleware, getUsers); //ok
router.get("/get-deleted", authMiddleware, adminMiddleware, getDeletedUsers); //not yet
router.put("/update/:id", authMiddleware, updateUser); // ok
router.delete(
  "/soft-delete/:id",
  authMiddleware,
  adminMiddleware,
  softDeleteUser
); // not yet
router.patch("/restore/:id", authMiddleware, adminMiddleware, restoreUser); // not yet
// router.get('/search', authMiddleware, adminMiddleware, searchUsers);

export default router;
