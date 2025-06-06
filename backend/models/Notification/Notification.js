import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

const Notification = sequelize.define(
  "Notification",
  {
    userId: {
      type: DataTypes.INTEGER,
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
        "CAMERA_REMOVED"
      ),
      allowNull: false,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    entityType: {
      type: DataTypes.ENUM("User", "Inventory", "Camera"),
      allowNull: false,
    },
    entityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
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
    ],
  }
);

export default Notification;
