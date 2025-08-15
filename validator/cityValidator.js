/**
 * @file cityValidator.js
 * @description Provides utility functions to normalize, clean, and format city names for consistent use across the app.
 */

function normalizeString(s) {
  return s
    .trim()
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s,.;:/\\-]+|[\s,.;:/\\-]+$/g, "")
    .trim();
}

function toTitleCaseCity(s) {
  return s
    .split(/([\s-])/)
    .map((seg) =>
      /^[\s-]$/.test(seg)
        ? seg
        : seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase()
    )
    .join("");
}

function sanitizeCity(raw) {
  return toTitleCaseCity(normalizeString(raw).replace(/\.+$/g, ""));
}

module.exports = { sanitizeCity };
