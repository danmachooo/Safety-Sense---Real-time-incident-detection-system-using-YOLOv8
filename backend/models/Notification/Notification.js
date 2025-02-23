const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');
const Camera = require('../Incidents/Camera');

const Notification = sequelize.define('Notification', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users', 
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  actionType: {
    type: DataTypes.ENUM(
      'CREATE', 'UPDATE', 'DELETE', 
      'ROLE_CHANGE', 'BLOCK', 'UNBLOCK', 
      'USER_ADDED_BY_ADMIN', 'USER_SELF_REGISTERED', 
      'STOCK_ADJUSTED', 'CAMERA_OFFLINE', 'CAMERA_ONLINE',
      'CAMERA_ADDED', 'CAMERA_REMOVED'
    ),
    allowNull: false,
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  entityType: {
    type: DataTypes.ENUM('User', 'Inventory', 'Camera'),
    allowNull: false,
  },
  entityId: {
    type: DataTypes.INTEGER,
    allowNull: true, // ✅ Can be null if logging general actions
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false, // ✅ Ensure every notification has a description
  },
}, {
  timestamps: true, 
  paranoid: true, // ✅ Enables soft delete (restorable logs)
  tableName: 'notifications',
  indexes: [
    { fields: ['userId'] },
    { fields: ['actionType'] },
    { fields: ['entityType'] },
    { fields: ['isRead'] },
    { fields: ['entityId'] }, // ✅ Add entityId for easier queries
    { fields: ['createdAt'] },
    { fields: ['deletedAt'] },
  ],
});

module.exports = Notification;
