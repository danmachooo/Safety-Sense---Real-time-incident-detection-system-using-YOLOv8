const Category = require("./Category");
const InventoryItem = require("./InventoryItem");
const Batch = require("./Batch");
const User = require("../Users/User");
const Deployment = require("./Deployment");
const Notification = require("./InventoryNotification"); // 🔹 Added Notification model

// ✅ Category & InventoryItem Relationship
Category.hasMany(InventoryItem, {
  foreignKey: "category_id",
  as: "inventoryItems",
});

InventoryItem.belongsTo(Category, {
  foreignKey: "category_id",
  as: "category",
});

// ✅ InventoryItem & Batch Relationship
InventoryItem.hasMany(Batch, {
  foreignKey: "inventory_item_id",
  as: "batches",
});

Batch.belongsTo(InventoryItem, {
  foreignKey: "inventory_item_id",
  as: "inventoryBatchItem", // 🔹 Unique alias
});

// ✅ User & Batch Relationship
User.hasMany(Batch, {
  foreignKey: "received_by",
  as: "batches",
});

Batch.belongsTo(User, {
  foreignKey: "received_by",
  as: "receiver",
});

// ✅ InventoryItem & Deployment Relationship
InventoryItem.hasMany(Deployment, {
  foreignKey: "inventory_item_id",
  as: "deployments",
});

Deployment.belongsTo(InventoryItem, {
  foreignKey: "inventory_item_id",
  as: "inventoryDeploymentItem", // 🔹 Unique alias
});

// ✅ User & Deployment Relationship (FIXED)
User.hasMany(Deployment, {
  foreignKey: "deployed_by",
  as: "deployments",
});

Deployment.belongsTo(User, {
  foreignKey: "deployed_by",
  as: "deployer", // ✅ Correct alias to match query
});

// ✅ InventoryItem & Notification Relationship (NEW)
InventoryItem.hasMany(Notification, {
  foreignKey: "inventory_item_id",
  as: "notifications",
});

Notification.belongsTo(InventoryItem, {
  foreignKey: "inventory_item_id",
  as: "inventoryNotificationItem", // ✅ Matching alias for querying
});

// ✅ User & Notification Relationship (NEW)
User.hasMany(Notification, {
  foreignKey: "user_id",
  as: "notifications",
});

Notification.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

module.exports = {
  Category,
  InventoryItem,
  Batch,
  User,
  Deployment,
  Notification,
};
