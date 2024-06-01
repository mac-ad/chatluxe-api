import mongoose from "mongoose";
import { Message } from "../models/message.model.js";
import { asyncRequestHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Conversation } from "../models/conversation.model.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { emitSocketEvent } from "../socket/index.js";
import { ChatEventEnum } from "../constants.js";
import { conversationCommonAggregator } from "./conversation.controller.js";

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
  // {
  //   $addFields: {
  //     sender: {
  //       $first: "$sender",
  //     },
  //   },
  // },
  {
    $unwind: "$sender",
  },
];

// reciever detail appender for one to one
const recieverDetailAppender = (req) => [
  {
    $lookup: {
      from: "users",
      localField: "participants",
      foreignField: "_id",
      as: "recieverDetail",
      pipeline: [
        {
          $project: {
            avatar: 1,
            username: 1,
          },
        },
      ],
    },
  },
  {
    $unwind: "$recieverDetail",
  },
  {
    $match: {
      "recieverDetail._id": {
        $ne: req.user._id,
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

    selectedConversation.lastMessage = message[0]._id;
    selectedConversation.save();

    // aggregate get detail of a conversation
    const updatedConv = await Conversation.aggregate([
      {
        $match: {
          _id: {
            $eq: selectedConversation._id,
          },
        },
      },
      // expand lastMessage
      // {
      //   $lookup: {
      //     from: "messages",
      //     localField: "lastMessage",
      //     foreignField: "_id",
      //     as: "lastMessage",
      //     pipeline: [
      //       {
      //         $project: {
      //           text: 1,
      //           sender: 1,
      //         },
      //       },
      //       // populating sender
      //       {
      //         $lookup: {
      //           from: "users",
      //           localField: "sender",
      //           foreignField: "_id",
      //           as: "sender",
      //           pipeline: [
      //             {
      //               $project: {
      //                 username: 1,
      //                 avatar: 1,
      //               },
      //             },
      //           ],
      //         },
      //       },
      //       {
      //         $unwind: "$sender",
      //       },
      //     ],
      //   },
      // },
      // {
      //   $unwind: "$lastMessage",
      // },

      // expand participants
      ...conversationCommonAggregator(),

      // for one to one append recieverDetail

      // for group no need
    ]);

    // emit message sent event to all the participants
    selectedConversation.participants.forEach((participant) => {
      // emit conversation Update event
      emitSocketEvent(
        req,
        participant._id.toString(),
        ChatEventEnum.CHAT_UPDATE,
        updatedConv[0]
      );

      // dont emit to the self
      if (participant._id.toString() === req.user._id.toString()) return;
      // emit to others in conversation
      emitSocketEvent(
        req,
        participant._id.toString(),
        ChatEventEnum.MESSAGE_RECIEVED,
        message[0]
      );
    });

    return res
      .status(201)
      .json(new ApiResponse(201, message[0], "Message sent successfully"));
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
