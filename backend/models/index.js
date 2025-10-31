// models/index.js - Main entry point for all models

import sequelize from "../config/database.js";
import setupAssociations from "./associations.js";

// Import all models
import User from "./Users/User.js";
import LoginHistory from "./Users/LoginHistory.js";
import Camera from "./Incidents/Camera.js";
import CameraHealthCheck from "./Incidents/CameraHealthCheck.js";
import CameraLog from "./Incidents/CameraLog.js";
// import Incident from "./Incidents/Incident.js";
import IncidentAcceptance from "./Incidents/IncidentAcceptance.js";
import IncidentDismissal from "./Incidents/IncidentDismissal.js";
import Notification from "./Notification/Notification.js";
import InventoryItem from "./Inventory/InventoryItem.js";
import Batch from "./Inventory/Batch.js";
import Category from "./Inventory/Category.js";
import Deployment from "./Inventory/Deployment.js";
import InventoryNotification from "./Inventory/InventoryNotification.js";
import SerializedItem from "./Inventory/SerializedItem.js";
import SerialItemDeployment from "./Inventory/SerialItemDeployment.js";
import SerializedItemHistory from "./Inventory/SerializedItemHistory.js";
import DeploymentNotes from "./Inventory/DeploymentNotes.js";
import Incident from "./Incidents/v2Incident/Incident.js";
import HumanIncident from "./Incidents/v2Incident/HumanIncident.js";
import YOLOIncident from "./Incidents/v2Incident/YOLOIncident.js";
// import ActionLog from "./ActionLog.js"; // Uncomment if this exists

// IMPORTANT: Set up associations ONCE here
setupAssociations();

// Export all models
const models = {
  sequelize,
  User,
  LoginHistory,
  Notification,
  InventoryItem,
  Batch,
  Category,
  Deployment,
  InventoryNotification,
  SerializedItem,
  SerialItemDeployment,
  SerializedItemHistory,
  Camera,
  DeploymentNotes,
  HumanIncident,
  YOLOIncident,
  CameraHealthCheck,
  CameraLog,
  Incident,
  IncidentAcceptance,
  IncidentDismissal,
  // ActionLog, // Uncomment if this exists
};

export default models;
