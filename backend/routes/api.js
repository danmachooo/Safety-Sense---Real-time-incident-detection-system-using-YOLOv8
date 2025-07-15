import express from "express";
const router = express.Router();

import inventoryRouter from "./InventoryRoutes.js";
import authenticationRouter from "./AuthenticationRoutes.js";
import authorizationRouter from "./AuthorizationRoutes.js";
import manageUserRouter from "./ManageUserRoutes.js";
import systemRouter from "./SystemRoutes.js";
import cameraRouter from "./CameraRoutes.js";
import incidents from "./IncidentRoutes.js";
import fcmRouter from "./FcmRoutes.js";
import dashboardRouter from "./dashboardRoutes.js";
import reportRouter from "./reportRoutes.js";

router.use("/auth", authenticationRouter);
router.use("/authorization", authorizationRouter);
router.use("/manage-user", manageUserRouter);
router.use("/incidents", incidents);
router.use("/inventory", inventoryRouter);
router.use("/camera", cameraRouter);
router.use("/system", systemRouter);
router.use("/fcm", fcmRouter);
router.use("/dashboard", dashboardRouter);
router.use("/reports", reportRouter);

export default router;
