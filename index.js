const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

// TODO: 1.5

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@learningbackend.uwychz3.mongodb.net/?appName=learningBackend`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ping : 1});
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  }

  finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Tree plantation server is running");
})

app.listen(port, () => {
  console.log(`Tree plantation server is running on port ${port}`);
})