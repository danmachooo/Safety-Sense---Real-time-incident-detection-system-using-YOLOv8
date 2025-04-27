const setupAssociations = () => {
  // Import models
  const Camera = require("./Incidents/Camera");
  const Incident = require("./Incidents/Incident");
  const User = require("./Users/User");
  const IncidentAcceptance = require("./Incidents/IncidentAcceptance");
  const IncidentDismissal = require("./Incidents/IncidentDismissal");

  // Define Camera <-> Incident association
  Camera.hasMany(Incident, {
    foreignKey: "cameraId",
    as: "incidents",
    onDelete: "SET NULL",
  });

  Incident.belongsTo(Camera, {
    foreignKey: "cameraId",
    as: "camera",
  });

  // Define User <-> Incident many-to-many association
  User.belongsToMany(Incident, {
    through: IncidentAcceptance,
    as: "acceptedIncidents",
    foreignKey: "userId",
    otherKey: "incidentId",
  });

  Incident.belongsToMany(User, {
    through: IncidentAcceptance,
    as: "accepters",
    foreignKey: "incidentId",
    otherKey: "userId",
  });

  // Define User <-> Incident many-to-many association
  User.belongsToMany(Incident, {
    through: IncidentDismissal,
    as: "dismissedIncidents",
    foreignKey: "userId",
    otherKey: "incidentId",
  });

  Incident.belongsToMany(User, {
    through: IncidentDismissal,
    as: "dismissers",
    foreignKey: "incidentId",
    otherKey: "userId",
  });

  console.log("Model associations have been set up successfully");
};

module.exports = setupAssociations;
