import mongoose, { Schema } from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
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
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
    },
  },
  {
    timestamps: true,
  }
);

export const Message = mongoose.model("Message", messageSchema);
