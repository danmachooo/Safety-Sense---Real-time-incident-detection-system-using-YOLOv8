const express = require("express");
const router = express.Router();

const inventoryRouter = require("./InventoryRoutes");
const authenticationRouter = require("./AuthenticationRoutes");
const authorizationRouter = require("./AuthorizationRoutes");
const manageUserRouter = require("./ManageUserRoutes");
const systemRouter = require("./SystemRoutes");
const cameraRouter = require("./CameraRoutes");
const incidents = require("./IncidentRoutes");
const fcmRouter = require("./FcmRoutes");
const dashboardRouter = require("./dashboardRoutes");

router.use("/auth", authenticationRouter);
router.use("/authorization", authorizationRouter);
router.use("/manage-user", manageUserRouter);
router.use("/incidents", incidents);
router.use("/inventory", inventoryRouter);
router.use("/camera", cameraRouter);
router.use("/system", systemRouter);
router.use("/fcm", fcmRouter);
router.use("/dashboard", dashboardRouter);

module.exports = router;
