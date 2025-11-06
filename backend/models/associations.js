// models/associations.js - OPTIMIZED ASSOCIATIONS with redundancy removal

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
import ActionLog from "./Inventory/ActionLog.js";
import SerialItemDeployment from "./Inventory/SerialItemDeployment.js";
import SerializedItem from "./Inventory/SerializedItem.js";
import SerializedItemHistory from "./Inventory/SerializedItemHistory.js"; // 👈 new model
import DeploymentNotes from "./Inventory/DeploymentNotes.js";

import YOLOIncident from "./Incidents/v2Incident/YOLOIncident.js";
import Incident from "./Incidents/v2Incident/Incident.js";
import HumanIncident from "./Incidents/v2Incident/HumanIncident.js";

const setupAssociations = () => {
  // ========================================
  // USER ASSOCIATIONS
  // ========================================
  User.hasMany(LoginHistory, {
    foreignKey: "userId",
    as: "loginHistory",
    onDelete: "CASCADE",
  });
  LoginHistory.belongsTo(User, { foreignKey: "userId", as: "user" });

  User.hasMany(CameraLog, {
    foreignKey: "userId",
    as: "cameraLogs",
    onDelete: "SET NULL",
  });
  CameraLog.belongsTo(User, { foreignKey: "userId", as: "user" });

  User.hasMany(Batch, {
    foreignKey: "received_by",
    as: "receivedBatches",
    onDelete: "SET NULL",
  });
  Batch.belongsTo(User, { foreignKey: "received_by", as: "receiver" });

  User.hasMany(Deployment, {
    foreignKey: "deployed_by",
    as: "deploymentsMade",
    onDelete: "RESTRICT",
  });
  Deployment.belongsTo(User, { foreignKey: "deployed_by", as: "deployer" });

  User.hasMany(Deployment, {
    foreignKey: "deployed_to",
    as: "deploymentsReceived",
    onDelete: "RESTRICT",
  });
  Deployment.belongsTo(User, {
    foreignKey: "deployed_to",
    as: "recipient",
  });

  User.hasMany(SerializedItem, {
    foreignKey: "created_by",
    as: "createdSerializedItems",
    onDelete: "SET NULL",
  });
  SerializedItem.belongsTo(User, { foreignKey: "created_by", as: "creator" });

  User.hasMany(Notification, {
    foreignKey: "userId",
    as: "notifications",
    onDelete: "CASCADE",
  });
  Notification.belongsTo(User, { foreignKey: "userId", as: "user" });

  User.hasMany(InventoryNotification, {
    foreignKey: "user_id",
    as: "inventoryNotifications",
    onDelete: "CASCADE",
  });
  InventoryNotification.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
  });

  // ========================================
  // BASE INCIDENT ASSOCIATIONS
  // ========================================

  // USER ↔ INCIDENT ACCEPTANCE
  User.belongsToMany(Incident, {
    through: IncidentAcceptance,
    as: "acceptedIncidents",
    foreignKey: "userId",
    otherKey: "incidentId",
  });
  Incident.belongsToMany(User, {
    through: IncidentAcceptance,
    as: "accepters",
    foreignKey: "incidentId",
    otherKey: "userId",
  });

  // USER ↔ INCIDENT DISMISSAL
  User.belongsToMany(Incident, {
    through: IncidentDismissal,
    as: "dismissedIncidents",
    foreignKey: "userId",
    otherKey: "incidentId",
  });
  Incident.belongsToMany(User, {
    through: IncidentDismissal,
    as: "dismissers",
    foreignKey: "incidentId",
    otherKey: "userId",
  });

  // ========================================
  // HUMAN INCIDENT ASSOCIATIONS
  // ========================================
  HumanIncident.belongsTo(Incident, {
    foreignKey: "incidentId",
    as: "incidentBaseHuman",
  });

  Incident.hasOne(HumanIncident, {
    foreignKey: "incidentId",
    as: "humanDetails",
  });

  // ========================================
  // AI INCIDENT ASSOCIATIONS
  // ========================================
  YOLOIncident.belongsTo(Incident, {
    foreignKey: "incidentId",
    as: "incidentBaseYolo",
  });

  Incident.hasOne(YOLOIncident, {
    foreignKey: "incidentId",
    as: "yoloDetails",
  });

  // CAMERA ↔ INCIDENT
  Camera.hasMany(Incident, {
    foreignKey: "cameraId",
    as: "incidents",
    onDelete: "SET NULL",
  });
  Incident.belongsTo(Camera, {
    foreignKey: "cameraId",
    as: "camera",
  });

  // ========================================
  // CAMERA HEALTH & LOGGING ASSOCIATIONS
  // ========================================

  // CAMERA ↔ CAMERA HEALTH & LOG
  Camera.hasMany(CameraHealthCheck, {
    foreignKey: "cameraId",
    as: "healthChecks",
    onDelete: "CASCADE",
  });
  CameraHealthCheck.belongsTo(Camera, {
    foreignKey: "cameraId",
    as: "camera",
  });

  Camera.hasMany(CameraLog, {
    foreignKey: "cameraId",
    as: "logs",
    onDelete: "CASCADE",
  });
  CameraLog.belongsTo(Camera, {
    foreignKey: "cameraId",
    as: "camera",
  });
  // ========================================
  // INVENTORY SYSTEM ASSOCIATIONS
  // ========================================
  Category.hasMany(InventoryItem, {
    foreignKey: "category_id",
    as: "items",
    onDelete: "RESTRICT",
  });
  InventoryItem.belongsTo(Category, {
    foreignKey: "category_id",
    as: "category",
  });

  InventoryItem.hasMany(Batch, {
    foreignKey: "inventory_item_id",
    as: "batches",
    onDelete: "CASCADE",
  });
  Batch.belongsTo(InventoryItem, {
    foreignKey: "inventory_item_id",
    as: "item",
  });

  InventoryItem.hasMany(Deployment, {
    foreignKey: "inventory_item_id",
    as: "deployments",
    onDelete: "RESTRICT",
  });
  Deployment.belongsTo(InventoryItem, {
    foreignKey: "inventory_item_id",
    as: "item",
  });

  InventoryItem.hasMany(SerializedItem, {
    foreignKey: "inventory_item_id",
    as: "serializedItems",
    onDelete: "CASCADE",
  });
  SerializedItem.belongsTo(InventoryItem, {
    foreignKey: "inventory_item_id",
    as: "item",
  });

  InventoryItem.hasMany(InventoryNotification, {
    foreignKey: "inventory_item_id",
    as: "notifications",
    onDelete: "CASCADE",
  });
  InventoryNotification.belongsTo(InventoryItem, {
    foreignKey: "inventory_item_id",
    as: "item",
  });

  InventoryItem.hasMany(ActionLog, {
    foreignKey: "itemId",
    as: "actionLogs",
    onDelete: "CASCADE",
  });
  ActionLog.belongsTo(InventoryItem, { foreignKey: "itemId", as: "item" });

  // ========================================
  // BATCH & SERIALIZED ITEM ASSOCIATIONS
  // ========================================
  Batch.hasMany(SerializedItem, {
    foreignKey: "batch_id",
    as: "serializedItems",
    onDelete: "CASCADE",
  });
  SerializedItem.belongsTo(Batch, { foreignKey: "batch_id", as: "batch" });

  // ========================================
  // DEPLOYMENT TRACKING ASSOCIATIONS
  // ========================================

  Deployment.hasMany(DeploymentNotes, {
    foreignKey: "deployment_id",
    as: "notes",
    onDelete: "CASCADE",
  });

  DeploymentNotes.belongsTo(Deployment, {
    foreignKey: "deployment_id",
    as: "deployment",
  });

  DeploymentNotes.belongsTo(User, {
    foreignKey: "created_by",
    as: "createdBy",
  });

  User.hasMany(DeploymentNotes, {
    foreignKey: "created_by",
    as: "deploymentNotes",
  });

  Deployment.hasMany(SerialItemDeployment, {
    foreignKey: "deployment_id",
    as: "itemDeployments",
    onDelete: "CASCADE",
  });
  SerialItemDeployment.belongsTo(Deployment, {
    foreignKey: "deployment_id",
    as: "deployment",
  });

  SerializedItem.hasMany(SerialItemDeployment, {
    foreignKey: "serialized_item_id",
    as: "deploymentHistory",
    onDelete: "CASCADE",
  });
  SerialItemDeployment.belongsTo(SerializedItem, {
    foreignKey: "serialized_item_id",
    as: "item",
  });

  // ========================================
  // SERIALIZED ITEM HISTORY ASSOCIATIONS 👇
  // ========================================
  SerializedItem.hasMany(SerializedItemHistory, {
    foreignKey: "serialized_item_id",
    as: "history",
    onDelete: "CASCADE",
  });
  SerializedItemHistory.belongsTo(SerializedItem, {
    foreignKey: "serialized_item_id",
    as: "item",
  });

  // 🔹 User who deployed the item
  User.hasMany(SerializedItemHistory, {
    foreignKey: "deployed_by",
    as: "deployedHistories",
    onDelete: "SET NULL",
  });
  SerializedItemHistory.belongsTo(User, {
    foreignKey: "deployed_by",
    as: "deployer",
  });

  // 🔹 User who received the item
  User.hasMany(SerializedItemHistory, {
    foreignKey: "deployed_to",
    as: "receivedHistories",
    onDelete: "SET NULL",
  });
  SerializedItemHistory.belongsTo(User, {
    foreignKey: "deployed_to",
    as: "receiver",
  });

  Deployment.hasMany(SerializedItemHistory, {
    foreignKey: "deployment_id",
    as: "itemHistories",
    onDelete: "SET NULL",
  });
  SerializedItemHistory.belongsTo(Deployment, {
    foreignKey: "deployment_id",
    as: "deployment",
  });

  // ========================================
  // HELPER ASSOCIATIONS
  // ========================================
  SerializedItem.hasOne(SerialItemDeployment, {
    foreignKey: "serialized_item_id",
    as: "currentDeployment",
    scope: { returned_at: null },
  });

  SerializedItem.hasOne(SerialItemDeployment, {
    foreignKey: "serialized_item_id",
    as: "latestDeployment",
    order: [["deployed_at", "DESC"]],
  });

  console.log(
    "✅ All optimized model associations have been set up successfully"
  );
};

export default setupAssociations;
