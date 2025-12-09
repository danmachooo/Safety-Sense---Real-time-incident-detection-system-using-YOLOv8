import { recordOffense } from "../../services/redis/ipBan.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError } from "../../utils/Error.js";

export const blockIPAddress = async (req, res, next) => {
  try {
    const { ip } = req.body;

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
    console.error("An error occured: ", error);
    next(error);
  }
};
