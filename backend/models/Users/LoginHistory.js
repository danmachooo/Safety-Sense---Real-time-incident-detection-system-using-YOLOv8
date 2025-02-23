const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');
const User = require('./User');

const LoginHistory = sequelize.define('LoginHistory', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users', 
      key: 'id',
    },
    onDelete: 'CASCADE', 
  },
  login: {
    type: DataTypes.DATE,
    allowNull: false, 
    defaultValue: DataTypes.NOW, 
  },
  logout: {
    type: DataTypes.DATE,
    allowNull: true, 
  },
}, {
  tableName: 'LoginHistory', 
  timestamps: false, 
  indexes: [
    { fields: ['userId'] },
    { fields: ['login'] },
    { fields: ['logout'] },
  ],
});


LoginHistory.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
  onDelete: 'CASCADE',
});

module.exports = LoginHistory;
