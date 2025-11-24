const express = require("express");
const cors = require("cors");
require("dotenv").config();
const admin = require("firebase-admin");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

// TODO: 9
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

const uri = `${process.env.DB_URI}`;

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

    app.post("/events", verifyFireBaseToken, async(req, res) => {
      const eventData = req.body;

      if(eventData.creatorEmail !== req.user_email) {
        return res.status(403).send({message: "forbidden access"});
      }

      const newEvent = {
        ...eventData,
        eventDate: new Date(eventData.eventDate),
        joinedUsers: [],
        createdAt: new Date()
      };

      const result = await eventsCollection.insertOne(newEvent);
      res.send(result);
    });

    app.get("/events/upcoming", async(req, res) => {
      const currentDate = new Date();
      const { search, type } = req.query;

      let query = {eventDate : {$gte: currentDate}};

      if(search) {
        query.title = { $regex: search, $options: "i" };
      }

      if(type) {
        query.eventType = type;
      }

      const result = await eventsCollection.find(query).sort({eventDate: 1}).toArray();

      res.send(result);
    })

    app.get("/events/:id", async(req, res) => {
      const id = req.params.id;

      const query = {_id: new ObjectId(id)};

      const result = await eventsCollection.findOne(query);
      res.send(result);
    })

    app.patch("/events/join/:id", verifyFireBaseToken, async(req, res) => {
      const id = req.params.id;
      const userEmail = req.user_email;

      const filter = {_id: new ObjectId(id)};

      const updateDoc = {
        $addToSet: {
          joinedUsers: userEmail
        }
      };

      const result = await eventsCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    app.get("/my-events", verifyFireBaseToken, async (req, res) => {
      const email = req.user_email;
      const query = {creatorEmail : email};

      const result = await eventsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/joined-events", verifyFireBaseToken, async(req, res) => {
      const email = req.user_email;
      const query = {joinedUsers: email };
      
      const result = await eventsCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/events/:id", verifyFireBaseToken, async (req, res) => {
      const id = req.params.id;
      const email = req.user_email;

      const query = {
        _id: new ObjectId(id),
        creatorEmail: email
      }

      const result = await eventsCollection.deleteOne(query);

      if(result.deletedCount === 0) {
        return res.status(403).send({ message: "forbidden: you cannot delete this event" })
      }

      res.send(result);
    });

    app.put("/events/:id", verifyFireBaseToken, async (req, res) => {
      const id = req.params.id;
      const email = req.user_email;
      const eventData = req.body;
      
      const filter = { 
        _id: new ObjectId(id),
        creatorEmail: email
      };

      const updateDoc = {
        $set: {
          title: eventData.title,
          eventType: eventData.eventType,
          location: eventData.location,
          thumbnail: eventData.thumbnail,
          description: eventData.description,
          eventDate: new Date(eventData.eventDate)
        }
      }

      const result = await eventsCollection.updateOne(filter, updateDoc);
      if (result.matchedCount === 0) {
        return res.status(403).send({ message: "forbidden: you cannot edit this event" });
      }

      res.send(result);
    });

  }
  finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/favicon.ico', (req, res) => res.status(204).end()); // for vercel

// app.listen(port, () => {
//   console.log(`Tree plantation server is running on port ${port}`);
// })

export default app;