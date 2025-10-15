import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

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
        model: "categories", // Use table name
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
    is_returnable: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Indicates if item requires individual serial number tracking",
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
      { fields: ["name"] },
      { fields: ["category_id"] },
      { fields: ["is_deployable"] },
      { fields: ["is_active"] },
      { fields: ["deletedAt"] },
    ],
  }
);

export default InventoryItem;
