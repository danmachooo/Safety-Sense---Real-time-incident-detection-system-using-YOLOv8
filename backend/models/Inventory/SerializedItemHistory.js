import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

const SerializedItemHistory = sequelize.define(
  "SerializedItemHistory",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    serialized_item_id: { type: DataTypes.INTEGER, allowNull: false },
    deployed_by: { type: DataTypes.UUID, allowNull: true },
    deployed_to: { type: DataTypes.UUID, allowNull: true },
    deployment_id: { type: DataTypes.INTEGER, allowNull: true },
    old_condition: {
      type: DataTypes.ENUM("GOOD", "DAMAGED", "LOST"),
      allowNull: true,
    },
    new_condition: {
      type: DataTypes.ENUM("GOOD", "DAMAGED", "LOST"),
      allowNull: false,
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: "serialized_item_histories",
    timestamps: true, // createdAt, updatedAt
  }
);

export default SerializedItemHistory;
