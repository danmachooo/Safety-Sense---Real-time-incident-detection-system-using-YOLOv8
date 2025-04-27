const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database");

const IncidentDismissal = sequelize.define(
  "IncidentDismissal",
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
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    dismissedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    reason: {
      type: DataTypes.STRING, // Optional: reason for dismissal (like "false alarm", "duplicate report", etc.)
      allowNull: true,
    },
  },
  {
    tableName: "IncidentDismissals",
    timestamps: false,
    indexes: [{ fields: ["incidentId"] }, { fields: ["userId"] }],
  }
);

module.exports = IncidentDismissal;
