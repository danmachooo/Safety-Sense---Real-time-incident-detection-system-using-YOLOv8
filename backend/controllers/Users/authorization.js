// const User = require('../../models/Users/User');
// const { BadRequestError, NotFoundError  } = require('../../utils/Error');
// const { StatusCodes } = require('http-status-codes') ;
// const { logAccountAction } = require('../Notification/Notification');
// const { sendRoleChangeEmail, sendAccountStatusEmail } = require('../../services/emailService')

import models from "../../models/index.js";
const { User } = models;
import { BadRequestError, NotFoundError } from "../../utils/Error.js";
import { StatusCodes } from "http-status-codes";
import { logAccountAction } from "../Notification/Notification.js";
import {
  sendRoleChangeEmail,
  sendAccountStatusEmail,
} from "../../services/emailService.js";

const changeUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const adminId = req.user.id;

    if (!id || !role)
      throw new BadRequestError(
        "Invalid Request! Required fields are missing."
      );

    const user = await User.findByPk(id);
    const admin = await User.findByPk(adminId);

    if (!user) throw new NotFoundError("User not found.");

    const updatedUser = await user.update({ role });

    if (updatedUser)
      await sendRoleChangeEmail(updatedUser.email, updatedUser.role);

    if (!updatedUser || updatedUser.role !== role)
      throw new Error("An error occurred. Cannot update user.");

    await logAccountAction(
      adminId,
      id,
      "ROLE_CHANGE",
      `${user.firstname}'s role has been changed to ${role} by Admin ${admin.firstname}`
    );

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "User role has been updated!",
      data: { role: updatedUser.role },
    });
  } catch (error) {
    console.error("An error occurred while changing user role:", error);
    next(error);
  }
};

const changeAccess = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isBlocked } = req.body;

    const adminId = req.user.id;

    if (typeof isBlocked !== "boolean") {
      throw new BadRequestError(
        "Invalid Request! 'isBlocked' must be a boolean."
      );
    }

    const user = await User.findByPk(id);
    const admin = await User.findByPk(adminId);

    if (!user) throw new NotFoundError("User not found.");

    const updatedUser = await user.update({ isBlocked });

    if (updatedUser)
      await sendAccountStatusEmail(updatedUser.email, updatedUser.isBlocked);

    await logAccountAction(
      adminId,
      id,
      isBlocked ? "BLOCK" : "UNBLOCK",
      `${user.firstname}'s account status has been changed to ${
        isBlocked ? "BLOCKED" : "UNBLOCKED"
      } by Admin ${admin.firstname}`
    );

    return res.status(StatusCodes.OK).json({
      success: true,
      message: `User has been ${
        isBlocked ? "blocked" : "unblocked"
      } successfully!`,
      data: { id: user.id, isBlocked: user.isBlocked },
    });
  } catch (error) {
    console.error("An error occurred while changing user access:", error);
    next(error);
  }
};

export { changeUserRole, changeAccess };
