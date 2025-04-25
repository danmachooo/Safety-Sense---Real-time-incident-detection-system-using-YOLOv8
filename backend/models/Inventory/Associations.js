const InventoryItem = require('./InventoryItem');
const ActionLog = require('./ActionLog');
const Category = require('./Category');

// Define Associations
InventoryItem.hasMany(ActionLog, {
  foreignKey: 'itemId',
  onDelete: 'CASCADE'
});

ActionLog.belongsTo(InventoryItem, {
  foreignKey: 'itemId',
  onDelete: 'CASCADE'
});

// InventoryItem belongs to Category
InventoryItem.belongsTo(Category, {
  foreignKey: 'categoryId',
  onDelete: 'SET NULL'
});

Category.hasMany(InventoryItem, {
  foreignKey: 'categoryId'
});

module.exports = { InventoryItem, ActionLog, Category };
