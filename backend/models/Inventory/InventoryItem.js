// const { DataTypes } = require('sequelize');
// const sequelize = require('../../config/database');
// const Category = require('./Category');

import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";
import Category from "./Category.js";

const InventoryItem = sequelize.define(
  "InventoryItem",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    description: {
      type: DataTypes.TEXT,
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Category,
        key: "id",
      },
    },
    quantity_in_stock: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    min_stock_level: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    unit_of_measure: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    condition: {
      type: DataTypes.ENUM(
        "NEW",
        "GOOD",
        "FAIR",
        "POOR",
        "MAINTENANCE_REQUIRED"
      ),
      defaultValue: "NEW",
    },
    last_maintenance_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    next_maintenance_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    is_deployable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    notes: {
      type: DataTypes.TEXT,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    timestamps: true,
    paranoid: true,
    tableName: "inventory_items",
    indexes: [
      {
        fields: ["name"],
      },
      {
        fields: ["category_id"],
      },
      {
        fields: ["condition"],
      },
      {
        fields: ["is_deployable"],
      },
      {
        fields: ["is_active"],
      },
      {
        fields: ["deletedAt"],
      },
    ],
  }
);

export default InventoryItem;
