/**
 * @file pollutionService.js
 * @description Handles fetching pollution data from the external API, with Redis caching and token management.
 */

const axios = require("axios");
const redisClient = require("../utils/redisCache");
const config = require("../config");

async function fetchPollutedCities(country) {
  const cacheKey = `pollution:list:${country}`;
  let cached = await redisClient.get(cacheKey);
  if (cached) return JSON.parse(cached);

  let token = await redisClient.get("pollution:token");

  if (!token) {
    try {
      if (config.REFRESH_TOKEN) {
        const resp = await axios.post(
          `${config.BASE_URL}${config.AUTH_REFRESH_PATH}`,
          {
            refreshToken: config.REFRESH_TOKEN,
          }
        );
        token = resp.data.token;
        await redisClient.set("pollution:token", token, { EX: 60 });
      } else {
        const resp = await axios.post(
          `${config.BASE_URL}${config.AUTH_LOGIN}`,
          {
            username: config.API_USERNAME,
            password: config.API_PASSWORD,
          }
        );
        token = resp.data.token;
        await redisClient.set("pollution:token", token, { EX: 60 });
        config.REFRESH_TOKEN = resp.data.refreshToken;
      }
    } catch (error) {
      console.error("Pollution token fetch error:", error.message);
      throw new Error("Unable to authenticate with pollution API");
    }
  }

  const result = [];
  let page = 1;
  let totalPages = 1;
  const limit = 10;

  while (page <= totalPages) {
    try {
      const resp = await axios.get(
        `${config.BASE_URL}${config.POLLUTION_PATH}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { country, page, limit },
          timeout: 15000,
        }
      );
      totalPages = resp.data.meta.totalPages || 1;
      result.push(...resp.data.results);
      page++;
    } catch (error) {
      console.error(`Pollution API fetch error:, ${error.message}`);
      break;
    }
  }

  await redisClient.set(cacheKey, JSON.stringify(result), { EX: 216000 });
  return result;
}

module.exports = { fetchPollutedCities };
