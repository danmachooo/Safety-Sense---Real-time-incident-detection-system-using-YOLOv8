// const { DataTypes } = require("sequelize");
// const sequelize = require("../../config/database");

import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

const User = sequelize.define(
  "Users",
  {
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true,
        notEmpty: true,
      },
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    verificationToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [8, 100],
        notEmpty: true,
      },
    },
    resetPasswordToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    accessToken: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      unique: true,
      unique: true,
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    firstname: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    lastname: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    role: {
      type: DataTypes.ENUM("rescuer", "admin"),
      defaultValue: "rescuer",
      validate: {
        isIn: [["rescuer", "admin"]],
      },
    },
    fcmToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isBlocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    contact: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        is: /^\+?[0-9\s\-]+$/,
      },
    },
  },
  {
    timestamps: true,
    paranoid: true,
    tableName: "users",
    indexes: [
      {
        unique: true,
        fields: ["email"],
      },
      {
        fields: ["firstname"],
      },
      {
        fields: ["lastname"],
      },
      {
        fields: ["isBlocked"],
      },
      {
        fields: ["deletedAt"],
      },
    ],
  }
);

// We'll set up associations in the models/index.js file instead of here
export default User;
