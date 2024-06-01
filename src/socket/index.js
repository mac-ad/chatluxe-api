import { ChatEventEnum } from "../constants.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

export const initializeSocketIo = (io) => {
  return io.on("connection", async (socket) => {
    try {
      // check accesstoken from handshake headers
      // will do later once the socket is setup
      const token = socket.handshake.auth.Authorization.split(" ")[1];

      if (!token)
        return resizeBy
          .status(401)
          .json(
            new ApiResponse(
              401,
              null,
              "Unauthorized handshake. Token is missing!"
            )
          );

      // get the token user
      const decodedToken = jwt.verify(token, "accesstokensecret");

      // fetch user data to check for valid user
      const user = await User.findById(decodedToken?._id);

      if (!user)
        return resizeBy
          .status(404)
          .json(new ApiResponse(404, null, "User not found!"));

      socket.user = user;

      // join channel with same user id for notifications realtime
      socket.join(user._id.toString());

      socket.emit(ChatEventEnum.CONNECTED);
    } catch (err) {}
  });
};

export const emitSocketEvent = (req, roomId, event, payload) => {
  req.app.get("io").in(roomId).emit(event, payload);
};
