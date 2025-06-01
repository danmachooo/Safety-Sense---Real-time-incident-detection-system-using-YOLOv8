import { createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();
let redis = null;

const createRedisClient = async () => {
  if (redis) {
    return redis;
  }

  try {
    const client = createClient({
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
      socket: {
        host: process.env.REDIS_HOST || "localhost",
        port: process.env.REDIS_PORT || 6379,
      },
    });

    client.on("error", (err) => console.log("Redis Client Error", err));
    client.on("connect", () => console.log("Connected to Redis"));
    client.on("ready", () => console.log("Redis client ready"));

    await client.connect();

    // Test connection
    await client.set("connection_test", "success");
    const result = await client.get("connection_test");
    console.log("Redis connection test result:", result);
    console.log("Redis config loaded:", !!client);

    redis = client;
    return client;
  } catch (error) {
    console.error("Failed to connect to Redis:", error);
    return null;
  }
};

// Export the function directly as default
const getRedisClient = async () => {
  if (!redis) {
    redis = await createRedisClient();
  }
  return redis;
};

// Initialize Redis connection
createRedisClient().catch(console.error);

export default getRedisClient;
