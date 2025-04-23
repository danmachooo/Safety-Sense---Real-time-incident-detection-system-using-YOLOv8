const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const IncidentAcceptance = sequelize.define('IncidentAcceptance', {
    incidentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Incidents',
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    acceptedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'IncidentAcceptance',
    timestamps: false,
    indexes: [
        { fields: ['incidentId'] },
        { fields: ['userId'] },
    ],
});

module.exports = IncidentAcceptance;