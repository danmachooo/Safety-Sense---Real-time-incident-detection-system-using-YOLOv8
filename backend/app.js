import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { setupCronJobs } from "./cron.js";
import errorHandlerMiddleware from "./middlewares/errorHandlerMiddleware.js";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

import apiRouter from "./routes/api.js";

// Middlewares
app.use(
  cors({
    origin: process.env.FRONTEND_DOMAIN,
    credentials: true,
  })
);
app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
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

// Serve static files from the uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api", apiRouter);

// Error handler
app.use(errorHandlerMiddleware);

// Setup cron jobs
setupCronJobs();

// Start backend
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`File uploads will be stored in: ${path.resolve(uploadsDir)}`);
});
