import mongoose from "mongoose";
import { Conversation } from "../models/conversation.model.js";
import { asyncRequestHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";

const conversationCommonAggregator = () => [
  {
    $lookup: {
      from: "users",
      foreignField: "_id",
      localField: "participants",
      as: "participants",
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
];

export const getAllConversationsController = asyncRequestHandler(
  async (req, res, next) => {
    const chats = await Conversation.find({
      participants: {
        $elemMatch: {
          $eq: req.user._id,
        },
      },
    });

    res
      .status(200)
      .json(new ApiResponse(200, chats, "conversations retrived successfully"));
  }
);

export const createOrGetOneToOneController = asyncRequestHandler(
  async (req, res, next) => {
    const { recieverId } = req.params;

    const reciever = await User.findById(recieverId);

    if (!reciever) throw new ApiError(404, "Reciever not found");

    // check if reciever and sender is same
    if (recieverId === req.user._id.toString())
      throw new ApiError(400, "You cannot create a conversation with yourself");

    // get conversation if exists
    const conversations = await Conversation.aggregate([
      {
        $match: {
          isGroupConversation: false,
          $and: [
            {
              participants: { $elemMatch: { $eq: req.user._id } },
            },
            {
              participants: {
                $elemMatch: {
                  $eq: new mongoose.Types.ObjectId(recieverId),
                },
              },
            },
          ],
        },
      },
      // common aggrgation
      ...conversationCommonAggregator(),
    ]);

    // conversation exists or not conditional
    if (conversations.length)
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            conversations[0],
            "Conversation fetched successfully"
          )
        );

    // create new conversaation since doesnot exists
    const newConv = await Conversation.create({
      name: "one to one",
      participants: [req.user._id, new mongoose.Types.ObjectId(recieverId)],
      admin: req.user._id,
    });

    const createdConv = await Conversation.aggregate([
      {
        $match: {
          _id: newConv._id,
        },
      },
    ]);

    console.log(createdConv);

    return res
      .status(200)
      .json(
        new ApiResponse(200, conversations, "Conversation created Successfully")
      );
  }
);

export const createAGroupController = asyncRequestHandler(
  async (req, res, next) => {
    const { name, participants } = req.body;

    // check if participant array contains the admin itself of not it must not contain

    // remove duplicates
    const members = [...new Set([...participants, req.user._id.toString()])];

    if (members.length < 3)
      throw new ApiError(400, "Seems like you have passed duplicate users");

    const groupConversation = await Conversation.create({
      name,
      isGroupConversation: true,
      participants: members,
      admin: req.user._id,
    });

    // structure conversation
    const conversation = await Conversation.aggregate([
      {
        $match: {
          _id: groupConversation._id,
        },
      },
      ...conversationCommonAggregator(),
    ]);

    if (!conversation) throw new ApiError(500, "Internal server error");

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          conversation[0],
          "Group conversation created successfully"
        )
      );
  }
);
