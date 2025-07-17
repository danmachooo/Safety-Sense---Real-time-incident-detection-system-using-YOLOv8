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

const setCache = async (cacheKey, cachedValue, expire = 30) => {
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
      // Use pipeline for better performance
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

// New utility function to invalidate multiple patterns at once
const invalidateMultiplePatterns = async (patterns) => {
  try {
    const redis = await getRedisClient();
    if (!redis) {
      console.warn("Redis client not available");
      return false;
    }

    const allKeys = new Set();

    // Collect all keys matching all patterns
    for (const pattern of patterns) {
      const keys = await redis.keys(pattern);
      keys.forEach((key) => allKeys.add(key));
    }

    if (allKeys.size > 0) {
      const pipeline = redis.multi();
      allKeys.forEach((key) => {
        pipeline.del(key);
      });
      await pipeline.exec();
      console.log(
        `Invalidated ${
          allKeys.size
        } cache keys matching patterns: ${patterns.join(", ")}`
      );
      return true;
    } else {
      console.log(
        `No cache keys found matching patterns: ${patterns.join(", ")}`
      );
      return true;
    }
  } catch (error) {
    console.error("Error invalidating multiple cache patterns:", error);
    return false;
  }
};

// Cache invalidation helpers for specific entities
const invalidateBatchCache = async (itemId = null) => {
  const patterns = ["batch:*"];

  if (itemId) {
    patterns.push(`inventory:item:${itemId}*`);
  }

  patterns.push("inventory:*");

  return await invalidateMultiplePatterns(patterns);
};

const invalidateInventoryCache = async (itemId = null) => {
  const patterns = ["inventory:*", "category:*"];

  if (itemId) {
    patterns.push(`inventory:item:${itemId}*`);
  }

  return await invalidateMultiplePatterns(patterns);
};

const invalidateCategoryCache = async () => {
  return await invalidateMultiplePatterns(["category:*", "inventory:*"]);
};

// Export all functions
export {
  getCached,
  setCache,
  invalidateCache,
  invalidateCachePattern,
  invalidateMultiplePatterns,
  invalidateBatchCache,
  invalidateInventoryCache,
  invalidateCategoryCache,
};
