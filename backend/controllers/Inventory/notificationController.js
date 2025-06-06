// const User = require('../../models/Users/User');
// const InventoryItem = require('../../models/Inventory/InventoryItem');
// const Notification = require('../../models/Inventory/InventoryNotification');

// const { Op } = require('sequelize');
// const { StatusCodes } = require('http-status-codes');
// const { NotFoundError } = require('../../utils/Error');

// import User from "../../models/Users/User.js";
// import InventoryItem from "../../models/Inventory/InventoryItem.js";
// import Notification from "../../models/Notification/Notification.js";

import models from "../../models/index.js";
const { InventoryItem, User, Notification } = models;

import { Op } from "sequelize";
import { StatusCodes } from "http-status-codes";
import { NotFoundError } from "../../utils/Error.js";

const getAllNotifications = async (req, res, next) => {
  try {
    const { type, priority, seen, user_id, page = 1, limit = 10 } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    if (type) whereClause.notification_type = type;
    if (priority) whereClause.priority = priority;
    if (seen !== undefined) whereClause.seen = seen === "true";
    if (user_id) whereClause.user_id = user_id;

    const { count, rows: notifications } = await Notification.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: InventoryItem,
          as: "inventoryNotificationItem",
          attributes: ["id", "name"],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "firstname", "lastname"],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      data: notifications,
      message: "Notifications has been fetched.",
      meta: {
        total: count,
        pages: Math.ceil(count / limit),
        currentPage: parseInt(page),
      },
    });
  } catch (error) {
    console.error("Notifications Fetch Error: ", error.message);
    next(error);
  }
};

const getUnreadNotifications = async (req, res, next) => {
  try {
    const { user_id } = req.query;
    const whereClause = {
      seen: false,
    };

    if (user_id) whereClause.user_id = user_id;

    const notifications = await Notification.findAll({
      where: whereClause,
      include: [
        {
          model: InventoryItem,
          as: "inventoryNotificationItem",
          attributes: ["id", "name"],
        },
      ],
      order: [
        ["priority", "DESC"],
        ["createdAt", "DESC"],
      ],
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Unread Notifications has been fetched",
      data: notifications,
    });
  } catch (error) {
    console.error("Unread notifications error: ", error.message);
    next(error);
  }
};

const markAsSeen = async (req, res, next) => {
  try {
    const notification = await Notification.findByPk(req.params.id);

    if (!notification) throw new NotFoundError("Notification not found.");

    await notification.update({ seen: true });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Notification marked as seen",
    });
  } catch (error) {
    console.error("Notification mark error: ", error.message);
    next(error);
  }
};

const markAllAsSeen = async (req, res, next) => {
  try {
    const { user_id } = req.query;
    const whereClause = {
      seen: false,
    };

    if (user_id) whereClause.user_id = user_id;

    await Notification.update({ seen: true }, { where: whereClause });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "All notifications marked as seen",
    });
  } catch (error) {
    console.error("Mark all seen error: ", error.message);
    next(error);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findByPk(req.params.id);

    if (!notification) throw new NotFoundError("Notification not found.");

    await notification.destroy();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Delete notification error: ", error.message);
    next(error);
  }
};

const restoreNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findByPk(req.params.id, {
      paranoid: false,
    });

    if (!notification) throw new NotFoundError("Notification not found.");

    await notification.restore();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Notification restored successfully",
    });
  } catch (error) {
    console.error("Restore notification error: ", error.message);
    next(error);
  }
};

export {
  getAllNotifications,
  getUnreadNotifications,
  markAsSeen,
  markAllAsSeen,
  deleteNotification,
  restoreNotification,
};
