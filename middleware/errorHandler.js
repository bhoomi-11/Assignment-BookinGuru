/**
 * @file errorHandler.js
 * @description Global Express error handler: logs errors and sends standardized JSON responses with status codes and messages.
 */

const ERROR_MESSAGE = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  429: "TOO_MANY_REQUESTS",
  500: "INTERNAL_SERVER_ERROR",
};

function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  res
    .status(status)
    .json({ status, error: ERROR_MESSAGE[err.status], message: message });
}

module.exports = { errorHandler };
