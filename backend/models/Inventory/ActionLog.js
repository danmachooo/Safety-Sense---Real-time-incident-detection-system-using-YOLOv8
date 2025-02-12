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
  },
  itemId: {
    type: DataTypes.INTEGER, 
    allowNull: false
  }
}, {
  tableName: 'ActionLog',
  indexes: [
    {
        fields: ['action'], 
    }, 
    {
      fields: ['userId'],
    },
    {
      fields: ['itemId']
    }
    
],
});

module.exports = ActionLog;
