import { invalidateCachePattern } from "../../../services/redis/cache.js";

export const invalidateItemsCache = async () => {
  try {
    // Invalidate all cache keys that start with "items:"
    const result = await invalidateCachePattern("items:*");
    if (!result) {
      console.log("Failed to invalidate items cache pattern");
    }
    return result;
  } catch (error) {
    console.error("Error invalidating items cache:", error);
    return false;
  }
};
