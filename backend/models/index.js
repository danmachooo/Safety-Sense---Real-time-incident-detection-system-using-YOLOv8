// const sequelize = require("../config/database");
// const setupAssociations = require("./associations");

// // Import all models
// const User = require("./Users/User");
// const LoginHistory = require("./Users/LoginHistory");
// const Camera = require("./Incidents/Camera");
// const CameraHealthCheck = require("./Incidents/CameraHealthCheck");
// const CameraLog = require("./Incidents/CameraLog");
// const Incident = require("./Incidents/Incident");
// const IncidentAcceptance = require("./Incidents/IncidentAcceptance");
// const Notification = require("./Notification/Notification");
// const InventoryItem = require("./Inventory/InventoryItem");
// const Batch = require("./Inventory/Batch");
// const Category = require("./Inventory/Category");
// const Deployment = require("./Inventory/Deployment");
// const invNotification = require("./Inventory/InventoryNotification");
// const IncidentDismissal = require("./Incidents/IncidentDismissal");

import sequelize from "../config/database.js";
import setupAssociations from "./associations.js";
import User from "./Users/User.js";
import LoginHistory from "./Users/LoginHistory.js";
import Camera from "./Incidents/Camera.js";
import CameraHealthCheck from "./Incidents/CameraHealthCheck.js";
import CameraLog from "./Incidents/CameraLog.js";
import Incident from "./Incidents/Incident.js";
import IncidentAcceptance from "./Incidents/IncidentAcceptance.js";
import Notification from "./Notification/Notification.js";
import InventoryItem from "./Inventory/InventoryItem.js";
import Batch from "./Inventory/Batch.js";
import Category from "./Inventory/Category.js";
import Deployment from "./Inventory/Deployment.js";
import InventoryNotification from "./Inventory/InventoryNotification.js";
import IncidentDismissal from "./Incidents/IncidentDismissal.js";

// Set up associations
setupAssociations();

// Export all models
const models = {
  User,
  LoginHistory,
  Camera,
  CameraHealthCheck,
  CameraLog,
  Incident,
  IncidentAcceptance,
  IncidentDismissal,
  Notification,
  InventoryItem,
  Batch,
  Category,
  Deployment,
  InventoryNotification,
};

export default models;
