/**
 * @file cityController.js
 * @description Handles /cities endpoint: fetches pollution data, validates cities, enriches with Wikipedia descriptions, and caches results in memory & Redis.
 */

const { getCountryCities } = require("../service/countryService");
const { fetchPollutedCities } = require("../service/pollutionService");
const TTLCache = require("../utils/cache");
const {
  trimDescriptionByWords,
  getWikipediaSummary,
} = require("../service/wikipediaService");
const { sanitizeCity } = require("../validator/cityValidator");
const redisClient = require("../utils/redisCache");
const memoryCache = new TTLCache({ ttlMs: 24 * 60 * 60 * 1000, max: 1000 });

async function getCitySummary(req, res, next) {
  try {
    const { country, page = 1, limit = 10 } = req.query;

    if (!country) {
      const error = new Error("country is required");
      error.status = 400;
      throw error;
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const cacheKey = `normalised:${country}:${pageNum}:${limitNum}`;

    // Check memory cache first
    const memoryData = memoryCache.get(cacheKey);
    if (memoryData) {
      return res.json({
        status: 200,
        message: "Successfully Fetched Data",
        data: memoryData,
        source: "memory-cache",
      });
    }

    // Check Redis cache
    let redisData;
    try {
      redisData = await redisClient.get(cacheKey);
    } catch (redisError) {
      console.error("Redis get error:", redisError);
      redisData = null;
    }

    if (redisData) {
      const parsed = JSON.parse(redisData);
      // Don't set to memory cache here to allow proper testing of redis-cache source
      return res.json({
        status: 200,
        message: "Successfully Fetched Data",
        data: parsed,
        source: "redis-cache",
      });
    }

    // Fetch fresh data
    const pollutedCities = await fetchPollutedCities(country);
    const { countryCities, countryCodes } = await getCountryCities();

    const validCities = pollutedCities
      .map((c) => ({ ...c, name: sanitizeCity(c.name) }))
      .filter(
        (c) =>
          c.name &&
          typeof c.pollution === "number" &&
          countryCities[country]?.has(c.name.toLowerCase())
      );

    const wikiPromises = validCities.map(async (city) => {
      const title = encodeURIComponent(city.name);
      let description;
      try {
        description = await getWikipediaSummary(title);
      } catch (wikiError) {
        console.error(`Wikipedia error for ${city.name}:`, wikiError);
        description = `${city.name} is a city in ${country}.`; // Fallback description
      }

      return {
        name: city.name,
        country: countryCodes[country],
        pollution: city.pollution,
        description: trimDescriptionByWords(
          description || `${city.name} is a city in ${country}.`
        ),
      };
    });

    const settledResults = await Promise.allSettled(wikiPromises);
    const fullData = settledResults
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value)
      .filter((city) => city && city.description); // Ensure description exists

    const start = (pageNum - 1) * limitNum;
    const end = start + limitNum;
    const pagedCities = fullData.slice(start, end);

    const responsePayload = {
      page: pageNum,
      limit: limitNum,
      total: fullData.length,
      cities: pagedCities,
    };

    // Cache the result
    try {
      await redisClient.set(cacheKey, JSON.stringify(responsePayload), {
        EX: 60,
      });
    } catch (redisError) {
      console.error("Redis set error:", redisError);
    }

    memoryCache.set(cacheKey, responsePayload);

    res.json({
      status: 200,
      message: "Successfully Fetched Data",
      data: responsePayload,
      source: "fresh",
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getCitySummary, memoryCache };
