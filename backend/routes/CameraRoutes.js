const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware'); 
const adminMiddleware = require('../middlewares/adminMiddleware');

const {
    registerCamera, 
    updateCamera,
    deleteCamera,
    getCameras,
    getCamera,
    restoreCamera,
    getDeletedCameras
} = require('../controllers/Camera/cameraController');

const {
    checkAllCameraStatus,
    checkAndAlertOfflineCameras,
    getHealthHistory,
} = require('../controllers/Camera/cameraHealthController');

const {
    getCameraLogs,
    getAllLogs
} = require('../controllers/Camera/cameraLogController');


router.post('/register', authMiddleware, adminMiddleware, registerCamera); //ok
router.get('/get/:id',  authMiddleware, adminMiddleware, getCamera); //ok
router.get('/get-all',  authMiddleware, adminMiddleware,getCameras); //ok
router.put('/update/:id',  authMiddleware, adminMiddleware, updateCamera);    //ok   
router.delete('/delete/:id', authMiddleware, adminMiddleware,deleteCamera); //ok
router.get('/get-deleted', authMiddleware, adminMiddleware,getDeletedCameras); //ok
router.patch('/restore/:id',   authMiddleware, adminMiddleware,restoreCamera); //ok


router.get('/check-status',  authMiddleware, adminMiddleware, checkAllCameraStatus);
router.get('/check-alert-offline-cameras', authMiddleware, adminMiddleware, checkAndAlertOfflineCameras);
router.get('/get-health-history', authMiddleware, adminMiddleware, getHealthHistory);

router.get('/camera-logs/:id', authMiddleware, adminMiddleware, getCameraLogs);
router.get('/camera-logs', authMiddleware, adminMiddleware, getAllLogs);

module.exports = router;