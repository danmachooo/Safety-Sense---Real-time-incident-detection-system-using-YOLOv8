import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

const CameraHealthCheck = sequelize.define(
  "CameraHealthCheck",
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
    status: {
      type: DataTypes.ENUM("online", "offline", "unknown"),
      allowNull: false,
    },
    checkedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    downtimeStart: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    downtimeEnd: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "CameraHealthChecks",
    timestamps: false,
    indexes: [{ fields: ["cameraId"] }, { fields: ["checkedAt"] }],
  }
);

export default CameraHealthCheck;
