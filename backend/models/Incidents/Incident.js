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
      type: DataTypes.INTEGER,  
      allowNull: false,
      references: {
        model: Camera, 
        key: 'id',     
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
  }, {

  });
  
module.exports = Incident

