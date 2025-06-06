import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

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
        model: "Cameras", // Use table name instead of model reference
        key: "id",
      },
      onDelete: "CASCADE",
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "users", // Use table name instead of model reference
        key: "id",
      },
    },
    actionType: {
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
      type: DataTypes.ENUM("online", "offline", "unknown"),
      allowNull: true,
    },
    newStatus: {
      type: DataTypes.ENUM("online", "offline", "unknown"),
      allowNull: true,
    },
    description: {
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

export default CameraLog;
