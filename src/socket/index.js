export const initializeSocketIo = (io) => {
  console.log("ibnbitialized socket", io);
  return io.on("connection", async (socket) => {
    console.log("socket connection established");
    // check accesstoken from handshake headers
    // will do later once the socket is setup
  });
};
