import { DataTypes, UUID } from "sequelize";
import sequelize from "../../config/database.js";

const Deployment = sequelize.define(
  "Deployment",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    inventory_item_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "inventory_items", // Use table name
        key: "id",
      },
    },
    deployed_by: {
      type: DataTypes.UUID,
      references: {
        model: "users", // Use table name
        key: "id",
      },
    },
    deployed_to: {
      type: DataTypes.UUID,
      references: {
        model: "users",
        key: "id",
      },
    },
    deployment_type: {
      type: DataTypes.ENUM(
        "EMERGENCY",
        "TRAINING",
        "MAINTENANCE",
        "RELIEF_OPERATION"
      ),
      allowNull: false,
    },
    quantity_deployed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    deployment_location: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    deployment_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    expected_return_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    actual_return_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("DEPLOYED", "RETURNED", "LOST", "DAMAGED"),
      defaultValue: "DEPLOYED",
    },
    incident_type: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
    },
  },
  {
    timestamps: true,
    paranoid: true,
    tableName: "deployments",
    indexes: [
      { fields: ["inventory_item_id"] },
      { fields: ["deployed_by"] },
      { fields: ["deployed_to"] },
      { fields: ["deployment_type"] },
      { fields: ["status"] },
      { fields: ["deployment_date"] },
      { fields: ["deletedAt"] },
    ],
  }
);

export default Deployment;
