// cron.js
// const cron = require('node-cron');
// const { checkAllCameraStatus, checkAndAlertOfflineCameras } = require('./controllers/Camera/cameraHealthController');

import cron from "node-cron";
import {
  checkAndAlertOfflineCameras,
  checkAllCameraStatus,
} from "./controllers/Camera/cameraHealthController.js";

export const setupCronJobs = () => {
  cron.schedule("*/5 * * * *", async () => {
    console.log("⏳ Running camera status check...");
    await checkAllCameraStatus();
  });

  cron.schedule("*/10 * * * *", async () => {
    console.log("⏳ Running offline camera alerts...");
    await checkAndAlertOfflineCameras();
  });
};
