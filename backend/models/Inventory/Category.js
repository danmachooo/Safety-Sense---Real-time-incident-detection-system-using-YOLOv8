const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
    }
  },
  description: {
    type: DataTypes.TEXT,
  },
  type: {
    type: DataTypes.ENUM('EQUIPMENT', 'SUPPLIES', 'RELIEF_GOODS', 'VEHICLES', 'COMMUNICATION_DEVICES'),
    allowNull: false,
    validate: {
      notEmpty: true,
    }
  }
}, {
  timestamps: true,
  paranoid: true,
  tableName: 'categories',
  indexes: [
    {
      unique: true,
      fields: ['name']
    },
    {
      fields: ['type']
    },
    {
      fields: ['deletedAt']
    }
  ]
});

module.exports = Category;