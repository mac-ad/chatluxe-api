import mongoose, { Schema } from "mongoose";
import { FRIENDREQUEST_STATUS } from "../constants.js";

const friendRequestSchema = new Schema(
  {
    from: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    to: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: FRIENDREQUEST_STATUS,
      default: "PENDING",
    },
  },
  {
    timestamps: true,
  }
);

export const FriendRequest = mongoose.model(
  "FriendRequest",
  friendRequestSchema
);
