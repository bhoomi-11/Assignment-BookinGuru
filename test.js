const request = require("supertest");
const express = require("express");
const sinon = require("sinon");
const { getCitySummary, memoryCache } = require("./controller/cityController");
const wikiService = require("./service/wikipediaService");
const redisClient = require("./utils/redisCache");
const { errorHandler } = require("./middleware/errorHandler");

describe("getCitySummary Controller", () => {
  const mockCountry = "PL";
  const mockCitiesData = [
    { name: "Warsaw", pollution: 80 },
    { name: "Krakow", pollution: 75 },
  ];

  beforeEach(() => {
    memoryCache.clear(); // Ensure memory cache is empty
    sinon.stub(redisClient, "get").resolves(null);
    sinon.stub(redisClient, "set").resolves(null);
    sinon
      .stub(wikiService, "getWikipediaSummary")
      .callsFake(async (city) => `${city} description`);
  });

  afterEach(() => {
    sinon.restore();
  });

  test("should return 400 if country query param is missing", async () => {
    const app = express();
    app.get("/cities", getCitySummary);
    app.use(errorHandler);

    const res = await request(app).get("/cities");
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/country/i);
  });

  test("should return paginated cities with descriptions (happy path)", async () => {
    const app = express();
    app.get("/cities", getCitySummary);
    app.use(errorHandler);

    const res = await request(app)
      .get("/cities")
      .query({ country: mockCountry, page: 1, limit: 2 });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.cities).toHaveLength(2);
    const desc = res.body.data.cities[0].description;
    expect(desc.length).toBeLessThanOrEqual(250);
    expect(res.body.source).toBe("fresh");
  });

  test("should fetch from Redis cache if memory cache is empty", async () => {
    const redisPayload = {
      page: 1,
      limit: 2,
      total: 2,
      cities: mockCitiesData.map((c) => ({
        ...c,
        description: `${c.name} description`,
      })),
    };
    redisClient.get.restore();
    sinon.stub(redisClient, "get").resolves(JSON.stringify(redisPayload));

    const app = express();
    app.get("/cities", getCitySummary);
    app.use(errorHandler);

    const res = await request(app)
      .get("/cities")
      .query({ country: mockCountry, page: 1, limit: 2 });

    expect(res.statusCode).toBe(200);
    expect(res.body.source).toBe("redis-cache");
  });
});
