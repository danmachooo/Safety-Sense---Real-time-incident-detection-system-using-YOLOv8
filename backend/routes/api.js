const express = require('express');
const router = express.Router();

const inventoryRouter = require('./InventoryRoutes');
const authenticationRouter = require('./AuthenticationRoutes');
const authorizationRouter = require('./AuthorizationRoutes');
const manageUserRouter = require('./ManageUserRoutes');

router.use('/authentication', authenticationRouter);
router.use('/authorization', authorizationRouter);
router.use('/inventory', inventoryRouter);
router.use('/manage-user', manageUserRouter);

module.exports = router;