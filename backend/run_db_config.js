const sequelize = require("./config/database");
require("./models"); // Importing this will auto-associate models

sequelize
  .sync({ alter: false })
  .then(() => console.log("✅ Database synced successfully."))
  .catch((err) => console.error("❌ Sync error:", err));
