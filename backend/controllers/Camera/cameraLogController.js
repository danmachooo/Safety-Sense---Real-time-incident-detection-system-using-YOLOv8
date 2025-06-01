// const CameraLog = require('../../models/Incidents/CameraLog');
import CameraLog from "../../models/Incidents/CameraLog.js";

const getCameraLogs = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const logs = await CameraLog.findAndCountAll({
      where: { cameraId: id },
      order: [["createdAt", "DESC"]],
      limit: Number(limit),
      offset: Number(offset),
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: `Retrieving Camera for Camera ${id} Logs.`,
      data: logs,
    });
  } catch (error) {
    console.error("Get Camera Logs Error: ", error);
    next(error);
  }
};

const getAllLogs = async (req, res) => {
  try {
    const logs = await CameraLog.findAll({
      order: [["createdAt", "DESC"]],
      limit: 100, // Limit to last 100 logs
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Retrieving Camera Logs.",
      data: logs,
    });
  } catch (error) {
    console.error("Get All Camera Logs Error: ", error);
    next(error);
  }
};

export { getCameraLogs, getAllLogs };
