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
    ipAddress: { // ✅ Ensure correct IP format
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isIP: true,
        }
    },
    rtspUrl: { // ✅ Unique RTSP URL for camera
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    location: { // ✅ Physical location of the camera
        type: DataTypes.STRING,
        allowNull: true,
    },
    model: { // ✅ Physical location of the camera
        type: DataTypes.STRING,
        allowNull: true,
    },
    description: { // ✅ Physical location of the camera
        type: DataTypes.TEXT,
        allowNull: true,
    },
    status: { // ✅ Camera status tracking
        type: DataTypes.ENUM('online', 'offline', 'unknown'),
        defaultValue: 'unknown',
    },
    lastCheckedAt: { // ✅ Last status check timestamp
        type: DataTypes.DATE,
        allowNull: true,
    },
    lastOnlineAt: {  // ✅ NEW FIELD: Stores the last known online time
        type: DataTypes.DATE,
        allowNull: true,
    }
}, {
    tableName: 'Cameras',
    timestamps: true,
    paranoid: true, // ✅ Enables soft deletion
    indexes: [
        { unique: true, fields: ['rtspUrl'] },
        { fields: ['ipAddress'] },
        { fields: ['status'] },
    ],
});

module.exports = Camera;
