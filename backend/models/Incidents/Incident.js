const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');
const Camera = require('./Camera');

const Incident = sequelize.define('Incident', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    cameraId: {
      type: DataTypes.INTEGER, // Use INTEGER to match Cameras.id
      allowNull: false,
      references: {
        model: Camera, // Name of the model
        key: 'id',     // Key in Cameras model that cameraId refers to
      },
    },
    snapshotUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  });
  
module.exports = Incident;

