# 🌍 Polluted Cities API

## Overview
This backend service fetches a list of the most polluted cities by country from a mock API, filters invalid/non-city entries, enriches each with a short Wikipedia description, and returns the final processed result.  
It is designed with **production-quality** practices — including **hybrid caching (in-memory + Redis)**, pagination-aware cache keys, and efficient API rate-limit handling.

The main endpoint is:

GET /cities

Supports pagination with `page` and `limit` query params (default limit: 10).

---

## ✨ Features
✅ Fetches pollution data from the provided mock API  
✅ Filters out corrupted or invalid city names using a pre-fetched country → cities mapping  
✅ Enriches each city with a short description from the Wikipedia API  
✅ **Hybrid caching**: In-memory TTL cache + Redis for persistence  
✅ Pagination-aware caching for optimized fetching  
✅ Error handling & input validation  
✅ Clear and maintainable codebase  

---

## 🚀 How to Run Locally

### 1️⃣ Clone the repository
git clone <your-repo-url>
cd <your-repo-folder>

### 2️⃣ Install dependencies
npm install

### 3️⃣ Set environment variables
cp .env.example .env

### Then edit `.env` and replace placeholder values
### 4️⃣ Start Redis (if running locally)
redis-server

### 5️⃣ Start the server
npm start

📄 .env.example

<pre>PORT=3000
BASE_URL=<mock_api_base_url>
AUTH_LOGIN=<mock_api_auth_login_path>
AUTH_REFRESH_PATH=<mock_api_auth_refresh_path>
POLLUTION_PATH=<mock_api_pollution_path>
API_USERNAME=<mock_api_username>
API_PASSWORD=<mock_api_password>
REDIS_URL=<redis_connection_url>
CACHE_TTL_MS=21600000
MEMORY_CACHE_TTL_MS=3600000
MEMORY_CACHE_MAX_ITEMS=100</pre>


📡 API Usage
Request
<pre>GET /cities?country=PL&page=1&limit=10</pre>

Response
<pre>{
  "status": 200,
  "message": "Successfully fetched data",
  "data": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "cities": [
      {
        "name": "Warsaw",
        "country": "Poland",
        "pollution": 80,
        "description": "Warsaw is the capital and largest city of Poland..."
      }
    ]
  },
  "source": "memory-cache"
}</pre>

### 🏙 How We Determine If Something is a City
Pre-fetch official cities list per country from a reliable API (countriesnow.space API).
Store this list in Redis for fast lookup.
When processing pollution data:
Sanitize city names (trim spaces, handle casing, fix common typos).
Check against the official list — if not found, discard.
Ignore entries with numbers or unlikely special characters.
Ensure Wikipedia API returns a valid description.


**Caching Strategy**
We use a two-tier cache to balance speed and persistence:

1. In-Memory Cache
Extremely fast retrieval for hot data.
TTL configurable (MEMORY_CACHE_TTL_MS).
Uses pagination-aware keys:
normalised:{country}:{page}:{limit}

2. Redis Cache
Persistent across restarts & multiple instances.

**Stores:**
countryCities:{iso2} → list of valid cities
pollution:list:{country} → pollution API raw results
wikiCache:{title} → Wikipedia descriptions
normalised:{country}:{page}:{limit} → final processed paginated data
TTL configurable (CACHE_TTL_MS).

**Cache Flow:**
Check Memory → Check Redis → Fetch Fresh → Store in both → Return

**Limitations & Assumptions**
Wikipedia API may not return data for misspelled or unusual city names.
Validation depends on countriesnow.space dataset accuracy.
country query parameter must be ISO2 code (e.g., PL, IN).
Cached results may delay updates from the source API until TTL expires.