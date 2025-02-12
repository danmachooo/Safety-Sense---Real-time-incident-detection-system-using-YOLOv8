const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Camera = sequelize.define('Camera', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false, 
    },
    rtspUrl: {
        type: DataTypes.STRING,
        allowNull: false, 
        unique: true, 
    }
}, {
    tableName: 'Camera',
    indexes: [
        {
            unique: true,
            fields: ['rtspUrl'], 
        }
    ],
    timestamps: true, 
    paranoid: true 
});

module.exports = Camera;
