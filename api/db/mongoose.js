const mongoose = require("mongoose");
require("dotenv").config(); // Load environment variables

// Retrieve the MongoDB URI from .env file
const mongoURI =
  process.env.MONGO_URI || "mongodb://localhost:27017/TaskManager";

// Connect to MongoDB
mongoose
  .connect(mongoURI)
  .then(() => {
    console.log("Connected successfully :)");
  })
  .catch((e) => {
    console.log("Error while attempting to connect to MongoDB:");
    console.error(e);
  });

module.exports = { mongoose };
