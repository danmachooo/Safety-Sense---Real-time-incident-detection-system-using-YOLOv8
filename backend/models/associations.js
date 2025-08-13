// models/associations.js - SINGLE SOURCE OF TRUTH for all associations

import User from "./Users/User.js";
import LoginHistory from "./Users/LoginHistory.js";
import Camera from "./Incidents/Camera.js";
import CameraHealthCheck from "./Incidents/CameraHealthCheck.js";
import CameraLog from "./Incidents/CameraLog.js";
import Incident from "./Incidents/Incident.js";
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
const setupAssociations = () => {
  // ========================================
  // USER ASSOCIATIONS
  // ========================================

  // User <-> LoginHistory
  User.hasMany(LoginHistory, {
    foreignKey: "userId",
    as: "loginHistory",
    onDelete: "CASCADE",
  });

  LoginHistory.belongsTo(User, {
    foreignKey: "userId",
    as: "user",
  });

  // User <-> CameraLog
  User.hasMany(CameraLog, {
    foreignKey: "userId",
    as: "cameraLogs",
  });

  CameraLog.belongsTo(User, {
    foreignKey: "userId",
    as: "user",
  });

  // User <-> Batch
  User.hasMany(Batch, {
    foreignKey: "received_by",
    as: "receivedBatches",
  });

  Batch.belongsTo(User, {
    foreignKey: "received_by",
    as: "receiver",
  });

  // User <-> Deployment (deployed_by)
  User.hasMany(Deployment, {
    foreignKey: "deployed_by",
    as: "deploymentsMade", // Changed alias to avoid conflict
  });

  Deployment.belongsTo(User, {
    foreignKey: "deployed_by",
    as: "deployer",
  });

  // User <-> Deployment (deployed_to)
  User.hasMany(Deployment, {
    foreignKey: "deployed_to",
    as: "deploymentsReceived", // Changed alias to avoid conflict
  });

  Deployment.belongsTo(User, {
    foreignKey: "deployed_to",
    as: "receiver",
  });
  // User <-> InventoryNotification
  User.hasMany(InventoryNotification, {
    foreignKey: "user_id",
    as: "inventoryNotifications",
  });

  InventoryNotification.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
  });

  // User <-> General Notification
  User.hasMany(Notification, {
    foreignKey: "userId",
    as: "notifications",
  });

  Notification.belongsTo(User, {
    foreignKey: "userId",
    as: "user",
  });

  // ========================================
  // INCIDENT SYSTEM ASSOCIATIONS
  // ========================================

  // Camera <-> Incident
  Camera.hasMany(Incident, {
    foreignKey: "cameraId",
    as: "incidents",
    onDelete: "SET NULL",
  });

  Incident.belongsTo(Camera, {
    foreignKey: "cameraId",
    as: "camera",
  });

  // Camera <-> CameraHealthCheck
  Camera.hasMany(CameraHealthCheck, {
    foreignKey: "cameraId",
    as: "healthChecks",
    onDelete: "CASCADE",
  });

  CameraHealthCheck.belongsTo(Camera, {
    foreignKey: "cameraId",
    as: "camera",
  });

  // Camera <-> CameraLog
  Camera.hasMany(CameraLog, {
    foreignKey: "cameraId",
    as: "logs",
    onDelete: "CASCADE",
  });

  CameraLog.belongsTo(Camera, {
    foreignKey: "cameraId",
    as: "camera",
  });

  // User <-> Incident (Many-to-Many through IncidentAcceptance)
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

  // User <-> Incident (Many-to-Many through IncidentDismissal)
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
  // INVENTORY SYSTEM ASSOCIATIONS
  // ========================================

  // Category <-> InventoryItem
  Category.hasMany(InventoryItem, {
    foreignKey: "category_id",
    as: "inventoryItems",
  });

  InventoryItem.belongsTo(Category, {
    foreignKey: "category_id",
    as: "category",
  });

  // InventoryItem <-> Batch
  InventoryItem.hasMany(Batch, {
    foreignKey: "inventory_item_id",
    as: "batches",
  });

  Batch.belongsTo(InventoryItem, {
    foreignKey: "inventory_item_id",
    as: "inventoryItem",
  });

  // InventoryItem <-> Deployment
  InventoryItem.hasMany(Deployment, {
    foreignKey: "inventory_item_id",
    as: "deployments",
  });

  Deployment.belongsTo(InventoryItem, {
    foreignKey: "inventory_item_id",
    as: "inventoryItem",
  });

  // InventoryItem <-> InventoryNotification
  InventoryItem.hasMany(InventoryNotification, {
    foreignKey: "inventory_item_id",
    as: "notifications",
  });

  InventoryNotification.belongsTo(InventoryItem, {
    foreignKey: "inventory_item_id",
    as: "inventoryItem",
  });

  // InventoryItem <-> ActionLog
  InventoryItem.hasMany(ActionLog, {
    foreignKey: "itemId",
    as: "actionLogs",
    onDelete: "CASCADE",
  });

  ActionLog.belongsTo(InventoryItem, {
    foreignKey: "itemId",
    as: "inventoryItem",
  });

  // ========================================
  // SERIALIZED ITEM ASSOCIATIONS
  // ========================================

  // SerializedItem <-> Batch
  Batch.hasMany(SerializedItem, {
    foreignKey: "batch_id",
    as: "serializedItems",
  });

  SerializedItem.belongsTo(Batch, {
    foreignKey: "batch_id",
    as: "batch",
  });

  // SerializedItem <-> InventoryItem
  InventoryItem.hasMany(SerializedItem, {
    foreignKey: "inventory_item_id",
    as: "serializedItems",
  });

  SerializedItem.belongsTo(InventoryItem, {
    foreignKey: "inventory_item_id",
    as: "inventoryItem",
  });

  // SerializedItem <-> User (created_by)
  User.hasMany(SerializedItem, {
    foreignKey: "created_by",
    as: "createdSerializedItems",
  });

  SerializedItem.belongsTo(User, {
    foreignKey: "created_by",
    as: "creator",
  });

  // SerialItemDeployment associations
  Deployment.hasMany(SerialItemDeployment, {
    foreignKey: "deployment_id",
    as: "serialItemDeployments",
  });

  SerialItemDeployment.belongsTo(Deployment, {
    foreignKey: "deployment_id",
    as: "deployment",
  });

  SerializedItem.hasMany(SerialItemDeployment, {
    foreignKey: "serialized_item_id",
    as: "deploymentHistory",
  });

  SerialItemDeployment.belongsTo(SerializedItem, {
    foreignKey: "serialized_item_id",
    as: "serializedItem",
  });

  // Many-to-Many through SerialItemDeployment
  Deployment.belongsToMany(SerializedItem, {
    through: SerialItemDeployment,
    as: "deployedSerialItems",
    foreignKey: "deployment_id",
    otherKey: "serialized_item_id",
  });

  SerializedItem.belongsToMany(Deployment, {
    through: SerialItemDeployment,
    as: "deployments",
    foreignKey: "serialized_item_id",
    otherKey: "deployment_id",
  });

  console.log("✅ All model associations have been set up successfully");
};

export default setupAssociations;
