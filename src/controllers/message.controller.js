import mongoose from "mongoose";
import { Message } from "../models/message.model.js";
import { asyncRequestHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Conversation } from "../models/conversation.model.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";

const messageCommonAggregator = () => [
  {
    $lookup: {
      from: "users",
      foreignField: "_id",
      localField: "sender",
      as: "sender",
      pipeline: [
        {
          $project: {
            username: 1,
            avatar: 1,
          },
        },
      ],
    },
  },
  {
    $addFields: {
      sender: {
        $first: "$sender",
      },
    },
  },
];

export const getAllMessagesController = asyncRequestHandler(
  async (req, res, next) => {
    console.log("getting all messages");

    const { conversationId } = req.params;

    const messages = await Message.aggregate([
      {
        $match: {
          conversation: new mongoose.Types.ObjectId(conversationId),
        },
      },
      ...messageCommonAggregator(),
      {
        $sort: {
          timestamp: 1,
        },
      },
    ]);

    return res
      .status(200)
      .json(new ApiResponse(200, messages, "Messages retrived successfully"));
  }
);

export const sendMessageController = asyncRequestHandler(
  async (req, res, next) => {
    const { conversationId } = req.params;
    const { text } = req.body;

    const selectedConversation = await Conversation.findById(conversationId);

    if (!selectedConversation)
      throw new ApiError(404, "Conversation not found");

    // create a message
    let message = await Message.create({
      sender: new mongoose.Types.ObjectId(req.user._id),
      text: text,
      conversation: selectedConversation._id,
    });

    // add last message to conversation model

    // format message
    message = await Message.aggregate([
      {
        $match: {
          _id: message._id,
        },
      },
      ...messageCommonAggregator(),
    ]);

    selectedConversation.lastMessage = message._id;
    selectedConversation.save();
    
    return res
      .status(201)
      .json(new ApiResponse(201, message, "Message sent successfully"));
  }
);

export const messageSeenController = asyncRequestHandler(
  async (req, res, next) => {
    const { messageId } = req.params;

    const message = await Message.findById(
      new mongoose.Types.ObjectId(messageId)
    );
    if (!message) throw new ApiError(404, "Message not found");

    // const user = await User.findById(new mongoose.Types.ObjectId(userId));
    // if (!user) throw new ApiError(404, "User not found");

    message.seenBy.push(req.user._id);
    message.save({ validateBeforeSave: false });

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Message seen successfully"));
  }
);
