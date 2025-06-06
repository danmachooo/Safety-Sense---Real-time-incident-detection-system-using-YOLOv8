// const sequelize = require("./config/database");
// require("./models"); // Importing this will auto-associate models

import sequelize from "./config/database.js";
import "./models/index.js";

sequelize
  .sync({ alter: true })
  .then(() => console.log("✅ Database synced successfully."))
  .catch((err) => console.error("❌ Sync error:", err));
