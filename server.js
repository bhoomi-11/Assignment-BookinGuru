const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const router = require("./router");
const redisClient = require("./utils/redisCache");
const { errorHandler } = require("./middleware/errorHandler");
const TTLCache = require("./utils/cache");
const config = require("./config");

const PORT = config.PORT;
const app = express();
app.locals.memoryCache = new TTLCache({
  ttlMs: 24 * 60 * 60 * 1000,
  max: 1000,
});

app.use(cors());
app.use(bodyParser.json({ limit: "5mb" }));
app.use("/", router);

app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`Server listening on PORT ${PORT}`);
});

// Handle graceful shutdown
function shutdown() {
  console.log("Shutting down server...");

  // Remove Redis listeners to prevent memory leak warnings
  redisClient.removeAllListeners("error");
  redisClient.removeAllListeners("exit");

  // Disconnect Redis client
  redisClient.quit().catch(console.error);

  // Close HTTP server
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
}

// Listen for termination signals
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
