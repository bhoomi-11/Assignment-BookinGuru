/**
 * @file cache.js
 * @description Implements an in-memory TTL (time-to-live) cache with optional max size and automatic eviction of expired or oldest entries.
 */

class TTLCache {
  constructor({ ttlMs = 24 * 60 * 60 * 1000, max = 100000 } = {}) {
    this.ttlMs = ttlMs;
    this.max = max;
    this.map = new Map();
  }

  get(key) {
    const now = Date.now();
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < now) {
      this.map.delete(key);
      return undefined;
    }
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key, value) {
    const expiresAt = Date.now() + this.ttlMs;
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, { value, expiresAt });
    if (this.map.size > this.max) {
      const oldestKey = this.map.keys().next().value;
      this.map.delete(oldestKey);
    }
  }
}

module.exports = TTLCache;
