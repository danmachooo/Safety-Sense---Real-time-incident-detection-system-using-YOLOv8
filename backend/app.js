import express from "express";
import cors from "cors";
import helmet from "helmet"; // Add this import
import errorHandlerMiddleware from "./middlewares/errorHandlerMiddleware.js";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import apiRouter from "./routes/api.js";

// Load environment variables
dotenv.config();

const app = express();

// Configure Helmet to work with CORS
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  })
);

// Debug: Log environment variables
console.log("Environment variables:");
console.log(
  "FRONTEND_DOMAIN_NOT_SECURE:",
  process.env.FRONTEND_DOMAIN_NOT_SECURE
);
console.log("FRONTEND_DOMAIN_SECURE:", process.env.FRONTEND_DOMAIN_SECURE);
console.log("FRONTEND_LOCAL:", process.env.FRONTEND_LOCAL);

const allowedOrigins = [
  process.env.FRONTEND_DOMAIN_NOT_SECURE || "http://safetysense.team",
  process.env.FRONTEND_DOMAIN_SECURE || "https://www.safetysense.team",
  process.env.FRONTEND_LOCAL || "http://localhost:5173",
];

console.log("Allowed origins:", allowedOrigins);

// CORS Configuration
app.use(
  cors({
    origin: function (origin, callback) {
      console.log("Request origin:", origin);

      // Allow requests with no origin (like Postman, mobile apps, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        console.log("Origin allowed:", origin);
        return callback(null, true);
      } else {
        console.log("Origin blocked:", origin);
        const msg = `The CORS policy for this site does not allow access from origin: ${origin}`;
        return callback(new Error(msg), false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
    exposedHeaders: ["Set-Cookie"],
    optionsSuccessStatus: 200,
  })
);

// Other middlewares
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api", apiRouter);

// Error handler
app.use(errorHandlerMiddleware);

// Start backend
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`File uploads will be stored in Supabase storage`);
  console.log("CORS enabled for origins:", allowedOrigins);
});
