import models from "../../models/index.js";
const { Incident, HumanIncident } = models;
import { recordOffense } from "../../services/redis/ipBan.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError, NotFoundError } from "../../utils/Error.js";

export const blockIPAddress = async (req, res, next) => {
  try {
    const { ip } = req.params;

    if (!ip) {
      throw new BadRequestError("No IP found for this report!");
    }

    // Apply the penalty (cooldown/ban escalation)
    const offense = await recordOffense(ip);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Report marked as spam. IP penalized.",
      offenseLevel: offense,
    });
  } catch (error) {
    next(error);
  }
};
