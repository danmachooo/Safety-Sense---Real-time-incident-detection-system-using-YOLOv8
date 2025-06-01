// const InventoryItem = require('./InventoryItem');
// const ActionLog = require('./ActionLog');
// const Category = require('./Category');

import InventoryItem from "./InventoryItem.js";
import ActionLog from "./ActionLog.js";
import Category from "./Category.js";

// Define Associations
InventoryItem.hasMany(ActionLog, {
  foreignKey: "itemId",
  onDelete: "CASCADE",
});

ActionLog.belongsTo(InventoryItem, {
  foreignKey: "itemId",
  onDelete: "CASCADE",
});

// InventoryItem belongs to Category
InventoryItem.belongsTo(Category, {
  foreignKey: "categoryId",
  onDelete: "SET NULL",
});

Category.hasMany(InventoryItem, {
  foreignKey: "categoryId",
});

export default { InventoryItem, ActionLog, Category };
