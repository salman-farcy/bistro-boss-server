const express = require('express')
const app = express()
const { MongoClient, ServerApiVersion, ObjectId, Admin } = require('mongodb');
require('dotenv').config()
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
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
          const paymentCollection = client.db("BistroBoss").collection("payment");

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
          
          //
          app.get('/payments/:email', verifToken, async (req, res) => {
               const query = {email: req.params.email}
               if(req.params.email !== req.decoded.email){
                    return res.status(403).send({message: 'forbiden access'})
               }
               const result = await paymentCollection.find(query).toArray()
               res.send(result);
          })

          //Payment intent
          app.post('/create-payment-intent', async (req, res) => {
               const {price} = req.body
               const amount = parseInt(price * 100)
               console.log(amount , 'amount inside the ');
               

               const paymentIntent = await stripe.paymentIntents.create({
                    amount: amount,
                    currency: 'usd', 
                    payment_method_types: ['card']
               })

               res.send({
                    clientSecret: paymentIntent.client_secret
               })
          })

          //payment related API
          app.post ('/payments', async(req, res) => {
               const payment = req.body
               const paymentResult = await paymentCollection.insertOne(payment)

               //carefully delete each item from the cart 
               console.log('payment info', payment);
               const query = { _id: {
                    $in: payment.cartIds.map(id => new ObjectId(id))
               }};

               const deleteResult = await cartsCollection.deleteMany(query)
               res.send({paymentResult, deleteResult});
               
          })

          //stats or analytics 
          app.get ('/admin-stats',verifToken,verifyAdmin, async ( req, res) => {
               const users = await userCollection.estimatedDocumentCount()
               const menuItems = await menuCollection.estimatedDocumentCount()
               const orders = await paymentCollection.estimatedDocumentCount()

               // this is not the best way 
               // const payments  = await paymentCollection.find().toArray();
               // const revenue = payments.reduce((total, payment) => total + payment.price, 0)

               const result = await paymentCollection.aggregate([
                    {
                         $group: {
                              _id : null,
                              totalRevenue : {$sum : '$price'}
                         }
                    }
               ]).toArray()
               const revenue = result.length > 0 ? result[0].totalRevenue : 0;

               res.send({
                    users,
                    menuItems,
                    orders,
                    revenue,
               })
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