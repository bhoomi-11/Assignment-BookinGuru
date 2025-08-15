/**
 * @file countriesService.js
 * @description Fetches and caches country → cities mapping and ISO2 codes, using Redis for fast lookup.
 */

const axios = require("axios");
const redisClient = require("../utils/redisCache");

async function getCountryCities() {
  try {
    let countryCities = await redisClient.get("CountryCities");
    let countryCodes = await redisClient.get("CountryCodes");

    if (countryCities && countryCodes) {
      countryCities = JSON.parse(countryCities);
      for (const code in countryCities) {
        countryCities[code] = new Set(
          countryCities[code].map((c) => c.toLowerCase())
        );
      }
      countryCodes = JSON.parse(countryCodes);
      return { countryCities, countryCodes };
    }

    const response = await axios.get(
      "https://countriesnow.space/api/v0.1/countries"
    );
    countryCities = {};
    countryCodes = {};
    for (const item of response.data.data) {
      countryCodes[item.iso2] = item.country;
      countryCities[item.iso2] = new Set(
        item.cities.map((c) => c.toLowerCase())
      );
    }

    await redisClient.set("CountryCodes", JSON.stringify(countryCodes), {
      EX: 216000,
    });
    const countryCitiesToStore = {};
    for (const code in countryCities) {
      countryCitiesToStore[code] = [...countryCities[code]];
    }
    await redisClient.set(
      "CountryCities",
      JSON.stringify(countryCitiesToStore),
      { EX: 216000 }
    );

    return { countryCities, countryCodes };
  } catch (error) {
    console.error("countriesService error:", error);
    return { countryCities: {}, countryCodes: {} };
  }
}

module.exports = { getCountryCities };
