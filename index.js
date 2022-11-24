const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();

//midlewares
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nbna82s.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
async function run(){
    try{
        const categoriesCollection = client.db('barrelOfBooks').collection('categories');
        const usersCollection = client.db("barrelOfBooks").collection('users');
        const productsCollection = client.db("barrelOfBooks").collection('products');
        const ordersCollection = client.db("barrelOfBooks").collection('orders');
        //get categoires
        app.get('/categories', async(req, res)=> {
            const query = {};
            const result = await categoriesCollection.find(query).toArray();
            res.send(result);
        });
        //get single category getails
        app.get('/categories/:id', async(req, res)=> {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await categoriesCollection.findOne(query);
            res.send(result);
        })
        //create frist product
        app.post('/products', async(req, res)=> {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result);
        });
        //get product with categories
        app.get('/products/:id', async(req, res)=> {
            const id = req.params.id;
            const query = { productCategoryId : id};
            const result = await productsCollection.find(query).toArray();
            res.send(result);
        })
        //create user data
        app.post('/users', async(req, res)=> {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });
        //get all user data
        app.get('/users', async(req ,res)=> {
            const query = {};
            const result = await usersCollection.find(query).toArray();
            res.send(result);
        });
        //get single user
        app.get('/user', async(req, res)=> {
            const email = req.query.email;
            const query = {email: email}
            const result = await usersCollection.findOne(query);
            res.send(result);
        });
        //find all seller
        app.get('/seller', async(req, res)=> {
            const query = {role: 'Seller'};
            const result = await usersCollection.find(query).toArray();
            res.send(result);
        });
        //find all buyer
        app.get('/buyer', async(req, res)=> {
            const query = {role: 'Buyer'};
            const result = await usersCollection.find(query).toArray();
            res.send(result);
        })
        //create order
        app.post('/orders', async(req, res)=> {
            const order = req.body;
            const result = await ordersCollection.insertOne(order);
            res.send(result);
        });
        //get order for sigle user
        app.get('/orders', async(req, res)=> {
            const email = req.query.email;
            const query = {email: email}
            const result = await ordersCollection.find(query).toArray();
            res.send(result);
        });
    }
    finally{

    }
}
run().catch(err=> console.log(err))


//basic running server
app.get('/', (req, res)=> {
    res.send('Barrel Of Books Server is running!!');
});
app.listen(port, ()=> {
    console.log(`Barrel of books server is running port ${port}`);
});