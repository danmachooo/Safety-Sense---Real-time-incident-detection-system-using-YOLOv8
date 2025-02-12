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
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false, // Initially false until verified
  },
  verificationToken: {
    type: DataTypes.STRING,
    allowNull: true, // Stores the token for email verification
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [8, 100], 
      notEmpty: true, 
    },
  },
  resetPasswordToken: {
    type: DataTypes.STRING,
    allowNull: true, // Stores the token for resetting passwords
  },
  resetPasswordExpires: {
    type: DataTypes.DATE,
    allowNull: true, // Expiration date for password reset token
  },
  firstname: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true, 
    },
  },
  lastname: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true, 
    },
  },
  role: {
    type: DataTypes.ENUM('rescuer', 'admin'),
    defaultValue: 'rescuer',
    validate: {
      isIn: [['rescuer', 'admin']], 
    },
  },
  isBlocked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  contact: {
    type: DataTypes.STRING,
    allowNull: true, 
    validate: {
      is: /^\+?[0-9\s\-]+$/, 
    },
  },
}, {
  timestamps: true, 
  underscored: true, 
  paranoid: true,
  tableName: 'users', 
  indexes: [
    {
      unique: true,
      fields: ['email'],
    }, 
    {
      fields: ['firstname'],
    },
    {
      fields: ['lastname'],
    },
    {
      fields: ['isBlocked'],
    },
    {
      fields: ['deletedAt']
    }
  ]
});

module.exports = User;
