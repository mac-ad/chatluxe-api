import express from "express";
import userRoutes from "./routes/user.routes.js";
import friendshipRoutes from "./routes/friendship.routes.js";
import conversationRoutes from "./routes/conversation.routes.js";
import messageRoutes from "./routes/message.routes.js";

import { errorHandler } from "./middlewares/error.middlewares.js";
import cookieParser from "cookie-parser";

export const app = express();

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

app.use(cookieParser());

app.use("/api/users", userRoutes);
app.use("/api/friendship", friendshipRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);

app.use(errorHandler);
