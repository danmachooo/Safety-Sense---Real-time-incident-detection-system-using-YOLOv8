const express = require('express');
const router = express.Router();

const inventoryRouter = require('./InventoryRoutes');
const authenticationRouter = require('./AuthenticationRoutes');
const authorizationRouter = require('./AuthorizationRoutes');
const manageUserRouter = require('./ManageUserRoutes');
const systemRouter = require('./SystemRoutes');
const cameraRouter = require('./CameraRoutes');

router.use('/authentication', authenticationRouter);
router.use('/authorization', authorizationRouter);
router.use('/manage-user', manageUserRouter);
router.use('/inventory', inventoryRouter);
router.use('/camera', cameraRouter);
router.use('/system', systemRouter);

module.exports = router;