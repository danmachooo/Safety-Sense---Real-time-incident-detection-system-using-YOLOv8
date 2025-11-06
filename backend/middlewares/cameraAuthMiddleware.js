import { UnauthorizedError } from "../utils/Error.js";

const cameraAuthMiddleware = async (req, res, next) => {
  let key;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    key = authHeader.substring(7);
  }

  if (!key) {
    return next(new UnauthorizedError("No key provided."));
  }

  try {
    const isMatch = key === process.env.API_KEY;
    if (!isMatch) {
      return next(
        new UnauthorizedError(
          "Client does not have the same api key as the server."
        )
      );
    }
    next();
  } catch (error) {
    console.error("Camera Auth middleware error: " + error);
    next(new UnauthorizedError("Invalid or expired key."));
  }
};

export default cameraAuthMiddleware;
