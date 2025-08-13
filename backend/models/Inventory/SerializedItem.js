import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

const SerializedItem = sequelize.define(
  "SerializedItem",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    serial_number: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      },
      comment:
        "Unique serial number format: [CategoryCode]-[BatchNumber]-[YYMMDD]-[Sequence]",
    },
    batch_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "batches",
        key: "id",
      },
    },
    inventory_item_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "inventory_items",
        key: "id",
      },
    },
    status: {
      type: DataTypes.ENUM(
        "AVAILABLE",
        "DEPLOYED",
        "MAINTENANCE",
        "LOST",
        "DAMAGED",
        "RETIRED",
        "PARTIAL_RETURN"
      ),
      defaultValue: "AVAILABLE",
      allowNull: false,
    },
    deployed_to: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "Location or person item is deployed to",
    },
    deployed_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    return_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    condition_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.UUID, // Changed to UUID to match your User model
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    last_maintenance_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    next_maintenance_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    paranoid: true,
    tableName: "serialized_items",
    indexes: [
      {
        unique: true,
        fields: ["serial_number"],
      },
      {
        fields: ["batch_id"],
      },
      {
        fields: ["inventory_item_id"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["deployed_date"],
      },
      {
        fields: ["deletedAt"],
      },
    ],
  }
);

export default SerializedItem;
