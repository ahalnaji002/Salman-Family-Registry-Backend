require("dotenv").config();

const app = require("./app");
const db = require("./config/database");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await db.raw("SELECT 1");

    console.log("MySQL connected successfully");

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to MySQL:");
    console.error(error.message);
    process.exit(1);
  }
}

startServer();
