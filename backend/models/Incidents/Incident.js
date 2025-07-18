// const { DataTypes } = require("sequelize");
// const sequelize = require("../../config/database");

import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

const Incident = sequelize.define(
  "Incident",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    cameraId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "Cameras",
        key: "id",
      },
      onDelete: "SET NULL",
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIP: true,
      },
    },
    reportedBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    contact: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM(
        "Fire",
        "Accident",
        "Medical",
        "Crime",
        "Flood",
        "Other"
      ),
      allowNull: false,
    },
    snapshotUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(
        "pending",
        "accepted",
        "ongoing",
        "resolved",
        "dismissed"
      ), // keep dismissed for "globally dismissed"
      defaultValue: "pending",
    },
    longitude: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    latitude: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "Incidents",
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ["cameraId"] },
      { fields: ["type"] },
      { fields: ["status"] },
      { fields: ["reportedBy"] },
    ],
  }
);

export default Incident;
