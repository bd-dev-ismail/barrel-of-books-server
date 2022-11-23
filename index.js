const express = require('express');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();

//midlewares
app.use(cors());
app.use(express.json());


//basic running server
app.get('/', (req, res)=> {
    res.send('Barrel Of Books Server is running!!');
});
app.listen(port, ()=> {
    console.log(`Barrel of books server is running port ${port}`);
});