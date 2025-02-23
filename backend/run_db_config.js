const sequelize = require('./config/database'); // Import Sequelize instance

// Import Models
const User = require('./models/Users/User');
const LoginHistory = require('./models/Users/LoginHistory');
const Camera = require('./models/Incidents/Camera'); // ✅ Camera Model
const CameraStatus = require('./models/Incidents/CameraHealthCheck'); // ✅ Camera Status
const CameraLog = require('./models/Incidents/CameraLog'); // ✅ Camera Status
const Incident = require('./models/Incidents/Incident');
const Notification = require('./models/Notification/Notification');


const InventoryItem = require('./models/Inventory/InventoryItem');
const Batch = require('./models/Inventory/Batch');
const Category = require('./models/Inventory/Category');
const Deployment = require('./models/Inventory/Deployment');
const invNotification = require('./models/Inventory/InventoryNotification');

// Sync models with database
sequelize.sync({ alter: true }) // Use { force: true } in development only!
  .then(() => console.log('✅ Database synced successfully.'))
  .catch(err => console.error('❌ Sync error:', err));
