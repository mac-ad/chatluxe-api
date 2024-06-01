import mongoose from "mongoose";
import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import { asyncRequestHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { emitSocketEvent } from "../socket/index.js";
import { ChatEventEnum } from "../constants.js";

export const conversationCommonAggregator = () => [
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
  // expand last message
  {
    $lookup: {
      from: "messages",
      foreignField: "_id",
      localField: "lastMessage",
      as: "lastMessage",
      pipeline: [
        {
          $project: {
            text: 1,
            sender: 1,
            created_at: 1,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "sender",
            foreignField: "_id",
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
          $unwind: "$sender",
        },
      ],
    },
  },
  {
    $unwind: "$lastMessage",
  },
];

export const conversationOneToOneAggregator = (req) => [
  {
    $lookup: {
      from: "users",
      foreignField: "_id",
      localField: "participants",
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
        $eq: req.user._id,
      },
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
            from: "messages",
            localField: "lastMessage",
            foreignField: "_id",
            as: "lastMessage",
            pipeline: [
              {
                $project: {
                  text: 1,
                  sender: 1,
                },
              },
              {
                $lookup: {
                  from: "users",
                  localField: "sender",
                  foreignField: "_id",
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
                $unwind: "$sender",
              },
            ],
          },
        },
        {
          $unwind: "$lastMessage",
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
        {
          $lookup: {
            from: "messages",
            localField: "lastMessage",
            foreignField: "_id",
            as: "lastMessage",
            pipeline: [
              {
                $project: {
                  text: 1,
                  sender: 1,
                },
              },
              // populating sender
              {
                $lookup: {
                  from: "users",
                  localField: "sender",
                  foreignField: "_id",
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
                $unwind: "$sender",
              },
            ],
          },
        },
        {
          $unwind: "$lastMessage",
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

      ...conversationCommonAggregator(),
      // ...getAllConversationsAggregator(req),
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
      ...conversationCommonAggregator(),
      // common aggrgation
      // ...conversationOneToOneAggregator(req),
      // ...conversationCommonAggregator(req)
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

    // create a message to add as last Messagae
    const sampleMsg = await Message.create({
      text: `Say hi to ${reciever.username}`,
      sender: req.user._id,
    });

    // create new conversaation since doesnot exists
    const newConv = await Conversation.create({
      name: "one to one",
      participants: [req.user._id, new mongoose.Types.ObjectId(recieverId)],
      admin: req.user._id,
      lastMessage: sampleMsg._id,
    });

    const createdConv = await Conversation.aggregate([
      {
        $match: {
          _id: newConv._id,
        },
      },
      ...conversationCommonAggregator(),
      // ...conversationOneToOneAggregator(req),
      // ...conversationCommonAggregator
    ]);

    // emit that a conversation is created to other participants of that conversation
    createdConv[0].participants.forEach((participant) => {
      if (participant._id.toString() === req.user._id.toString()) return;

      emitSocketEvent(
        req,
        participant._id.toString(),
        ChatEventEnum.NEW_CHAT,
        createdConv[0]
      );
    });

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
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

    // const lastMessage = await Message.create({
    //   text: `Say hi to ${}`
    // })

    // create a message to add as last Messagae
    const sampleMsg = await Message.create({
      text: `Say hi to group members`,
      sender: req.user._id,
    });

    const groupConversation = await Conversation.create({
      name,
      isGroupConversation: true,
      participants: members,
      admin: req.user._id,
      lastMessage: sampleMsg._id,
    });

    console.log("groupconv = ", groupConversation);

    // structure conversation
    const conversation = await Conversation.aggregate([
      {
        $match: {
          _id: {
            $eq: groupConversation._id,
          },
        },
      },
      ...conversationCommonAggregator(),
    ]);

    if (!conversation) throw new ApiError(500, "Internal server error");
    console.log("conversation = ", conversation);

    // emit socket event to all participants
    conversation[0].participants.forEach((participant) => {
      if (participant._id.toString() === req.user._id.toString()) return;

      // emit
      // emitSocketEvent(
      //   req,
      //   participant._id.toString(),
      //   ChatEventEnum.NEW_CHAT,
      //   conversation[0]
      // );
    });

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

export const getConversationDetail = asyncRequestHandler(
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

      ...conversationCommonAggregator(),
      // ...(conversation.isGroupConversation
      //   ? groupConversationDetailAggregator(req)
      //   : oneToOneConversationDetailAggregator(req)),
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
