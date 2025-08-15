/**
 * @file wikipediaService.js
 * @description Provides functions to fetch and cache Wikipedia summaries for city names, and utility to trim long descriptions.
 */

const redisClient = require("../utils/redisCache");
const axios = require("axios");

function trimDescriptionByWords(text, maxLength = 250) {
  if (!text) return "";
  const words = text.trim().split(/\s+/);
  let result = "";
  for (const word of words) {
    if ((result + " " + word).trim().length > maxLength) break;
    result = (result + " " + word).trim();
  }
  if (result.length < text.length) result += "...";
  return result;
}

function normalizeForWikipedia(title) {
  const lowercaseWords = new Set([
    "de",
    "del",
    "la",
    "el",
    "las",
    "los",
    "sur",
    "sous",
    "du",
    "le",
    "les",
    "et",
    "a",
    "of",
    "in",
  ]);
  title = decodeURIComponent(title);
  title = title
    .toLowerCase()
    .split(/([\s-])/)
    .map((word, idx) => {
      if (/^[\s-]$/.test(word)) return word;
      if (lowercaseWords.has(word) && idx > 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join("");
  return encodeURIComponent(title);
}

async function getWikipediaSummary(title) {
  const cached = await redisClient.get(`wikiCache:${title}`);
  if (cached) return cached;
  try {
    const wikiTitle = normalizeForWikipedia(title);
    const resp = await axios.get(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${wikiTitle}`,
      {
        timeout: 10000,
        headers: { "accept-language": "en" },
      }
    );
    const description = (resp?.data?.extract || "").trim();
    await redisClient.set(`wikiCache:${title}`, description, { EX: 3600 });
    return description;
  } catch (error) {
    console.error(`Wikipedia fetch failed for ${title}:, ${error.message}`);
    return "";
  }
}

module.exports = { getWikipediaSummary, trimDescriptionByWords };
