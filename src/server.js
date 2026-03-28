require("dotenv").config();

const app = require("./app");
const { connectDB } = require("./config/db");

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    if (!process.env.MONGO_URI || String(process.env.MONGO_URI).trim() === "") {
      throw new Error("Missing required env var: MONGO_URI");
    }

    await connectDB(process.env.MONGO_URI);

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

start();