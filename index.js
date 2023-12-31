const express = require('express')
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const cors = require('cors');
const port = process.env.PORT;


//* Middlewar
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.rb5g6hh.mongodb.net/?retryWrites=true&w=majority`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
     serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
     }
});

async function run() {
     try {
          // Connect the client to the server	(optional starting in v4.7)
          await client.connect(); 

          const menuCollection = client.db("BistroBoss").collection("menu");
          const revewsCollection = client.db("BistroBoss").collection("revews");
          const cartsCollection = client.db("BistroBoss").collection("carts");

          app.get('/menu', async (req, res) => {
               const result = await menuCollection.find().toArray();
               res.send(result)
          })

          app.get('/revews', async (req, res) => {
               const result = await revewsCollection.find().toArray();
               res.send(result)
          })


          //Card collection
          //get
          app.get('/carts', async (req, res) => {
               const email = req.query.email;
               const query = {email: email}
               const result = await cartsCollection.find(query).toArray();
               res.send(result);
          })

          // post 
          app.post('/carts', async(req, res) => {
               const cartItem = req.body;
               const reault = await cartsCollection.insertOne(cartItem);
               res.send(reault)
          })

          // Delete
          app.delete('/carts/:id', async(req, res) => {
               const id = req.params.id;
               const query = {_id: new ObjectId(id)}
               const result = await cartsCollection.deleteOne(query);
               res.send(result);
          })


          // Send a ping to confirm a successful connection
          await client.db("admin").command({ ping: 1 });
          console.log("Pinged your deployment. You successfully connected to MongoDB!");
     } finally {
          // Ensures that the client will close when you finish/error
          // await client.close();
     }
}
run().catch(console.dir);




app.get('/', (req, res) => {
     res.send("Bistro boss server is ranning")
})

app.listen(port, () => {
     console.log(`Example app listening on port ${port}`);
})