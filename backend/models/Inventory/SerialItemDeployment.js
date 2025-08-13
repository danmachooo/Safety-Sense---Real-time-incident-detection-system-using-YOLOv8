import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

const SerialItemDeployment = sequelize.define(
  "SerialItemDeployment",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    deployment_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "deployments",
        key: "id",
      },
    },
    serialized_item_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "serialized_items",
        key: "id",
      },
    },
    deployed_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    returned_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    return_condition: {
      type: DataTypes.ENUM("GOOD", "FAIR", "DAMAGED", "LOST"),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    paranoid: true,
    tableName: "serial_item_deployments",
    indexes: [
      {
        fields: ["deployment_id"],
      },
      {
        fields: ["serialized_item_id"],
      },
      {
        unique: true,
        fields: ["deployment_id", "serialized_item_id"],
        name: "unique_deployment_serial_item",
      },
      {
        fields: ["deletedAt"],
      },
    ],
  }
);

export default SerialItemDeployment;
