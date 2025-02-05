const InventoryItem = require('../Inventory/InventoryItem');
const ActionLog = require('../Inventory/ActionLog');

// Define Associations
ActionLog.belongsTo(InventoryItem, {
  foreignKey: 'itemId',
  onDelete: 'CASCADE'
});

module.exports = { InventoryItem, ActionLog };
