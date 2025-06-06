// const rateLimit = require("express-rate-limit");
// const { RedisStore } = require("rate-limit-redis");
// const { getRedisClient } = require("../config/redis");

import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import getRedisClient from "../config/redis.js";
import dotenv from "dotenv";
dotenv.config();

let loginRateLimiter = null;

// Initialize rate limiter
const initializeRateLimiter = async () => {
  try {
    const redisClient = await getRedisClient();

    if (redisClient) {
      console.log("Initializing rate limiter with Redis store");
      loginRateLimiter = rateLimit({
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
        max: parseInt(process.env.RATE_LIMIT_MAX) || 3,
        message: {
          success: false,
          message:
            process.env.RATE_LIMIT_MESSAGE ||
            "Too many login attempts. Please try again later.",
        },
        standardHeaders: true,
        legacyHeaders: false,
        store: new RedisStore({
          sendCommand: (...args) => redisClient.sendCommand(args),
        }),
      });
    } else {
      console.warn("Redis not available, using memory store for rate limiting");
      loginRateLimiter = rateLimit({
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
        max: parseInt(process.env.RATE_LIMIT_MAX) || 3,
        message: {
          success: false,
          message:
            process.env.RATE_LIMIT_MESSAGE ||
            "Too many login attempts. Please try again later.",
        },
        standardHeaders: true,
        legacyHeaders: false,
      });
    }
  } catch (error) {
    console.error("Error initializing rate limiter:", error);
    // Fallback to memory store
    loginRateLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 5,
      message: {
        success: false,
        message: "Too many login attempts. Please try again later.",
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
  }
};

// Initialize immediately
initializeRateLimiter();

// Export a middleware function that uses the initialized rate limiter
const rateLimiterMiddleware = (req, res, next) => {
  if (!loginRateLimiter) {
    console.warn("Rate limiter not initialized, allowing request");
    return next();
  }
  return loginRateLimiter(req, res, next);
};
export default rateLimiterMiddleware;
