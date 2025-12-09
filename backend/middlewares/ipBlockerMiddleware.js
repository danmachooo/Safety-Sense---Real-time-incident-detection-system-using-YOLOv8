import { StatusCodes } from "http-status-codes";
import { checkIpStatus } from "../services/redis/ipBan.js";
import { ForbiddenError, TooManyRequestError } from "../utils/Error.js";

export const checkIpStatusMiddleware = async (req, res, next) => {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.connection.remoteAddress ||
    req.ip;

  const status = await checkIpStatus(ip);

  if (status === "banned") {
    throw new ForbiddenError("Your IP is banned from filing reports.");
  }

  if (status === "cooldown") {
    throw new TooManyRequestError("You are temporarily blocked from reporting.")
  }

  next();
};

export default checkIpStatusMiddleware;
