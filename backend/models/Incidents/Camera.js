const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Camera = sequelize.define('Camera', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: DataTypes.STRING,
    rtspUrl: DataTypes.STRING,
  }, {
    tableName: 'Camera'
  });
  

module.exports = Camera


  
