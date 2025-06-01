// const { StatusCodes } = require('http-status-codes');
// const { BadRequestError, NotFoundError } = require('../../utils/Error');
// const Camera = require('../../models/Incidents/Camera');
// const CameraHealthCheck = require('../../models/Incidents/CameraHealthCheck');
// const CameraLog = require('../../models/Incidents/CameraLog');
// const { Op } = require('sequelize');
// const axios = require('axios');

import { StatusCodes } from "http-status-codes";
import { BadRequestError, NotFoundError } from "../../utils/Error.js";
import Camera from "../../models/Incidents/Camera.js";
import CameraHealthCheck from "../../models/Incidents/CameraHealthCheck.js";
import CameraLog from "../../models/Incidents/CameraLog.js";
import { Op } from "sequelize";
import axios from "axios";

const checkCameraStatus = async (rtspUrl) => {
  try {
    await axios.get(rtspUrl, { timeout: 5000 });
    return "online";
  } catch {
    return "offline";
  }
};

const updateCameraStatus = async (camera, newStatus) => {
  try {
    const oldStatus = camera.status;

    if (oldStatus !== newStatus) {
      // If the camera RECOVERS from OFFLINE to ONLINE, update lastOnlineAt
      if (newStatus === "online") {
        await camera.update({ lastOnlineAt: new Date() });
      }

      // Log the downtime
      const lastCheck = await CameraHealthCheck.findOne({
        where: { cameraId: camera.id },
        order: [["checkedAt", "DESC"]],
      });

      // If camera was offline before, mark downtime end
      if (
        lastCheck &&
        lastCheck.status === "offline" &&
        newStatus === "online"
      ) {
        await lastCheck.update({ downtimeEnd: new Date() });
      }

      // If camera goes offline, store downtime start
      const downtimeStart = newStatus === "offline" ? new Date() : null;

      await CameraHealthCheck.create({
        cameraId: camera.id,
        status: newStatus,
        downtimeStart: downtimeStart,
      });

      await camera.update({
        status: newStatus,
        lastCheckedAt: new Date(),
      });

      await CameraLog.create({
        cameraId: camera.id,
        actionType: "STATUS_CHANGE",
        description: `Camera status changed from ${oldStatus} to ${newStatus}`,
      });
    } else {
      await camera.update({ lastCheckedAt: new Date() });
    }
  } catch (error) {
    console.error("Update Camera Status Error: ", error);
    throw error;
  }
};

const checkAllCameraStatus = async () => {
  try {
    const cameras = await Camera.findAll();
    console.log("🔍 Checking all cameras...");

    for (const camera of cameras) {
      const newStatus = await checkCameraStatus(camera.rtspUrl);
      await updateCameraStatus(camera, newStatus);
    }

    console.log("✅ All camera statuses checked and updated.");
  } catch (error) {
    console.error("❌ Check All Cameras Status Error:", error);
  }
};

const sendOfflineAlert = async (camera) => {
  console.log(`Alert: Camera ${camera.id} has been offline for too long.`);
  await Notification.create({
    actionType: "CAMERA_OFFLINE",
    entityType: "Camera",
    entityId: camera.id,
    description: `Camera ${camera.name} is offline for more than 30 minutes.`,
  });
};

const checkAndAlertOfflineCameras = async () => {
  try {
    const offlineThreshold = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
    const offlineCameras = await Camera.findAll({
      where: {
        status: "offline",
        lastCheckedAt: { [Op.lt]: offlineThreshold },
      },
    });

    for (const camera of offlineCameras) {
      await sendOfflineAlert(camera);
    }

    console.log(`📢 Sent alerts for ${offlineCameras.length} offline cameras.`);
  } catch (error) {
    console.error("❌ Check and Alert Offline Cameras Error:", error);
  }
};

const getHealthHistory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const healthChecks = await CameraHealthCheck.findAll({
      where: { cameraId: id },
      order: [["checkedAt", "DESC"]],
      limit: 100, // Limit to last 100 checks
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Retrieved camera health history.",
      data: healthChecks,
    });
  } catch (error) {
    console.error("Get Health History Error: ", error);
    next(error);
  }
};

const getDowntimeReport = async (req, res, next) => {
  try {
    const { id } = req.params;

    const healthChecks = await CameraHealthCheck.findAll({
      where: { cameraId: id, downtimeStart: { [Op.ne]: null } },
      order: [["downtimeStart", "DESC"]],
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: `Downtime report for camera ${id}`,
      data: healthChecks,
    });
  } catch (error) {
    console.error("Get Downtime Report Error: ", error);
    next(error);
  }
};

export {
  checkAllCameraStatus,
  checkAndAlertOfflineCameras,
  getHealthHistory,
  getDowntimeReport,
};
