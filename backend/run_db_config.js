const Incident = require('./models/Incidents/Incident'); 
const Camera = require('./models/Incidents/Camera'); 
const InventoryItem = require('./models/Inventory/InventoryItem');
const ActionLog = require('./models/Inventory/ActionLog');
const User = require('./models/Staffs/User');

const sequelize = require('./config/database');

// Sync models with the database
sequelize.sync({ force: true }) // Use { force: true } to drop and recreate tables (dev only!)
  .then(() => console.log('Database synced'))
  .catch(err => console.error('Sync error:', err))
