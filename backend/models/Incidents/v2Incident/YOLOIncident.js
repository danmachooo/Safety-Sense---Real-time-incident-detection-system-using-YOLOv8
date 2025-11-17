import { DataTypes } from "sequelize";
import sequelize from "../../../config/database.js";
import Incident from "./Incident.js";

const YOLOIncident = sequelize.define(
  "YOLOIncident",
  {
    incidentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Incidents",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    cameraId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    aiType: {
      type: DataTypes.ENUM("car_accident", "fire", "person_fall"),
      allowNull: false,
    },
    confidence: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: { min: 0, max: 1 },
    },
    modelVersion: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    detectionFrameUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    detectedObjects: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    processingTime: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
  },
  {
    tableName: "YOLOIncidents",
    timestamps: true,
    paranoid: true,
  }
);

export default YOLOIncident;
