const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const User = sequelize.define('User', {
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      isEmail: true, 
      notEmpty: true, 
    },
    comment: 'The email address of the user',
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [8, 100], 
      notEmpty: true, 
    },
    comment: 'The hashed password of the user',
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true, 
    },
    comment: 'The full name of the user',
  },
  role: {
    type: DataTypes.ENUM('operator', 'rescuer', 'admin'),
    defaultValue: 'rescuer',
    validate: {
      isIn: [['operator', 'rescuer', 'admin']], 
    },
    comment: 'The role of the user (operator, rescuer, admin)',
  },
  contact: {
    type: DataTypes.STRING,
    allowNull: true, 
    validate: {
      is: /^\+?[0-9\s\-]+$/, 
    },
    comment: 'Emergency contact information for the user',
  },
}, {
  timestamps: true, 
  underscored: true, 
  tableName: 'users', 
  comment: 'Table for storing user information',
});

module.exports = User;