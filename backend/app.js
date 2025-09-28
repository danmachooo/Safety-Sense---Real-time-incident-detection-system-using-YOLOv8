import express from "express";
import cors from "cors";
import errorHandlerMiddleware from "./middlewares/errorHandlerMiddleware.js";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import apiRouter from "./routes/api.js";

// Load environment variables
dotenv.config();

const app = express();
app.use(helmet());

// Middlewares
const allowedOrigins = [
  process.env.FRONTEND_DOMAIN_NOT_SECURE || "http://safetysense.team",
  process.env.FRONTEND_DOMAIN_SECURE || "https://www.safetysense.team",
  process.env.FRONTEND_LOCAL || "http://localhost:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true, // if using cookies/auth headers
  })
);
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
});
