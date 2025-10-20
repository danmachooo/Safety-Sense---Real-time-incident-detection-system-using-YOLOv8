import { DataTypes } from "sequelize";
import sequelize from "../../../config/database.js";

const Incident = sequelize.define(
  "Incident",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    reportType: {
      type: DataTypes.ENUM("human", "yolo"),
      allowNull: false,
      defaultValue: "human",
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
      ),
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
    snapshotUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "Incidents",
    timestamps: true,
    paranoid: true,
  }
);

export default Incident;
