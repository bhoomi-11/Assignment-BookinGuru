const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const PORT = 8000;
const app = express();


app.use(cors());
app.use(bodyParser.json({ limit: "5mb" }));

app.listen(PORT, () => {
  console.log(`Server listening on PORT ${PORT}`);
});
