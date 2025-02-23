const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');
const Camera = require('./Camera');

const CameraHealthCheck = sequelize.define('CameraHealthCheck', {
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
        onDelete: 'CASCADE',
    },
    status: { // ✅ Status during the check
        type: DataTypes.ENUM('online', 'offline', 'unknown'),
        allowNull: false,
    },
    checkedAt: { // ✅ When was the check performed?
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    downtimeStart: {  // ✅ NEW FIELD: When camera went offline
        type: DataTypes.DATE,
        allowNull: true,
    },
    downtimeEnd: {  // ✅ NEW FIELD: When camera came back online
        type: DataTypes.DATE,
        allowNull: true,
    }
}, {
    tableName: 'CameraHealthChecks',
    timestamps: false, // ✅ Since this table is just for records, no need for timestamps
    indexes: [
        { fields: ['cameraId'] },
        { fields: ['checkedAt'] },
    ],
});

// ✅ Define relationship
CameraHealthCheck.belongsTo(Camera, { foreignKey: 'cameraId', as: 'camera' });

module.exports = CameraHealthCheck;
