const express = require("express");
const router = express.Router();
const cityController = require("./controller/cityController");

router.get("/cities", cityController.getCitySummary);

module.exports = router;
