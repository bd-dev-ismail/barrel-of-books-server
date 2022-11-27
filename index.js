const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_KEY);
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
function verifyJWT(req, res, next){
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).send({message: 'Unauthorized Access!!'})
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.SCRECT_ACCESS_TOKEN, function(err, decoded){
        if(err){
            return res.status(403).send({message: 'Forbidded Access!'})
        }
        req.decoded = decoded;
        next();
    })
}
async function run(){
    try{
        const categoriesCollection = client.db('barrelOfBooks').collection('categories');
        const usersCollection = client.db("barrelOfBooks").collection('users');
        const productsCollection = client.db("barrelOfBooks").collection('products');
        const ordersCollection = client.db("barrelOfBooks").collection('orders');
        const paymentsCollection = client.db("barrelOfBooks").collection('payments');
        const reportsCollection = client.db("barrelOfBooks").collection('reports');
        //jwt create
        app.get('/jwt/:email', async(req ,res)=> {
            const email = req.params.email
            
            const token = jwt.sign({email: email}, process.env.SCRECT_ACCESS_TOKEN, {expiresIn: '30d'});
            res.send({ accessToken: token });
        });
        //verify admin 
        const verifyAdmin = async(req, res, next)=> {
            const decodedEamil = req.decoded.email;
            const query = {email: decodedEamil};
            const user = await usersCollection.findOne(query);
            if(user.role !== 'Admin'){
                return res.status(403).send({message: 'Forbidded Access!'})
            }
            next();
        };
        //verify seller
        const veirifySeller = async(req, res, next)=> {
            const decodedEamil = req.decoded.email;
            const query = {role: 'Seller'};
            const result = await usersCollection.findOne(query);
            const sellerEmail = result.filter(seller => {
                const email = seller.email;
                if(decodedEamil !== email){
                    return res.status(403).send({message: 'Forbidden Access!!!'});
                }
            })
        }
        //payment
        app.post("/create-payment-intent", async(req, res)=> {
            const order = req.body;
            
            const price = order.bookPrice;
            const amount = parseFloat(price * 100);
              const paymentIntent = await stripe.paymentIntents.create({
                currency: "usd",
                amount: amount,
                payment_method_types: ["card"],
              });
               res.send({
                 clientSecret: paymentIntent.client_secret,
               });
        });
        //store payment
        app.post('/payments', async(req, res)=> {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const orderId = payment.orderId;
            const filterOrder = {_id: ObjectId(orderId)};
            const updateOrder = {
              $set: {
                sold: true,
                transitionId: payment.transitionId,
              },
            };
            const orderResult = await ordersCollection.updateOne(filterOrder, updateOrder);
            //set in proudct
            const id = payment.productId;
            const filter = {_id: ObjectId(id)};
            const updatedDoc = {
              $set: {
                sold: true,
                transitionId: payment.transitionId,
              },
            };
            const updatedResult = await productsCollection.updateOne(filter, updatedDoc);
            
            res.send(result);
        })
        //get categoires
        app.get('/categories', async(req, res)=> {
            const query = {};
            const result = await categoriesCollection.find(query).toArray();
            res.send(result);
        });
        //get single category getails
        app.get('/categories/:id', verifyJWT, async(req, res)=> {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await categoriesCollection.findOne(query);
            res.send(result);
        })
        //create frist product
        app.post('/products',verifyJWT,veirifySeller, async(req, res)=> {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result);
        });
        //get product with categories
        app.get('/products/:id', async(req, res)=> {
            const id = req.params.id;
            const query = {
              $and: [{ productCategoryId: id }, {sold: false}],
            };
            const result = await productsCollection.find(query).toArray();
            res.send(result);
        });
        //get product for signle seller
        app.get('/products',verifyJWT, async(req, res)=> {
            const email = req.query.email;
            const decodedEamil = req.decoded.email;
            if(decodedEamil !== req.query.email){
                return res.status(401).send({message: 'Forbidden Access!'})
            }
            const query = {
              sellerEmail: email,
            };
            const result = await productsCollection.find(query).toArray();
            res.send(result);
        });
        //delete a product
        app.delete('/products/:id',verifyJWT,verifyAdmin, async(req, res)=> {
            const id = req.params.id;
            
            // console.log(decodedEamil)
            const query = {_id: ObjectId(id)};
            const result = await productsCollection.deleteOne(query);
            res.send(result);
        });
        app.delete('/products/:id',verifyJWT,verifyAdmin, async(req, res)=> {
            const id = req.params.id;
            
            const query = {_id: ObjectId(id)};
            const updateResult = await reportsCollection.deleteOne(updateQuery);
            const result = await productsCollection.deleteOne(query);
            res.send(result);
        });
        //advesite product
        app.put('/adproduct/:id',async(req, res)=> {
            
            const id = req.params.id;
            const filter = {_id: ObjectId(id)};
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    advertise: true,
                }
            }
            const result = await productsCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });
        //find advertiseable product
        app.get('/adproduct', async(req, res)=> {
            const query = {
              $and: [{ advertise: true }, {sold: false}],
            };
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
        app.get('/seller',verifyJWT, verifyAdmin, async(req, res)=> {
            const query = {role: 'Seller'};
            const result = await usersCollection.find(query).toArray();
            res.send(result);
        });
        //delete a seller
        app.delete('/seller/:id',verifyJWT, verifyAdmin, async(req, res)=> {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await usersCollection.deleteOne(query);
            res.send(result)
        });
        //verifyed seller
        app.put('/seller/:id',verifyJWT, verifyAdmin, async(req, res)=> {
            const id = req.params.id;
            const filter = {_id: ObjectId(id)};
            const options = { upsert: true };
            const updatedDoc = {
                $set:{
                    verifyed: true
                }
            };
            const result = await usersCollection.updateOne(filter, updatedDoc ,options);
            res.send(result);
        });
        //verifyed product
        app.put('/product',verifyJWT, verifyAdmin, async(req, res)=> {
          const email = req.query.email;
          const query = {
            email: email
          };
          const user = await usersCollection.find(query).toArray();
          const verifyUser = user.map(usr => {
            const filter = {sellerEmail: usr.email}
            const options = {upsert: true};
            const updatedDoc = {
                $set:{
                    veriyedPd: true
                }
            }
            const result =  productsCollection.updateMany(filter, updatedDoc, options);
            res.send(result)
          })
        })
        //delete a buyer
        app.delete('/buyer/:id',verifyJWT, verifyAdmin, async(req, res)=> {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        })
        //find all buyer
        app.get('/buyer',verifyJWT, verifyAdmin, async(req, res)=> {
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
        app.get('/orders', verifyJWT, async(req, res)=> {
            const email = req.query.email;
             const decodedEamil = req.decoded.email;
             if (decodedEamil !== req.query.email) {
               return res.status(401).send({ message: "Forbidden Access!" });
             }
            const query = {email: email}
            const result = await ordersCollection.find(query).toArray();
            res.send(result);
        });
        //order id
        app.get('/orders/:id', async(req, res)=> {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await ordersCollection.findOne(query);
            res.send(result);
        });
        //create report
        app.post('/reports', async(req, res)=> {
            const product = req.body;
            const result = await reportsCollection.insertOne(product);
            res.send(result);
        });
        //get report all
        app.get('/reports',verifyJWT, verifyAdmin, async(req, res)=> {
            const query = {};
            const result = await reportsCollection.find(query).toArray();
            res.send(result);
        });
        //remove reported  product
        app.delete('/reports/:id', async(req, res)=> {
             const id = req.params.id;
             
             const query = { _id: ObjectId(id) };
             const result = await reportsCollection.deleteOne(query);
             res.send(result);
        });
        //-------------------user role
        app.get('/admin', async(req, res)=> {
            const email = req.query.email;
            const query = {$and: [{email: email}, {role: 'Admin'}]};
            const result = await usersCollection.findOne(query);
            res.send(result);
        });
        app.get('/sellerrole', async(req, res)=> {
              const email = req.query.email;
              const query = { email: email};
              const options = {
                role: 'Seller'
              }
              const result = await usersCollection.findOne(query, options);
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