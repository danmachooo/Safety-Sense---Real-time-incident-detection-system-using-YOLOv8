// models/associations.js - OPTIMIZED ASSOCIATIONS with redundancy removal

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

  // User -> LoginHistory (One-to-Many)
  User.hasMany(LoginHistory, {
    foreignKey: "userId",
    as: "loginHistory",
    onDelete: "CASCADE",
  });
  LoginHistory.belongsTo(User, {
    foreignKey: "userId",
    as: "user",
  });

  // User -> CameraLog (One-to-Many)
  User.hasMany(CameraLog, {
    foreignKey: "userId",
    as: "cameraLogs",
    onDelete: "SET NULL", // Keep logs even if user is deleted
  });
  CameraLog.belongsTo(User, {
    foreignKey: "userId",
    as: "user",
  });

  // User -> Batch (One-to-Many - received_by)
  User.hasMany(Batch, {
    foreignKey: "received_by",
    as: "receivedBatches",
    onDelete: "SET NULL", // Keep batch records
  });
  Batch.belongsTo(User, {
    foreignKey: "received_by",
    as: "receiver",
  });

  // User -> Deployment (One-to-Many - deployed_by)
  User.hasMany(Deployment, {
    foreignKey: "deployed_by",
    as: "deploymentsMade",
    onDelete: "RESTRICT", // Don't allow deletion of users with deployments
  });
  Deployment.belongsTo(User, {
    foreignKey: "deployed_by",
    as: "deployer",
  });

  // User -> Deployment (One-to-Many - deployed_to)
  User.hasMany(Deployment, {
    foreignKey: "deployed_to",
    as: "deploymentsReceived",
    onDelete: "RESTRICT", // Don't allow deletion of users with deployments
  });
  Deployment.belongsTo(User, {
    foreignKey: "deployed_to",
    as: "recipient", // Changed from 'receiver' to avoid conflict with Batch association
  });

  // User -> SerializedItem (One-to-Many - created_by)
  User.hasMany(SerializedItem, {
    foreignKey: "created_by",
    as: "createdSerializedItems",
    onDelete: "SET NULL", // Keep items even if creator is deleted
  });
  SerializedItem.belongsTo(User, {
    foreignKey: "created_by",
    as: "creator",
  });

  // User -> Notifications (One-to-Many)
  User.hasMany(Notification, {
    foreignKey: "userId",
    as: "notifications",
    onDelete: "CASCADE", // Delete notifications when user is deleted
  });
  Notification.belongsTo(User, {
    foreignKey: "userId",
    as: "user",
  });

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
  // CAMERA & INCIDENT SYSTEM ASSOCIATIONS
  // ========================================

  // Camera -> Incident (One-to-Many)
  Camera.hasMany(Incident, {
    foreignKey: "cameraId",
    as: "incidents",
    onDelete: "SET NULL", // Keep incidents even if camera is deleted
  });
  Incident.belongsTo(Camera, {
    foreignKey: "cameraId",
    as: "camera",
  });

  // Camera -> CameraHealthCheck (One-to-Many)
  Camera.hasMany(CameraHealthCheck, {
    foreignKey: "cameraId",
    as: "healthChecks",
    onDelete: "CASCADE", // Delete health checks when camera is deleted
  });
  CameraHealthCheck.belongsTo(Camera, {
    foreignKey: "cameraId",
    as: "camera",
  });

  // Camera -> CameraLog (One-to-Many)
  Camera.hasMany(CameraLog, {
    foreignKey: "cameraId",
    as: "logs",
    onDelete: "CASCADE", // Delete logs when camera is deleted
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

  // Category -> InventoryItem (One-to-Many)
  Category.hasMany(InventoryItem, {
    foreignKey: "category_id",
    as: "items", // Shorter, clearer alias
    onDelete: "RESTRICT", // Don't allow deletion of categories with items
  });
  InventoryItem.belongsTo(Category, {
    foreignKey: "category_id",
    as: "category",
  });

  // InventoryItem -> Batch (One-to-Many)
  InventoryItem.hasMany(Batch, {
    foreignKey: "inventory_item_id",
    as: "batches",
    onDelete: "CASCADE", // Delete batches when item is deleted
  });
  Batch.belongsTo(InventoryItem, {
    foreignKey: "inventory_item_id",
    as: "item", // Shorter alias
  });

  // InventoryItem -> Deployment (One-to-Many)
  InventoryItem.hasMany(Deployment, {
    foreignKey: "inventory_item_id",
    as: "deployments",
    onDelete: "RESTRICT", // Don't allow deletion of items with active deployments
  });
  Deployment.belongsTo(InventoryItem, {
    foreignKey: "inventory_item_id",
    as: "item", // Shorter alias
  });

  // InventoryItem -> SerializedItem (One-to-Many)
  InventoryItem.hasMany(SerializedItem, {
    foreignKey: "inventory_item_id",
    as: "serializedItems",
    onDelete: "CASCADE", // Delete serialized items when parent item is deleted
  });
  SerializedItem.belongsTo(InventoryItem, {
    foreignKey: "inventory_item_id",
    as: "item", // Shorter alias
  });

  // InventoryItem -> InventoryNotification (One-to-Many)
  InventoryItem.hasMany(InventoryNotification, {
    foreignKey: "inventory_item_id",
    as: "notifications",
    onDelete: "CASCADE", // Delete notifications when item is deleted
  });
  InventoryNotification.belongsTo(InventoryItem, {
    foreignKey: "inventory_item_id",
    as: "item", // Shorter alias
  });

  // InventoryItem -> ActionLog (One-to-Many)
  InventoryItem.hasMany(ActionLog, {
    foreignKey: "itemId",
    as: "actionLogs",
    onDelete: "CASCADE", // Delete logs when item is deleted
  });
  ActionLog.belongsTo(InventoryItem, {
    foreignKey: "itemId",
    as: "item", // Shorter alias
  });

  // ========================================
  // BATCH & SERIALIZED ITEM ASSOCIATIONS
  // ========================================

  // Batch -> SerializedItem (One-to-Many)
  Batch.hasMany(SerializedItem, {
    foreignKey: "batch_id",
    as: "serializedItems",
    onDelete: "CASCADE", // Delete serialized items when batch is deleted
  });
  SerializedItem.belongsTo(Batch, {
    foreignKey: "batch_id",
    as: "batch",
  });

  // ========================================
  // DEPLOYMENT TRACKING ASSOCIATIONS
  // ========================================

  // Deployment -> SerialItemDeployment (One-to-Many)
  Deployment.hasMany(SerialItemDeployment, {
    foreignKey: "deployment_id",
    as: "itemDeployments", // Clearer alias
    onDelete: "CASCADE", // Delete tracking records when deployment is deleted
  });
  SerialItemDeployment.belongsTo(Deployment, {
    foreignKey: "deployment_id",
    as: "deployment",
  });

  // SerializedItem -> SerialItemDeployment (One-to-Many)
  SerializedItem.hasMany(SerialItemDeployment, {
    foreignKey: "serialized_item_id",
    as: "deploymentHistory",
    onDelete: "CASCADE", // Delete deployment history when item is deleted
  });
  SerialItemDeployment.belongsTo(SerializedItem, {
    foreignKey: "serialized_item_id",
    as: "item", // Shorter alias
  });

  // ========================================
  // HELPER ASSOCIATIONS FOR COMPLEX QUERIES
  // ========================================

  // Add convenience association for current deployment
  SerializedItem.hasOne(SerialItemDeployment, {
    foreignKey: "serialized_item_id",
    as: "currentDeployment",
    scope: {
      returned_at: null, // Only get active deployments
    },
  });

  // Add convenience association for latest deployment
  SerializedItem.hasOne(SerialItemDeployment, {
    foreignKey: "serialized_item_id",
    as: "latestDeployment",
    scope: {
      // Will get the latest deployment (active or returned)
    },
    order: [["deployed_at", "DESC"]],
  });

  console.log(
    "✅ All optimized model associations have been set up successfully"
  );
};

export default setupAssociations;
