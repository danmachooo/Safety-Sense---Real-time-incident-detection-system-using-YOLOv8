import { StatusCodes } from "http-status-codes";
import { checkIpStatus } from "../services/redis/ipBan.js";
import { ForbiddenError, TooManyRequestError } from "../utils/Error.js";
const checkIPStatusMiddleware = async (req, res, next) => {
  const ipAddress =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.connection.remoteAddress ||
    req.ip;

  const status = await checkIpStatus(ipAddress);

  if (status === "banned") {
    // Add return here!
    return next(new ForbiddenError("Your IP is banned from filing reports."));
  }

  if (status === "cooldown") {
    // Add return here!
    return next(
      new TooManyRequestError("You are temporarily blocked from reporting.")
    );
  }

  console.log("IP Status of reporter: ", status);
  next();
};

export default checkIPStatusMiddleware;
