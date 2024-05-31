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
  {
    $lookup: {
      from: "users",
      foreignField: "_id",
      localField: "admin",
      as: "admin",
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
    $unwind: "$admin",
  },
];

const getAllConversationsAggregator = (req) => [
  // depending on type of conversation do different things
  {
    $facet: {
      oneToOne: [
        {
          $match: { isGroupConversation: false },
        },
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
      ],
      group: [
        // group
        {
          $match: { isGroupConversation: true },
        },
      ],
    },
  },
  // {
  //   $unwind: "$facet",
  // },
  // {
  //   $project: {
  //     conversations: {
  //       $concatArrays: [
  //         {
  //           $ifNull: ["$facet.oneToOne", []],
  //         },
  //         {
  //           $ifNull: ["$facet.group", []],
  //         },
  //       ],
  //     },
  //   },
  // },
];

const groupConversationDetailAggregator = (req) => [
  {
    $lookup: {
      from: "users",
      localField: "admin",
      foreignField: "_id",
      as: "admin",
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
    $unwind: "$admin",
  },
  {
    $lookup: {
      from: "users",
      localField: "participants",
      foreignField: "_id",
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

  // remove self as participant
];

const oneToOneConversationDetailAggregator = (req) => [
  {
    $lookup: {
      from: "users",
      localField: "participants",
      foreignField: "_id",
      as: "recieverDetail",
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
    $unwind: "$recieverDetail",
  },
  {
    $match: {
      "recieverDetail._id": {
        $ne: req.user._id,
      },
    },
  },
  {
    $project: {
      participants: 0,
    },
  },
];

export const getAllConversationsController = asyncRequestHandler(
  async (req, res, next) => {
    const chats = await Conversation.aggregate([
      {
        $match: {
          participants: { $elemMatch: { $eq: req.user._id } },
        },
      },
      ...getAllConversationsAggregator(req),
      // {
      //   $lookup: {
      //     from: "users",
      //     localField: "participants",
      //     foreignField: "_id",
      //     as: "recieverDetail",
      //     pipeline: [
      //       {
      //         $project: {
      //           avatar: 1,
      //           username: 1,
      //         },
      //       },
      //     ],
      //   },
      // },
      // {
      //   $unwind: "$recieverDetail",
      // },
      // {
      //   $match: {
      //     "recieverDetail._id": { $ne: req.user._id },
      //   },
      // },
    ]);

    // find all conversation that current logged in user has
    // admin
    // last message
    // convWith or name (in case of one to one it is the name of reciever user)

    // const chats = await Conversation.aggregate([
    //   {
    //     $match : {
    //       participants : {
    //         $elemMatch : {
    //           $eq : req.user._id
    //         }
    //       }
    //     }
    //   },
    //   {
    //     $lookup : {
    //       from : "users",
    //       localField :
    //     }
    //   }
    // ])

    res
      .status(200)
      .json(
        new ApiResponse(200, chats[0], "conversations retrived successfully")
      );
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
    if (conversations.length) {
      // populate admin

      // for (const conversation in conversations) {
      //   conversation.populate("admin").execPopulate();
      // }
      console.log("conversations = ", conversations);

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            conversations[0],
            "Conversation fetched successfully"
          )
        );
    }

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
      ...conversationCommonAggregator(),
    ]);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          createdConv[0],
          "Conversation created Successfully"
        )
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

export const deleteConversationController = asyncRequestHandler(
  async (req, res, next) => {
    const convId = req.params.conversationId;

    const conv = await Conversation.findById(convId);

    if (!conv) throw new ApiError(404, "Conversation not found!");

    const authorized = conv.participants.includes(req.user._id);

    if (!authorized) throw new ApiError(401, "Not authorized");

    const r = await Conversation.deleteOne({ _id: convId });
    if (r.deletedCount !== 1)
      throw new ApiError(400, "Error occured while deleting");
    return res
      .status(200)
      .json(new ApiResponse(200, null, " Conversation deleted successfully"));
  }
);

export const getGroupConversationDetail = asyncRequestHandler(
  async (req, res, next) => {
    const { conversationId } = req.params;

    console.log("conv id", conversationId);

    const conversation = await Conversation.findById(conversationId);

    if (!conversation)
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Conversation not found"));

    const ownConversation = conversation.participants.includes(req.user._id);

    if (!ownConversation)
      return res
        .status(401)
        .json(new ApiResponse(401, null, "Not your conversation to view"));

    const conversationDetail = await Conversation.aggregate([
      {
        $match: {
          _id: {
            $eq: new mongoose.Types.ObjectId(conversationId),
          },
        },
      },

      ...(conversation.isGroupConversation
        ? groupConversationDetailAggregator(req)
        : oneToOneConversationDetailAggregator(req)),
    ]);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          conversationDetail[0],
          "Conversation fetched successfully"
        )
      );
  }
);
