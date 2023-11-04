const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const  jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;


// parser
app.use(express.json());
app.use(cookieParser())
app.use(cors({
    origin: ['http://localhost:5000'],
    credentials : true
}));




// Mongodb uri
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ncskwvc.mongodb.net/clean-co?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

// collection name
    const serviceCollection = client.db("clean-co").collection("services");
    const bookingCollection = client.db("clean-co").collection("bookings");


    // middlewares
    // verify token and grant access 
    const verifyToken = (req, res, next) =>{
        const {token} = req.cookies;
        if(!token){
            return res.status(401).send({message:'unauthorized access'})
        }
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded ) =>{
            if(err){
                return res.status(401).send('unauthorized access')
            }

            // attach decoded user so other can get it
            req.user =decoded;
            next();
        })
    }

    // service get
    app.get('/api/v1/services', verifyToken, async( req, res ) =>{
        const cursor =  serviceCollection.find();
        const result =await cursor.toArray();
        res.send(result)
    })


    // post or create bookings
    app.post('/api/v1/user/create-booking', async( req, res ) =>{
        const booking = req.body;
        const result = await bookingCollection.insertOne(booking)
        res.send(result)
    })

    // delete bookings
    app.delete('/api/v1/user/cancel-booking/:bookingId', async ( req, res ) =>{
        const id = req.params.bookingId;
        const query = {_id : new ObjectId(id)}
        const result = await bookingCollection.deleteOne(query)
        res.send(result)
    })


    // for authorization and jwt part
    app.post('/api/v1/auth/access-token', async ( req, res ) =>{
        // create token and send to client
        const user = req.body;
        const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
        res
        .cookie('token', token,  {
            httpOnly : true,
            secure: false,
            samesite: 'none'
        })
        .send({success:true})
    })



    app.get('/api/v1/user/bookings', verifyToken,  async( req, res ) =>{
        const queryEmail = req.query.email;
        const tokenEmail = req.user.email;


        // at the first we will check  the mail match or not
        if( queryEmail !== tokenEmail){
            res.status(403).send({message: 'forbidded access'})
        }

        // if there is any email in query then the api will provide the specific data 
        // and id there is no email in the query then the api will provide all data 
        let query = {}
        if ( queryEmail ){
            query.email = queryEmail
        }
        const result = await bookingCollection.find(query).toArray();
        res.send(result)
        
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("clean co server is running");
});

app.listen(port, () => {
  console.log(`clean co server running on ${port}`);
});
