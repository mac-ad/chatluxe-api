import mongoose, { Schema } from "mongoose";

const conversationSchema = new Schema(
  {
    // name: {
    //   type: String,
    //   required: true,
    // },
    isGroupConversation: {
      type: Boolean,
      default: false,
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
    },
    admin: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

export const Conversation = mongoose.model("Conversation", conversationSchema);
