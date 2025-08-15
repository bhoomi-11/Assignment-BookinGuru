/**
 * @file redisCache.js
 * @description Creates and exports a Redis client instance, handling connection and error events for caching purposes.
 */

const redis = require("redis");

const redisClient = redis.createClient({ url: "redis://127.0.0.1:6379" });
redisClient.setMaxListeners(20);


redisClient.on("error", (err) => {
  console.log("Redis Client Error", err);
});

(async function () {
  try {
    await redisClient.connect();
    console.log("Redis Client Connected");
  } catch (error) {
    console.error("Error while connecting to Redis", error);
  }
})();

module.exports = redisClient;
