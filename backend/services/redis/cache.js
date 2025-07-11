// const { getRedisClient } = require("../../config/redis");

import getRedisClient from "../../config/redis.js";

const getCached = async (cachedKey) => {
  try {
    const redis = await getRedisClient();
    if (!redis) {
      console.warn("Redis client not available");
      return null;
    }

    const result = await redis.get(cachedKey);
    return result ? JSON.parse(result) : null;
  } catch (error) {
    console.error("Error getting cached data:", error);
    return null;
  }
};

const setCache = async (cacheKey, cachedValue, expire = 60) => {
  try {
    const redis = await getRedisClient();
    if (!redis) {
      console.warn("Redis client not available");
      return false;
    }

    const res = await redis.setEx(
      cacheKey,
      expire,
      JSON.stringify(cachedValue)
    );

    return res === "OK";
  } catch (error) {
    console.error("Error setting cache:", error);
    return false;
  }
};

const invalidateCache = async (cacheKey) => {
  try {
    const redis = await getRedisClient();
    if (!redis) {
      console.warn("Redis client not available");
      return false;
    }

    // If it looks like a pattern (contains *), use pattern matching
    if (cacheKey.includes("*")) {
      return await invalidateCachePattern(cacheKey);
    }

    // Otherwise, delete the single key
    const result = await redis.del(cacheKey);
    console.log(`Invalidated cache key: ${cacheKey}`);
    return result > 0;
  } catch (error) {
    console.error("Error invalidating cache:", error);
    return false;
  }
};

const invalidateCachePattern = async (pattern) => {
  try {
    const redis = await getRedisClient();
    if (!redis) {
      console.warn("Redis client not available");
      return false;
    }
    const keys = await redis.keys(pattern);

    if (keys.length > 0) {
      const pipeline = redis.multi();
      keys.forEach((key) => {
        pipeline.del(key);
      });
      await pipeline.exec();
      console.log(
        `Invalidated ${keys.length} cache keys matching pattern: ${pattern}`
      );
      return true;
    } else {
      console.log(`No cache keys found matching pattern: ${pattern}`);
      return true;
    }
  } catch (error) {
    console.error("Error invalidating cache pattern:", error);
    return false;
  }
};

// In your cache service file - update the export line
export { getCached, setCache, invalidateCache, invalidateCachePattern };
