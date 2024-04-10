import { app } from "./app.js";
import { connectDB } from "./db/index.js";
import dotenv from "dotenv";

dotenv.config({
  path: "./.env",
});

const PORT = process.env.PORT || 3000;

const startServer = () => {
  app.listen(PORT, () => {
    console.log("server listening to port ", PORT);
  });
};

async function init() {
  try {
    await connectDB();
    startServer();
  } catch (err) {
    console.log("error", err);
  }
}

init();
