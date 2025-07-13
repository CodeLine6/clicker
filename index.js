const express = require("express");
const connectToMongo = require("./db");

const app = express();
const PORT = 3000;

app.use(express.static("public"));
app.use(express.json());
app.use('/clicks', require('./routes/clicks'));

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));

connectToMongo();