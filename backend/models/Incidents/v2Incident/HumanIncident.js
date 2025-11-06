import { DataTypes } from "sequelize";
import sequelize from "../../../config/database.js";
import Incident from "./Incident.js";

const HumanIncident = sequelize.define(
  "HumanIncident",
  {
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

// Association with base Incident
HumanIncident.belongsTo(Incident, { foreignKey: "incidentId", as: "incident" });
Incident.hasOne(HumanIncident, {
  foreignKey: "incidentId",
  as: "humanDetails",
});

export default HumanIncident;
