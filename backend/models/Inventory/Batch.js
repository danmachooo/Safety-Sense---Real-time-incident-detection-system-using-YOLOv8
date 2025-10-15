// const { DataTypes } = require('sequelize');
// const sequelize = require('../../config/database');

import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

const Batch = sequelize.define(
  "Batch",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    inventory_item_id: {
      type: DataTypes.INTEGER,
      allowNull: false, // Ensuring it's required
    },
    batch_number: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },

    supplier: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    received_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    received_by: {
      type: DataTypes.UUID,
      allowNull: true, // Ensuring it's required
    },
    funding_source: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    timestamps: true,
    paranoid: true,
    tableName: "batches",
    indexes: [
      {
        unique: true,
        fields: ["batch_number"],
      },
      {
        fields: ["inventory_item_id"],
      },

      {
        fields: ["received_date"],
      },
      {
        fields: ["received_by"],
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

export default Batch;
