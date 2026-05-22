const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const port =process.env.PORT|| 3000;
app.use(cors())
app.use(express.json())

const admin = require("firebase-admin");

const serviceAccount = require("./future-box-firebase-adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const verifyToken = async (req, res, next) => {
  console.log('I am from middleware');
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({
      message: 'unauthorised access',
    });
  }
  const token = authorization.split(' ')[1];
  console.log(token);
  try {
    await admin.auth().verifyIdToken(token);
    next();
  } catch (error) {
    res.status(401).send({
      message: 'unauthorised access',
    });
  }
};


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.2gqzmaz.mongodb.net/?appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get('/', (req, res) => {
  res.send('Server is runing');
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const event = client.db('event');
    const eventCollection = event.collection('events');


    // app.get('/events', async (req, res) => {
    //     const cursor = eventCollection.find();
    //   const result = await cursor.toArray();
    //   res.send(result)

    // })

  app.get('/events', async (req, res) => {
    try {
      const { search, category } = req.query;
      const query = {};

      
      if (search) {

        query.title = { $regex: search, $options: 'i' }; 
      }


      if (category) {
        query.eventType = category;
      }

      const result = await eventCollection
        .find(query)
        .sort({ eventDate: 1 })
        .toArray();
      res.send(result);
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: 'Server error' });
    }
  });

    app.get('/events/:id', async (req, res) => {
      const id = req.params.id;
      const event={_id:new ObjectId(id)}
        const cursor = eventCollection.findOne(event);
      const result = await cursor;
      res.send(result)

    })

    app.post('/events',verifyToken, async (req, res) => {
    
      const event = req.body
      const result = await eventCollection.insertOne(event);
      res.send(result)
    })

    app.get('/events/join/:email', async (req, res) => {
      const email = req.params.email;
      const event = await eventCollection.find({"joinedUsers.email":email}).sort({ eventDate: 1 }).toArray()
      res.send(event)
      
    });
    app.get('/events/created/:email', async (req, res) => {
      const email = req.params.email;
      const event = await eventCollection
        .find({ createdByEmail: email })
        .sort({ eventDate: 1 })
        .toArray();
      res.send(event)
      
    });

        app.get('/search', async (req, res) => {
          const search = req.query.search;
          const result = await eventCollection
            .find({ title: { $regex: search, $options: 'i' } })
            .toArray();
          res.send(result);
        });


    app.delete('/events/:id',verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await eventCollection.deleteOne(query)
      res.send(result)
      
     })
    app.patch('/events/:id', async (req, res) => {
          const id = req.params.id;
          const query = { _id: new ObjectId(id) };
          const update = { $set: req.body };
          const options = {};
          const result = await eventCollection.updateOne(query, update, options);
          res.send(result);
      
     })

    app.post('/events/join/:id', async (req, res) => {
      const id = req.params.id;
      const user = req.body;
       try {
         await eventCollection.updateOne(
           { _id: new ObjectId(id) },
           {$addToSet: { joinedUsers: user } }
         );

         res.send({ success: true, message: 'Joined successfully' });
       } catch (err) {
         res.status(500).send({ success: false, message: 'Server error' });
       }

    })

    app.delete('/events/join/:id', async (req, res) => {
      const id = req.params.id;
      const { email } = req.body; 
      try {
        const result = await eventCollection.updateOne(
          { _id: new ObjectId(id) },
          { $pull: { joinedUsers: { email } } }
        );
        res.send({ success: result.modifiedCount > 0 });
      }
      catch (err) {
        console.error(err);
        res.status(500).send({ success: false, message: 'Server error' });
      }
    });

    // Send a ping to confirm a successful connection
    // await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
