const {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
} = require("../../utils/Error");
const User = require("../../models/Users/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require("../../services/emailService");
const { Op } = require("sequelize");
const { StatusCodes } = require("http-status-codes");
const { logUserLogin, logUserLogout } = require("./LoginHistory");

const { logUserCreation } = require("../Notification/Notification");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = process.env.JWT_EXPIRES_IN;
const REFRESH_SECRET = process.env.REFRESH_SECRET;
const REFRESH_EXPIRATION = process.env.REFRESH_EXPIRES_IN;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

const loginUser = async (req, res, next) => {
  try {
    const { email, password, fcmToken } = req.body;

    if (!email || !password) {
      throw new BadRequestError("Invalid email and password");
    }

    const user = await User.findOne({ where: { email } });

    if (!user || user.isSoftDeleted()) {
      throw new NotFoundError("User not found! Invalid credentials.");
    }

    if (user.isBlocked) {
      throw new ForbiddenError("User is blocked and cannot go any further");
    }

    if (!user.isVerified) {
      throw new ForbiddenError(
        "User is not yet verified and cannot go any further"
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new NotFoundError("User not found! Invalid credentials.");
    }

    if (user.accessToken) {
      throw new UnauthorizedError(
        "Another session is already active. Please log out first."
      );
    }

    const accessToken = jwt.sign(
      { userId: user.id, role: user.role, isBlocked: user.isBlocked },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION || "15m" }
    );

    const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, {
      expiresIn: REFRESH_EXPIRATION,
    });

    await user.update({ accessToken, refreshToken, fcmToken });
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

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "You are logged in!",
      data: {
        access: accessToken,
        user: sanitizedUser,
      },
    });
  } catch (error) {
    console.error("An error occurred during login:", error);
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
    console.log(user.id);
    if (!user) throw new NotFoundError("User not found!.");
    await user.update({ accessToken: null });
    await user.update({ refreshToken: null });

    if (fcmToken === user.fcmToken) {
      console.log("FCM Token is removed from the user");
      await user.update({ fcmToken: null });
    } else {
      console.log(
        "FCM Token from client is not equal or match to FCM Token in server"
      );
    }

    await logUserLogout(user.id);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "You are logged out!",
    });
  } catch (error) {
    console.error("An error occured.");
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
  const refreshToken = req.cookies.refreshToken;
  console.log("Cookies: ", refreshToken);
  if (!refreshToken) {
    throw new BadRequestError("No token provided...");
  }

  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = await User.findOne({ where: { id: payload.userId } });

    if (!user || user.refreshToken !== refreshToken) {
      throw new ForbiddenError("Invalid Token!");
    }

    const newAccessToken = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        isBlocked: user.isBlocked,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );

    user.accessToken = newAccessToken;
    await user.save();

    console.log("Token has been refreshed! \nNew Token: ", newAccessToken);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Token has been refreshed",
      token: newAccessToken,
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

module.exports = {
  loginUser,
  logoutUser,
  registerUser,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  updateFcmToken,
  changePassword,
  refreshAccessToken,
};
