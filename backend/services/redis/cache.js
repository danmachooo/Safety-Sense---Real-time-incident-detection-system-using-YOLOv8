import getRedisClient from "../../config/redis.js";

// Cache operations with better error handling
const getCached = async (cachedKey) => {
  try {
    const redis = await getRedisClient();
    if (!redis) {
      return null; // Fail silently, don't spam logs
    }

    const result = await redis.get(cachedKey);
    return result ? JSON.parse(result) : null;
  } catch (error) {
    // Only log if it's not a connection error (to avoid spam)
    if (
      !error.message.includes("connection") &&
      !error.message.includes("timeout")
    ) {
      console.error("Error getting cached data:", error.message);
    }
    return null;
  }
};

const setCache = async (cacheKey, cachedValue, expire = 30) => {
  try {
    const redis = await getRedisClient();
    if (!redis) {
      return false; // Fail silently
    }

    const res = await redis.setEx(
      cacheKey,
      expire,
      JSON.stringify(cachedValue)
    );

    return res === "OK";
  } catch (error) {
    // Only log if it's not a connection error
    if (
      !error.message.includes("connection") &&
      !error.message.includes("timeout")
    ) {
      console.error("Error setting cache:", error.message);
    }
    return false;
  }
};

const invalidateCache = async (cacheKey) => {
  try {
    const redis = await getRedisClient();
    if (!redis) {
      return false;
    }

    // If it looks like a pattern (contains *), use pattern matching
    if (cacheKey.includes("*")) {
      return await invalidateCachePattern(cacheKey);
    }

    // Otherwise, delete the single key
    const result = await redis.del(cacheKey);
    if (result > 0) {
      console.log(`✅ Invalidated cache key: ${cacheKey}`);
    }
    return result > 0;
  } catch (error) {
    if (
      !error.message.includes("connection") &&
      !error.message.includes("timeout")
    ) {
      console.error("Error invalidating cache:", error.message);
    }
    return false;
  }
};

const invalidateCachePattern = async (pattern) => {
  try {
    const redis = await getRedisClient();
    if (!redis) {
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
        `✅ Invalidated ${keys.length} cache keys matching pattern: ${pattern}`
      );
      return true;
    } else {
      // Don't log when no keys found - it's normal
      return true;
    }
  } catch (error) {
    if (
      !error.message.includes("connection") &&
      !error.message.includes("timeout")
    ) {
      console.error("Error invalidating cache pattern:", error.message);
    }
    return false;
  }
};

// Optimized function to invalidate multiple patterns at once
const invalidateMultiplePatterns = async (patterns) => {
  try {
    const redis = await getRedisClient();
    if (!redis) {
      return false;
    }

    const allKeys = new Set();

    // Collect all keys matching all patterns in parallel
    const keyPromises = patterns.map((pattern) => redis.keys(pattern));
    const keyResults = await Promise.allSettled(keyPromises);

    keyResults.forEach((result, index) => {
      if (result.status === "fulfilled") {
        result.value.forEach((key) => allKeys.add(key));
      } else {
        console.warn(
          `Failed to get keys for pattern ${patterns[index]}:`,
          result.reason.message
        );
      }
    });

    if (allKeys.size > 0) {
      // Use pipeline for batch deletion
      const pipeline = redis.multi();
      allKeys.forEach((key) => {
        pipeline.del(key);
      });

      const results = await pipeline.exec();
      const successCount = results.filter(
        ([err, result]) => !err && result
      ).length;

      console.log(
        `✅ Invalidated ${successCount}/${
          allKeys.size
        } cache keys matching patterns: ${patterns.join(", ")}`
      );
      return successCount > 0;
    }

    return true;
  } catch (error) {
    if (
      !error.message.includes("connection") &&
      !error.message.includes("timeout")
    ) {
      console.error(
        "Error invalidating multiple cache patterns:",
        error.message
      );
    }
    return false;
  }
};

// Cache invalidation helpers for specific entities
const invalidateBatchCache = async (itemId = null) => {
  const patterns = ["batch:*", "inventory:*"];

  if (itemId) {
    patterns.push(`inventory:item:${itemId}*`);
  }

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

// Health check function
const checkCacheHealth = async () => {
  try {
    const redis = await getRedisClient();
    if (!redis) {
      return { status: "disconnected", message: "Redis client not available" };
    }

    await redis.ping();
    return { status: "connected", message: "Redis is healthy" };
  } catch (error) {
    return { status: "error", message: error.message };
  }
};

// Utility to get cache stats
const getCacheStats = async () => {
  try {
    const redis = await getRedisClient();
    if (!redis) {
      return null;
    }

    const info = await redis.info("memory");
    const keyCount = await redis.dbSize();

    return {
      keyCount,
      memoryInfo: info,
    };
  } catch (error) {
    console.error("Error getting cache stats:", error.message);
    return null;
  }
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
  checkCacheHealth,
  getCacheStats,
};
