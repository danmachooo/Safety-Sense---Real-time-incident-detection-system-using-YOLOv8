const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Incident = sequelize.define('Incident', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    cameraId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Cameras',
            key: 'id',
        },
        onDelete: 'SET NULL',
    },
    reportedBy: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    contact: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    type: {
        type: DataTypes.ENUM('Fire', 'Accident', 'Medical', 'Crime', 'Flood', 'Other'),
        allowNull: false,
    },
    snapshotUrl: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isUrl: true,
        },
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('pending', 'verified', 'accepted', 'resolved', 'dismissed'),
        defaultValue: 'pending',
    },
    longitude: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    latitude: {
        type: DataTypes.STRING,
        allowNull: false,
    },
}, {
    tableName: 'Incidents',
    timestamps: true,
    paranoid: true,
    indexes: [
        { fields: ['cameraId'] },
        { fields: ['type'] },
        { fields: ['status'] },
        { fields: ['reportedBy'] },
    ],
});

// Export the model
module.exports = Incident;