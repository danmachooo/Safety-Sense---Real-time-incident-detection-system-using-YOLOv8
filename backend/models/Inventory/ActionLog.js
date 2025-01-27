const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const ActionLog = sequelize.define('ActionLog', {
  action: {
    type: DataTypes.ENUM(
      'create', 
      'update', 
      'delete', 
      'checkout', 
      'checkin', 
      'adjust'
    ),
    allowNull: false
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

// Associations
ActionLog.belongsTo(sequelize.models.InventoryItem, {
  foreignKey: 'itemId',
  onDelete: 'CASCADE'
});

module.exports = ActionLog;