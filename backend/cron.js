// cron.js
const cron = require('node-cron');
const { checkAllCameraStatus, checkAndAlertOfflineCameras } = require('./controllers/Camera/cameraHealthController');

const setupCronJobs = () => {
  cron.schedule('*/5 * * * *', async () => {
    console.log('⏳ Running camera status check...');
    await checkAllCameraStatus();
  });

  cron.schedule('*/10 * * * *', async () => {
    console.log('⏳ Running offline camera alerts...');
    await checkAndAlertOfflineCameras();
  });
};

module.exports = setupCronJobs;
