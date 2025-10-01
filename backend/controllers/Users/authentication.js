import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
} from "../../utils/Error.js";
import models from "../../models/index.js";
const { User } = models;
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../../services/emailService.js";
import { Op } from "sequelize";
import { StatusCodes } from "http-status-codes";
import { logUserLogin, logUserLogout } from "./LoginHistory.js";
import { logUserCreation } from "../Notification/Notification.js";
import { STATUS_CODES } from "http";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = process.env.JWT_EXPIRES_IN;
const REFRESH_SECRET = process.env.REFRESH_SECRET;
const REFRESH_EXPIRATION = process.env.REFRESH_EXPIRES_IN;
const DOMAIN = process.env.DOMAIN || ".safetysense.team";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

const loginUser = async (req, res, next) => {
  try {
    const { email, password, fcmToken, loginSource } = req.body;

    if (!email || !password || !loginSource) {
      throw new BadRequestError(
        "Email, password, and login source are required"
      );
    }

    const user = await User.findOne({ where: { email } });
    if (!user || user.isSoftDeleted())
      throw new NotFoundError("Invalid credentials");
    if (user.isBlocked) throw new ForbiddenError("User is blocked");
    if (!user.isVerified) throw new ForbiddenError("User not verified");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new NotFoundError("Invalid credentials");

    // Role-source validation
    if (loginSource === "web" && user.role !== "admin") {
      throw new ForbiddenError("Only admins can log in from the web.");
    }
    if (loginSource === "app" && user.role !== "rescuer") {
      throw new ForbiddenError("Only rescuers can log in from the app.");
    }

    // Tokens
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION || "15m" }
    );

    const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, {
      expiresIn: REFRESH_EXPIRATION || "7d",
    });

    await user.update({ refreshToken, fcmToken });
    await logUserLogin(user.id);

    const sanitizedUser = {
      id: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
      contact: user.contact,
      createdAt: user.createdAt,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    };

    if (loginSource === "app") {
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "You are logged in (Mobile App)!",
        data: {
          access: accessToken,
          refresh: refreshToken,
          user: sanitizedUser,
        },
      });
    } else {
      // Set cookies
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        domain: DOMAIN,
        maxAge: 15 * 60 * 1000, // 15 min
      });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        domain: DOMAIN,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "You are logged in (Web App)!",
        data: { user: sanitizedUser }, // 🚨 no accessToken here anymore
      });
    }
  } catch (error) {
    next(error);
  }
};

const updateFcmToken = async (req, res, next) => {
  try {
    const { fcmToken } = req.body;
    const userId = req.user.id;

    if (!fcmToken) {
      throw new BadRequestError("FCM token is required");
    }

    const user = await User.findByPk(userId);
    if (!user) throw new NotFoundError("User not found");

    // Update FCM token and save
    user.fcmToken = fcmToken;
    await user.save();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "FCM token updated successfully",
    });
  } catch (error) {
    console.error("Error updating FCM token:", error);
    next(error);
  }
};

const logoutUser = async (req, res, next) => {
  try {
    const { fcmToken } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user) throw new NotFoundError("User not found");

    await user.update({ refreshToken: null });

    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      domain: DOMAIN,
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      domain: DOMAIN,
    });

    if (fcmToken === user.fcmToken) {
      await user.update({ fcmToken: null });
    }

    await logUserLogout(user.id);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "You are logged out!",
    });
  } catch (error) {
    next(error);
  }
};

const registerUser = async (req, res, next) => {
  try {
    const { firstname, lastname, email, contact, password, fcmToken } =
      req.body;

    if (!fcmToken) {
      console.log("No FCM token provided.");
    }

    const existingUser = await User.findOne({
      where: {
        email,
      },
    });

    if (existingUser) throw new BadRequestError("User already Exist!");

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const user = await User.create({
      firstname,
      lastname,
      email,
      contact,
      password: hashedPassword,
      verificationToken,
    });

    await sendVerificationEmail(email, verificationToken);
    await logUserCreation(null, user.id);
    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: "User has been registered! Please verify your email",
    });
  } catch (error) {
    console.error("An error occured");
    next(error);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) throw new BadRequestError("Invalid verification token.");

    const user = await User.findOne({ where: { verificationToken: token } });
    if (!user) throw new NotFoundError("Invalid or expired token.");

    user.isVerified = true;
    user.verificationToken = null;
    await user.save();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Email verified successfully.",
    });
  } catch (error) {
    next(error);
  }
};

const requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;
    console.log("EMAIL:", email);
    const user = await User.findOne({ where: { email } });

    if (!user) throw new NotFoundError("User not found.");

    // Generate reset token & expiration (1 hour)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = Date.now() + 3600000; // 1 hour from now

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetExpires;
    await user.save();

    // Send email
    await sendPasswordResetEmail(email, resetToken);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Password reset email sent.",
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const user = await User.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { [Op.gt]: Date.now() }, // Check expiration
      },
    });

    if (!user) throw new BadRequestError("Invalid or expired token.");

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (error) {
    next(error);
  }
};

const refreshAccessToken = async (req, res, next) => {
  try {
    // Support both cookies (web) and body (mobile)
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) throw new BadRequestError("No refresh token provided");

    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = await User.findByPk(payload.userId);

    if (!user || user.refreshToken !== refreshToken) {
      throw new ForbiddenError("Invalid refresh token");
    }

    const newAccessToken = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION || "15m" }
    );

    // For web: set cookie
    if (req.cookies.refreshToken) {
      res.cookie("accessToken", newAccessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        domain: DOMAIN,
        maxAge: 15 * 60 * 1000,
      });

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Token refreshed",
      });
    }

    // For mobile: return tokens in response body
    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Token refreshed",
      data: {
        access: newAccessToken,
        refresh: refreshToken, // Return same refresh token or rotate it
      },
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    const adminId = req.user.id;

    const user = await User.findByPk(adminId);

    if (!user) throw new NotFoundError("User not found!");

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    await user.save();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Password has been updated successfully.",
    });
  } catch (error) {
    console.error("An error occured: ", error);
  }
};

const verifyAuth = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) throw new NotFoundError("User not found.");

    const sanitizedUser = {
      id: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };

    return res.status(StatusCodes.OK).json({
      success: true,
      sanitizedUser,
    });
  } catch (error) {
    next(error);
  }
};

export {
  loginUser,
  logoutUser,
  registerUser,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  updateFcmToken,
  changePassword,
  refreshAccessToken,
  verifyAuth,
};
