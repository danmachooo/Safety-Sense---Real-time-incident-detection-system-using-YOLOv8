const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const User = sequelize.define('Users', {
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
  firstname: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true, 
    },
    comment: 'The first name of the user',
  },
  lastname: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true, 
    },
    comment: 'The last name of the user',
  },
  role: {
    type: DataTypes.ENUM('rescuer', 'admin'),
    defaultValue: 'rescuer',
    validate: {
      isIn: [['rescuer', 'admin']], 
    },
    comment: 'The role of the user (rescuer, admin)',
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