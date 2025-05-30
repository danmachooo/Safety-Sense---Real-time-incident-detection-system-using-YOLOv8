const errorHandlerMiddleware = require("./middlewares/ErrorHandlerMiddleware");
const express = require("express");
const cors = require("cors");
const path = require("path"); // Added for path handling
const setupCronJobs = require("./cron");
const cookieParser = require("cookie-parser");

const app = express();

const apiRouter = require("./routes/api");

require("dotenv").config();

// Middlewares
app.use(
  cors({
    origin: process.env.FRONTEND_DOMAIN || "http://localhost:5173",
    credentials: true,
  })
);
app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api", apiRouter);

// Error handler
app.use(errorHandlerMiddleware);

setupCronJobs();

// Create uploads directory if it doesn't exist
const fs = require("fs");
const uploadsDir = path.join(__dirname, "uploads");
const incidentsDir = path.join(uploadsDir, "incidents");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("Created uploads directory");
}

if (!fs.existsSync(incidentsDir)) {
  fs.mkdirSync(incidentsDir, { recursive: true });
  console.log("Created incidents uploads directory");
}

// Start backend
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`File uploads will be stored in: ${path.resolve(uploadsDir)}`);
});
