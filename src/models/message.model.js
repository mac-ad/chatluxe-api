import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  reciever: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  text: String,
  seenBy: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  timeStamp: {
    type: Date,
    default: Date.now(),
  },
});

export const Message = mongoose.Schema("Message", messageSchema);
