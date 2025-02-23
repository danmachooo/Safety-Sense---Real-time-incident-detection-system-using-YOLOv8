const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');
const Camera = require('./Camera');
const User = require('../Users/User');

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
        onDelete: 'CASCADE',
    },
    detectedBy: { // ✅ Can be NULL if the report is from an anonymous citizen
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: User,
            key: 'id',
        },
    },
    reportedBy: { // ✅ Store anonymous citizen name (optional)
        type: DataTypes.STRING,
        allowNull: true,
    },
    contact: { // ✅ Optional field if citizen provides contact info
        type: DataTypes.STRING,
        allowNull: true,
    },
    type: { // ✅ Incident category
        type: DataTypes.ENUM('Fire', 'Accident', 'Intrusion', 'Vandalism', 'Other'),
        allowNull: false,
    },
    snapshotUrl: { // ✅ Evidence captured by CCTV
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isUrl: true,
        },
    },
    description: { // ✅ Details about the incident
        type: DataTypes.TEXT,
        allowNull: true,
    },
    status: { // ✅ Incident resolution tracking
        type: DataTypes.ENUM('pending', 'verified', 'resolved', 'dismissed'),
        defaultValue: 'pending',
    },
    verifiedBy: { // ✅ Who verified the incident?
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: User,
            key: 'id',
        },
    },
    verifiedAt: { // ✅ Timestamp when verified
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'Incidents',
    timestamps: true,
    paranoid: true, // ✅ Enables soft delete (for restoring deleted logs)
    indexes: [
        { fields: ['cameraId'] },
        { fields: ['type'] },
        { fields: ['status'] },
        { fields: ['verifiedBy'] },
        { fields: ['reportedBy'] }, // ✅ Index for anonymous reports
    ],
});

// ✅ Define Relationships
Incident.belongsTo(Camera, { foreignKey: 'cameraId', as: 'camera' });
Incident.belongsTo(User, { foreignKey: 'detectedBy', as: 'detector' }); // ✅ Optional
Incident.belongsTo(User, { foreignKey: 'verifiedBy', as: 'verifier' }); // ✅ For verified incidents

module.exports = Incident;
