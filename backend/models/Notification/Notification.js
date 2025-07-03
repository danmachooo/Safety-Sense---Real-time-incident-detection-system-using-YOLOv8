import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

const Notification = sequelize.define(
  "Notification",
  {
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    actionType: {
      type: DataTypes.ENUM(
        "CREATE",
        "UPDATE",
        "DELETE",
        "ROLE_CHANGE",
        "BLOCK",
        "UNBLOCK",
        "USER_ADDED_BY_ADMIN",
        "USER_SELF_REGISTERED",
        "STOCK_ADJUSTED",
        "CAMERA_OFFLINE",
        "CAMERA_ONLINE",
        "CAMERA_ADDED",
        "CAMERA_REMOVED",
        "SYSTEM_GENERATED", // Added for system notifications
        "EXPIRING_SOON", // Added for expiry notifications
        "LOW_STOCK" // Added for low stock notifications
      ),
      allowNull: false,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    entityType: {
      type: DataTypes.ENUM(
        "User",
        "Inventory",
        "Camera",
        "INVENTORY_ITEM", // Added for consistency
        "BATCH" // Added for batch-related notifications
      ),
      allowNull: false,
    },
    entityId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    // Optional: Add priority field for better notification management
    priority: {
      type: DataTypes.ENUM("LOW", "MEDIUM", "HIGH"),
      defaultValue: "MEDIUM",
      allowNull: false,
    },
    // Optional: Add title field for better notification display
    title: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    paranoid: true,
    tableName: "notifications",
    indexes: [
      { fields: ["userId"] },
      { fields: ["actionType"] },
      { fields: ["entityType"] },
      { fields: ["isRead"] },
      { fields: ["entityId"] },
      { fields: ["createdAt"] },
      { fields: ["deletedAt"] },
      { fields: ["priority"] }, // Added index for priority
    ],
  }
);

export default Notification;
