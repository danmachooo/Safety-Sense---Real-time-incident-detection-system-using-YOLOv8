const Notification = require('../../models/Notification/Notification');
const User = require('../../models/Users/User');
const { StatusCodes } = require('http-status-codes');
const { BadRequestError, NotFoundError } = require('../../utils/Error');
/**
 * Logs a account action notification in the database.
 */
const logAccountAction = async (adminId, userId, actionType, description) => {
    await Notification.create({
        userId: adminId,
        actionType,
        entityType: 'User',
        entityId: userId,
        description,
    });
};

const logUserCreation = async (adminId = null, userId) => {
    if (!userId) throw new Error("User ID is required for logging.");

    // ✅ Determine the action type based on who created the account
    const actionType = adminId ? "USER_ADDED_BY_ADMIN" : "USER_SELF_REGISTERED";

    // ✅ Build the description dynamically
    let logDescription;
    
    if (adminId) {
        const admin = await User.findByPk(adminId); // Fetch admin details
        const user = await User.findByPk(userId);   // Fetch new user details

        if (!admin || !user) throw new Error("Admin or User not found.");

        logDescription = `${admin.firstname} ${admin.lastname} added ${user.firstname} ${user.lastname} to the team.`;
    } else {
        const user = await User.findByPk(userId); // Fetch new user details

        if (!user) throw new Error("User not found.");

        logDescription = `${user.firstname} ${user.lastname} has joined the team.`;
    }

    // ✅ Create notification log
    await Notification.create({
        userId,
        actionType,
        entityType: "User",
        description: logDescription
    });

    console.log("User creation logged:", logDescription);
};

/**
 * Logs a inventory notification in the database.
 */
const logInventoryAction = async (userId, actionType, itemId, description) => {
    await Notification.create({
        userId,
        actionType,
        entityType: 'Inventory',
        entityId: itemId,
        description,
    });
};
// In your backend
const getUnreadCount = async (req, res, next) => {
    try {
      const count = await Notification.count({
        where: { isRead: false }
      });
  
      return res.status(StatusCodes.OK).json({
        success: true,
        count
      });
    } catch (error) {
      next(error);
    }
  };

const getNotifications = async (req, res, next) => {
    try {
        let { isRead, limit, offset, sortOrder } = req.query;

        // ✅ Validate & convert isRead to boolean
        let readStatusFilter = {};
        if (isRead !== undefined) {
            readStatusFilter.isRead = isRead === 'true';
        }

        // ✅ Sorting (default: latest first)
        const validSortOrders = ['asc', 'desc'];
        const orderDirection = validSortOrders.includes(sortOrder) ? sortOrder : 'desc';

        // ✅ Default limit (5 notifications per batch)
        const limitNumber = parseInt(limit) || 5;
        const offsetNumber = parseInt(offset) || 0;

        // ✅ Fetch notifications with limit & offset
        const { count, rows } = await Notification.findAndCountAll({
            where: readStatusFilter,
            order: [['createdAt', orderDirection]],
            limit: limitNumber,
            offset: offsetNumber,
        });

        return res.status(StatusCodes.OK).json({
            success: true,
            message: "Notifications retrieved successfully.",
            totalNotifications: count,
            hasMore: offsetNumber + rows.length < count, // ✅ Check if there are more to load
            data: rows,
        });

    } catch (error) {
        console.error("Error fetching notifications:", error);
        next(error);
    }
};

const markNotificationAsRead = async (req, res, next) => {
    try {
        const { id } = req.params;

        // ✅ Ensure id is provided
        if (!id) throw new BadRequestError('Notification is required.')

        // ✅ Find notification
        const notification = await Notification.findByPk(id);

        if (!notification) throw new NotFoundError('Notification Not found.')

        // ✅ Update isRead status
        await notification.update({ isRead: true });

        return res.status(StatusCodes.OK).json({
            success: true,
            message: "Notification marked as read.",
            data: notification
        });

    } catch (error) {
        console.error("Error marking notification as read:", error);
        next(error);
    }
};





module.exports = { logAccountAction, logInventoryAction, logUserCreation, getNotifications, markNotificationAsRead, getUnreadCount };
