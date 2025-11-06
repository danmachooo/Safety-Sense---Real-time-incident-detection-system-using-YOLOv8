import { DataTypes } from "sequelize";
import sequelize from "../../../config/database.js";
import Incident from "./Incident.js";

const HumanIncident = sequelize.define(
  "HumanIncident",
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
    reportedBy: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    contact: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: { isIP: true },
    },
  },
  {
    tableName: "HumanIncidents",
    timestamps: true,
    paranoid: true,
  }
);

export default HumanIncident;
