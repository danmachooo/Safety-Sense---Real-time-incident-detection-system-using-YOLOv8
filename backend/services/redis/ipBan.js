import getRedisClient from "../../config/redis.js";

const OFFENSE_KEY = (ip) => `ip:offense:${ip}`;
const COOLDOWN_KEY = (ip) => `ip:cooldown:${ip}`;
const BAN_KEY = (ip) => `ip:ban:${ip}`;

// =============================
// CHECK STATUS
// =============================
export const checkIpStatus = async (ip) => {
  const redis = await getRedisClient();
  if (!redis) {
    console.log("Redis failed to open.");
    return "ok"; // fail open
  }
  const isBanned = await redis.exists(BAN_KEY(ip));

  console.log(`IP STATUS for ${ip}: ${isBanned}`);
  if (isBanned) return "banned";

  const isCooldown = await redis.exists(COOLDOWN_KEY(ip));
  if (isCooldown) return "cooldown";

  return "ok";
};

// =============================
// APPLY COOLDOWN
// =============================
export const applyCooldown = async (ip, seconds) => {
  const redis = await getRedisClient();
  if (!redis) return false;
  await redis.setEx(COOLDOWN_KEY(ip), seconds, "1");
  return true;
};

// =============================
// APPLY BAN
// =============================
export const applyBan = async (ip, seconds = null) => {
  const redis = await getRedisClient();
  if (!redis) return false;

  if (seconds) {
    await redis.setEx(BAN_KEY(ip), seconds, "1");
  } else {
    // permanent ban
    await redis.set(BAN_KEY(ip), "1");
  }
  return true;
};

// =============================
// RECORD OFFENSE
// =============================
export const recordOffense = async (ip) => {
  const redis = await getRedisClient();
  if (!redis) return;

  // Increment offense counter
  const offense = await redis.incr(OFFENSE_KEY(ip));
  console.log(`IP ${ip} offense count: ${offense}`);
  await redis.expire(OFFENSE_KEY(ip), 86400); // reset in 24h

  // Escalation logic
  if (offense === 1) {
    await applyCooldown(ip, 300); // 5 minutes
  } else if (offense === 2) {
    await applyCooldown(ip, 1800); // 30 minutes
  } else if (offense === 3) {
    await applyCooldown(ip, 86400); // 24 hours
  } else if (offense >= 5) {
    await applyBan(ip, 604800); // 7 days
  }

  return offense;
};
