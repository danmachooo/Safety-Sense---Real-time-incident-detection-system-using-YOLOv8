import jwt from "jsonwebtoken";
import { UnauthorizedError } from "../utils/Error.js";

const authMiddleware = async (req, res, next) => {
  // Support both cookie-based (web) and header-based (mobile) authentication
  let token = req.cookies.accessToken;

  // If no cookie, check Authorization header
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    }
  }

  if (!token) {
    return next(new UnauthorizedError("No token provided."));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Prevent blocked users from proceeding
    if (decoded.isBlocked) {
      return next(new UnauthorizedError("User is blocked and cannot proceed."));
    }

    // Store user data for use in protected routes
    req.user = {
      id: decoded.userId,
      role: decoded.role,
      isBlocked: decoded.isBlocked,
    };

    next();
  } catch (error) {
    console.error("Auth middleware error: " + error);
    next(new UnauthorizedError("Invalid or expired token."));
  }
};

export default authMiddleware;
