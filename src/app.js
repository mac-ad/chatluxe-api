import express from "express";
import userRoutes from "./routes/user.routes.js";
import friendshipRoutes from "./routes/friendship.routes.js";
import conversationRoutes from "./routes/conversation.routes.js";
import messageRoutes from "./routes/message.routes.js";
import { errorHandler } from "./middlewares/error.middlewares.js";
import cookieParser from "cookie-parser";
import { documentRoutes } from "./routes/documents.routes.js";
import cors from "cors";
import path from "path";
import { fileUploadRoutes } from "./routes/fileUpload.routes.js";
import http from "http";

import { initializeSocketIo } from "./socket/index.js";
import { Server } from "socket.io";

export const __filename = import.meta.url;
export const __dirname = path.dirname(__filename);

export const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  // cors: {
  //   origin: "*",
  //   credentials: true,
  // },
});

// to use the instance later maybe
// as app.get("io")
app.set("io", io);

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    // credentials: true,
    // withCredentials: true,
  })
);
app.use(cookieParser()); //to parse request cookies

// app.use(cors(corsOptions));
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res) => res.send("hey"));

// common endpoints
app.use("/api/users", userRoutes);

// chat app endpoints
app.use("/api/chat/friendship", friendshipRoutes);
app.use("/api/chat/conversations", conversationRoutes);
app.use("/api/chat/messages", messageRoutes);

// tinyTools app endpoints
app.use("/api/docs/", documentRoutes);

// file uploads
app.use("/api/upload", fileUploadRoutes);

app.use(errorHandler);

initializeSocketIo(io);
