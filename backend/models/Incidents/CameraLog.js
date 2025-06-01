// const { DataTypes } = require("sequelize");
// const sequelize = require("../../config/database");

import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";
import Camera from "./Camera.js";
import User from "../Users/User.js"; // ✅ Ensure user tracking

const CameraLog = sequelize.define(
  "CameraLog",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    cameraId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Camera,
        key: "id",
      },
      onDelete: "CASCADE",
    },
    userId: {
      // ✅ Who made the change?
      type: DataTypes.INTEGER,
      allowNull: true, // Can be null if it's an automated system check
      references: {
        model: User,
        key: "id",
      },
    },
    actionType: {
      // ✅ Log type
      type: DataTypes.ENUM(
        "CREATED",
        "UPDATED",
        "DELETED",
        "STATUS_CHANGE",
        "RESTORED"
      ),
      allowNull: false,
    },
    oldStatus: {
      // ✅ Previous status (if applicable)
      type: DataTypes.ENUM("online", "offline", "unknown"),
      allowNull: true,
    },
    newStatus: {
      // ✅ New status after update
      type: DataTypes.ENUM("online", "offline", "unknown"),
      allowNull: true,
    },
    description: {
      // ✅ What exactly changed?
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: "CameraLogs",
    timestamps: true,
    indexes: [
      { fields: ["cameraId"] },
      { fields: ["userId"] },
      { fields: ["actionType"] },
    ],
  }
);

// ✅ Define relationships
CameraLog.belongsTo(Camera, { foreignKey: "cameraId", as: "camera" });
CameraLog.belongsTo(User, { foreignKey: "userId", as: "user" });

export default CameraLog;
