const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database");

const Camera = sequelize.define(
  "Camera",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIP: true,
      },
    },
    rtspUrl: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    longitude: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    latitude: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    model: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("online", "offline", "unknown"),
      defaultValue: "unknown",
    },
    lastCheckedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastOnlineAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "Cameras",
    timestamps: true,
    paranoid: true,
    indexes: [
      { unique: true, fields: ["rtspUrl"] },
      { fields: ["ipAddress"] },
      { fields: ["status"] },
    ],
  }
);

// Export the model
module.exports = Camera;
