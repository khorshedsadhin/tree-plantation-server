const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;

// TODO: 1.5

// middleware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Tree plantation server is running");
})

app.listen(port, () => {
  console.log(`Tree plantation server is running on port ${port}`);
})