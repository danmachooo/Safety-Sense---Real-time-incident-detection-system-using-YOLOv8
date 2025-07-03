import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

const LoginHistory = sequelize.define(
  "LoginHistory",
  {
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    login: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    logout: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "LoginHistory",
    timestamps: false,
    indexes: [
      { fields: ["userId"] },
      { fields: ["login"] },
      { fields: ["logout"] },
    ],
  }
);
export default LoginHistory;
