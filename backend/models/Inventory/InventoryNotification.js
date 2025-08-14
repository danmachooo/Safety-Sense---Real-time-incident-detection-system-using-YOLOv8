import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

const InventoryNotification = sequelize.define(
  "InventoryNotification",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    notification_type: {
      type: DataTypes.ENUM(
        "LOW_STOCK",
        "EXPIRING_SOON",
        "MAINTENANCE_DUE",
        "DEPLOYMENT_OVERDUE",
        "EQUIPMENT_ISSUE",
        "EQUIPMENT_RETURN",
        "EQUIPMENT_RECOVERY"
      ),
      allowNull: false,
    },
    inventory_item_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "inventory_items", // Use table name
        key: "id",
      },
    },
    user_id: {
      type: DataTypes.UUID,
      references: {
        model: "users", // Use table name
        key: "id",
      },
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    priority: {
      type: DataTypes.ENUM("LOW", "MEDIUM", "HIGH", "CRITICAL"),
      defaultValue: "MEDIUM",
    },
    seen: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    timestamps: true,
    paranoid: true,
    tableName: "inventoryNotifications",
    indexes: [
      { fields: ["notification_type"] },
      { fields: ["inventory_item_id"] },
      { fields: ["user_id"] },
      { fields: ["priority"] },
      { fields: ["seen"] },
      { fields: ["deletedAt"] },
    ],
  }
);

export default InventoryNotification;
