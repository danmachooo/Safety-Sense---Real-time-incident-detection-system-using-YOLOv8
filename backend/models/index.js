const sequelize = require("../config/database");
const setupAssociations = require("./associations");

// Import all models
const User = require("./Users/User");
const LoginHistory = require("./Users/LoginHistory");
const Camera = require("./Incidents/Camera");
const CameraStatus = require("./Incidents/CameraHealthCheck");
const CameraLog = require("./Incidents/CameraLog");
const Incident = require("./Incidents/Incident");
const IncidentAcceptance = require("./Incidents/IncidentAcceptance");
const Notification = require("./Notification/Notification");
const InventoryItem = require("./Inventory/InventoryItem");
const Batch = require("./Inventory/Batch");
const Category = require("./Inventory/Category");
const Deployment = require("./Inventory/Deployment");
const invNotification = require("./Inventory/InventoryNotification");
const IncidentDismissal = require("./Incidents/IncidentDismissal");

// Set up associations
setupAssociations();

// Export all models
const models = {
  User,
  LoginHistory,
  Camera,
  CameraStatus,
  CameraLog,
  Incident,
  IncidentAcceptance,
  IncidentDismissal,
  Notification,
  InventoryItem,
  Batch,
  Category,
  Deployment,
  invNotification,
};

module.exports = models;
