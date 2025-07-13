const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config(
    {
        path: ".env.local"
    }
);
const mongoURI = process.env.MONGO_URI;

const connectToMongo = async () => {
    await mongoose.connect(mongoURI);
    console.log("Connected to db")
}

module.exports = connectToMongo;