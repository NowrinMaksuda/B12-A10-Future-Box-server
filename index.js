const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const admin = require("firebase-admin");
const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
} = require("mongodb");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

/* Middlewares */

app.use(cors());
app.use(express.json());

/* Firebase Admin */

const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

/* Verify Token Middleware */

const verifyToken = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).send({
        message: "Unauthorized Access",
      });
    }

    const token = authorization.split(" ")[1];

    const decoded = await admin.auth().verifyIdToken(token);

    req.decoded = decoded;

    next();
  } catch (error) {
    console.log(error);

    return res.status(401).send({
      message: "Unauthorized Access",
    });
  }
};

/* MongoDB */

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.2gqzmaz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

/* Root Route */

app.get("/", (req, res) => {
  res.send("Future Box Server Running");
});

/* Main Function */

async function run() {
  try {
    // await client.connect();

    const database = client.db("event");
    const eventCollection = database.collection("events");

    /* Get All Events */

    app.get("/events", async (req, res) => {
      try {
        const { search, category } = req.query;

        const query = {};

        if (search) {
          query.title = {
            $regex: search,
            $options: "i",
          };
        }

        if (category) {
          query.eventType = category;
        }

        const result = await eventCollection
          .find(query)
          .sort({ eventDate: 1 })
          .toArray();

        res.send(result);
      } catch (error) {
        console.log(error);

        res.status(500).send({
          message: "Server Error",
        });
      }
    });

    /* Get Single Event */

    app.get("/events/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const query = {
          _id: new ObjectId(id),
        };

        const result = await eventCollection.findOne(query);

        res.send(result);
      } catch (error) {
        console.log(error);

        res.status(500).send({
          message: "Invalid Event ID",
        });
      }
    });

    /* Create Event */

    app.post("/events", verifyToken, async (req, res) => {
      try {
        const event = req.body;

        const result = await eventCollection.insertOne(event);

        res.send(result);
      } catch (error) {
        console.log(error);

        res.status(500).send({
          message: "Failed To Create Event",
        });
      }
    });

    /* Joined Events */

    app.get("/events/join/:email", async (req, res) => {
      try {
        const email = req.params.email;

        const result = await eventCollection
          .find({
            "joinedUsers.email": email,
          })
          .sort({ eventDate: 1 })
          .toArray();

        res.send(result);
      } catch (error) {
        console.log(error);

        res.status(500).send({
          message: "Server Error",
        });
      }
    });

    /* Created Events */

    app.get("/events/created/:email", async (req, res) => {
      try {
        const email = req.params.email;

        const result = await eventCollection
          .find({
            createdByEmail: email,
          })
          .sort({ eventDate: 1 })
          .toArray();

        res.send(result);
      } catch (error) {
        console.log(error);

        res.status(500).send({
          message: "Server Error",
        });
      }
    });

    /* Search */

    app.get("/search", async (req, res) => {
      try {
        const search = req.query.search;

        const result = await eventCollection
          .find({
            title: {
              $regex: search,
              $options: "i",
            },
          })
          .toArray();

        res.send(result);
      } catch (error) {
        console.log(error);

        res.status(500).send({
          message: "Search Failed",
        });
      }
    });

    /* Delete Event */

    app.delete("/events/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;

        const query = {
          _id: new ObjectId(id),
        };

        const result = await eventCollection.deleteOne(query);

        res.send(result);
      } catch (error) {
        console.log(error);

        res.status(500).send({
          message: "Delete Failed",
        });
      }
    });

    /* Update Event */

    app.patch("/events/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const query = {
          _id: new ObjectId(id),
        };

        const update = {
          $set: req.body,
        };

        const result = await eventCollection.updateOne(query, update);

        res.send(result);
      } catch (error) {
        console.log(error);

        res.status(500).send({
          message: "Update Failed",
        });
      }
    });

    /* Join Event */

    app.post("/events/join/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const user = req.body;

        await eventCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $addToSet: {
              joinedUsers: user,
            },
          }
        );

        res.send({
          success: true,
          message: "Joined Successfully",
        });
      } catch (error) {
        console.log(error);

        res.status(500).send({
          success: false,
          message: "Join Failed",
        });
      }
    });

    /* Leave Event */

    app.delete("/events/join/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const { email } = req.body;

        const result = await eventCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $pull: {
              joinedUsers: { email },
            },
          }
        );

        res.send({
          success: result.modifiedCount > 0,
        });
      } catch (error) {
        console.log(error);

        res.status(500).send({
          success: false,
          message: "Leave Failed",
        });
      }
    });

    console.log("MongoDB Connected Successfully");
  } catch (error) {
    console.log(error);
  }
}

run().catch(console.dir);

/* Server */

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;