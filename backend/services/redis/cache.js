const { getRedisClient } = require("../../config/redis");

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
  return await invalidateCachePattern(`${cacheKey}:*`);
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

module.exports = {
  getCached,
  setCache,
  invalidateCache,
};
