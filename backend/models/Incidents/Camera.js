import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

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
      allowNull: true,
    },
    latitude: {
      type: DataTypes.STRING,
      allowNull: true,
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
export default Camera;
