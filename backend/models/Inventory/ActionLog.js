// const { DataTypes } = require('sequelize');
// const sequelize = require('../../config/database');

import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

const ActionLog = sequelize.define(
  "ActionLog",
  {
    action: {
      type: DataTypes.ENUM(
        "create",
        "update",
        "delete",
        "checkout",
        "checkin",
        "adjust",
        "low_stock_alert"
      ),
      allowNull: false,
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: true, // NULL for system-generated logs (e.g., low stock alerts)
      defaultValue: null,
    },
    itemId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "ActionLogs",
    timestamps: true,
    indexes: [
      { fields: ["action"] },
      { fields: ["userId"] },
      { fields: ["itemId"] },
      { fields: ["createdAt"] }, // New index for tracking logs over time
    ],
  }
);

export default ActionLog;
