const express = require('express')
const app = express()
const { MongoClient, ServerApiVersion, ObjectId, Admin } = require('mongodb');
require('dotenv').config()
const jwt = require('jsonwebtoken')
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

          const userCollection = client.db("BistroBoss").collection("users");
          const menuCollection = client.db("BistroBoss").collection("menu");
          const revewsCollection = client.db("BistroBoss").collection("revews");
          const cartsCollection = client.db("BistroBoss").collection("carts");

          //middlewares
          const verifToken = (req, res, next) => {
               console.log('inside verify token', req.headers.authorization);
               if (!req.headers.authorization) {
                    return res.status(401).send({ message: 'forbidden access' })
               }

               const token = req.headers.authorization.split(' ')[1]
               
               jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                    if(err){
                         return res.status(401).send({ message: 'forbidden access' })
                    }

                    req.decoded = decoded;
                    next()
               });
          }

          //use verify admin after verifyToken
          const verifyAdmin = async (req, res, next) => {
               const email = req.decoded.email;
               const query = { email: email};
               const user = await userCollection.findOne(query)
               const isAdmin = user?.role === "admin";
               if(!isAdmin){
                    return res.status(403).send({message: 'forbidden access'});
               }
               next();
          }

          //jwt Related api
          app.post('/jwt', async (req, res) => {
               const user = req.body;
               const token = jwt.sign(user,
                    process.env.ACCESS_TOKEN_SECRET,
                    { expiresIn: '1h' })
               res.send({ token })

          })

          //
          app.get('/users/admin/:email',verifToken, async (req, res) => {
               const email = req.params.email;
               if( email !== req.decoded.email ){
                    return res.status(403).send({message: 'forbidden access'})
               }

               const query = {email: email}
               const user = await userCollection.findOne(query)
               let admin = false;
               if(user){
                    admin = user?.role === 'admin';
               }
               res.send({ admin })
          })

          //user get 
          app.get('/users', verifToken, verifyAdmin, async (req, res) => {
               const result = await userCollection.find().toArray()
               res.send(result)
          })

          //user post user
          app.post('/users', async (req, res) => {
               const user = req.body;
               //
               const query = { email: user.email }
               const existingUser = await userCollection.findOne(query)
               if (existingUser) {
                    return res.send({ message: 'user already exists', insertedId: null })
               }
               const result = await userCollection.insertOne(user)
               res.send(result)
          })

          //admin korar jonno
          app.patch('/users/admin/:id',verifToken, verifyAdmin, async (req, res) => {
               const id = req.params.id;
               const filter = { _id: new ObjectId(id) };
               const updatedDoc = {
                    $set: {
                         role: 'admin'
                    }
               }
               const result = await userCollection.updateOne(filter, updatedDoc)
               res.send(result)
          })

          //users Delets
          app.delete('/users/:id', verifToken, verifyAdmin, async (req, res) => {
               const id = req.params.id
               const query = { _id: new ObjectId(id) }
               const result = await userCollection.deleteOne(query)
               res.send(result)
          })

          //menu Deleted
          app.delete('/menu/:id', verifToken, verifyAdmin, async (req, res) => {
               const id = req.params.id
               const query = {_id: new ObjectId(id)}
               const result = await menuCollection.deleteOne(query)
               res.send(result);
          })

          // menu get
          app.get('/menu', async (req, res) => {
               const result = await menuCollection.find().toArray();
               res.send(result)
          })

          //menu update item api
          app.patch('/menu/:id', async (req, res) => {
               const item = req.body;
               const id = req.params.id;
               const filter = {_id: new ObjectId(id)}
               const updatedDoc = {
                    $set:{
                         name: item.name,
                         category: item.category,
                         price: item.price,
                         recipe: item.recipe,
                         image: item.image
                    }
               }
               const result = await menuCollection.updateOne(filter, updatedDoc)
               res.send(result)
          })
     

          //menu edit id get
          app.get('/menu/:id',verifToken, verifyAdmin, async (req, res) => {
               const id = req.params.id;
               const query = {_id: new ObjectId(id)}
               const result = await menuCollection.findOne(query)
               res.send(result);
          })

          //menu Post 
          app.post('/menu', verifToken, verifyAdmin, async (req, res) => {
               const item = req.body;
               const result = await menuCollection.insertOne(item)
               res.send(result)
          })

          //revews get
          app.get('/revews', async (req, res) => {
               const result = await revewsCollection.find().toArray();
               res.send(result)
          })


          //Card collection
          //get
          app.get('/carts', async (req, res) => {
               const email = req.query.email;
               const query = { email: email }
               const result = await cartsCollection.find(query).toArray();
               res.send(result);
          })

          //carts post 
          app.post('/carts', async (req, res) => {
               const cartItem = req.body;
               const reault = await cartsCollection.insertOne(cartItem);
               res.send(reault)
          })

          // carts Delete
          app.delete('/carts/:id', async (req, res) => {
               const id = req.params.id;
               const query = { _id: new ObjectId(id) }
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