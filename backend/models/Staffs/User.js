const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');
 
const User = sequelize.define('User', {
    name: DataTypes.STRING,
    role: {
      type: DataTypes.ENUM('operator', 'rescuer', 'admin'),
      defaultValue: 'rescuer',
    },
    contact: DataTypes.STRING, // Emergency contact info
  });

module.exports = User;