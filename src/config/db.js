const mongoose = require("mongoose");

async function connectDB(mongoUri) {
  if (!mongoUri || String(mongoUri).trim() === "") {
    throw new Error("MONGO_URI is required to connect to MongoDB");
  }

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000
  });
  console.log("MongoDB connected");
}

module.exports = { connectDB };

