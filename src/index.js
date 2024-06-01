import { app, server } from "./app.js";
import { connectDB } from "./db/index.js";
import dotenv from "dotenv";
import { Server } from "socket.io";

dotenv.config({
  path: "./.env",
});

const PORT = process.env.PORT || 8000;

const startServer = () => {
  server.listen(PORT, () => {
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
