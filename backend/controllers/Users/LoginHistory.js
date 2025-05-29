const User = require("../../models/Users/User"); // ✅ Ensure correct import
const LoginHistory = require("../../models/Users/LoginHistory");
const { BadRequestError, NotFoundError } = require("../../utils/Error");
const { Op } = require("sequelize");
const { StatusCodes } = require("http-status-codes");
const logUserLogin = async (userId) => {
  if (!userId) throw new BadRequestError("UserId is required.");

  return await LoginHistory.create({ userId });
};

const logUserLogout = async (userId) => {
  if (!userId) throw new BadRequestError("UserId is required.");

  return await LoginHistory.update(
    { logout: new Date() },
    { where: { userId, logout: null } }
  );
};

const getLoginHistory = async (req, res, next) => {
  try {
    let { search, page, limit, sortBy, sortOrder } = req.query;

    const whereCondition = {};

    // ✅ Ensure User model uses alias 'user'
    const includeUser = {
      model: User,
      as: "user", // ✅ Fix: Use correct alias
      attributes: ["firstname", "lastname", "email", "role"],
      where: {},
    };

    if (search) {
      includeUser.where[Op.or] = [
        { firstname: { [Op.like]: `%${search}%` } },
        { lastname: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    // ✅ Pagination
    const pageNumber = parseInt(page) || 1;
    const limitNumber = parseInt(limit) || 10;
    const offset = (pageNumber - 1) * limitNumber;

    // ✅ Sorting
    const validSortColumns = [
      "login",
      "logout",
      "firstname",
      "lastname",
      "email",
      "role",
    ];
    const validSortOrders = ["asc", "desc"];

    let order = [["login", "desc"]];

    if (sortBy && validSortColumns.includes(sortBy)) {
      const direction = validSortOrders.includes(sortOrder)
        ? sortOrder
        : "desc";

      // ✅ Fix: Correct way to sort by User fields
      if (["firstname", "lastname", "email", "role"].includes(sortBy)) {
        order = [["user", sortBy, direction]];
      } else {
        order = [[sortBy, direction]];
      }
    }

    // ✅ Fetch login history with user details
    const { count, rows } = await LoginHistory.findAndCountAll({
      include: includeUser,
      where: whereCondition,
      offset,
      limit: limitNumber,
      order,
      distinct: true, // ✅ Fix: Correct count when using includes
    });

    // ✅ Format response
    const formattedData = rows.map((entry) => ({
      id: entry.id,
      firstname: entry.user.firstname, // ✅ Fix: Use alias correctly
      lastname: entry.user.lastname,
      email: entry.user.email,
      role: entry.user.role,
      login: entry.login,
      logout: entry.logout,
    }));

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Login history retrieved successfully.",
      totalEntries: count,
      totalPages: Math.ceil(count / limitNumber),
      currentPage: pageNumber,
      data: formattedData,
    });
  } catch (error) {
    console.error("Error fetching login history:", error);
    next(error);
  }
};

module.exports = {
  logUserLogin,
  logUserLogout,
  getLoginHistory,
};
