// const { ForbiddenError } = require('../utils/Error');
import { ForbiddenError } from "../utils/Error.js";

const adminMiddleware = async (req, res, next) => {
  try {
    if (!req.user || !req.user.role) {
      throw new ForbiddenError("Access denied: No user information available.");
    }

    // Allow only admins
    if (req.user.role !== "admin") {
      throw new ForbiddenError("Access denied: Admins only!");
    }

    next(); // Proceed if user is an admin
  } catch (error) {
    console.error("Admin middleware error: " + error);
    next(error);
  }
};

export default adminMiddleware;
