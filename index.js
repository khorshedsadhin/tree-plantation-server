const express = require("express");
const cors = require("cors");
require("dotenv").config();
var admin = require("firebase-admin");
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

// TODO: 2.1
const decoded = Buffer.from(process.env.FIREBASE_SERVICE_KEY, "base64").toString("utf8");
const serviceAccount = JSON.parse(decoded);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// middleware
app.use(cors());
app.use(express.json());

const verifyFireBaseToken = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if(!authorization) {
    return res.status(401).send({ message: "unauthorized token"});
  }

  const token = authorization.split(" ")[1];
  if(!token) {
    return res.status(401).send({ message: "unauthorized token"});
  }

  try {
    const userInfo = await admin.auth().verifyIdToken(token);
    req.user_email = userInfo.email;
    next();
  } catch {
    return res.status(403).send({message : "forbidden invalid token"});
  }

};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@learningbackend.uwychz3.mongodb.net/?appName=learningBackend`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

app.get("/", (req, res) => {
  res.send("Tree plantation server is running");
})

async function run() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");

    const db = client.db("plantationDB");
    const usersCollection = db.collection("users");
    const eventsCollection = db.collection("events");

    app.post("/users", async(req, res) => {
      const newUser = req.body;
      const email = req.body.email;

      const query = {email: email};
      const existingUser = await usersCollection.findOne(query);

      if(existingUser) {
        return res.send({message: "users already exists"});
      }

      const result = await usersCollection.insertOne(newUser);
      res.send(result);
    });

    app.get("/my-events", verifyFireBaseToken, async (req, res) => {
      const loggedEmail = req.user_email;
      const queryEmail = req.query.email;

      if(queryEmail !== loggedEmail) {
        return res.status(403).send({message: "forbidden access"});
      }

      const query = {creatorEmail : loggedEmail};
      const myEvents = await eventsCollection.find(query).toArray();

      res.send(myEvents);
    })

  }
  finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/favicon.ico', (req, res) => res.status(204).end()); // for vercel

app.listen(port, () => {
  console.log(`Tree plantation server is running on port ${port}`);
})