import mongoose from "mongoose";
import { FriendRequest } from "../models/friendrequest.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncRequestHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const sendFriendrequestController = asyncRequestHandler(
  async (req, res, next) => {
    const { user_id } = req.body;

    console.log("sending request to " + user_id);

    const user = await User.findById(req.user._id);

    const friendRequest = await FriendRequest.findOne({
      from: req.user._id,
      to: new mongoose.Types.ObjectId(user_id),
    });

    if (!friendRequest) {
      await FriendRequest.create({
        from: req.user._id,
        to: new mongoose.Types.ObjectId(user_id),
      });

      return res
        .status(200)
        .json(new ApiResponse(200, null, "friend request sent successfully"));
    }

    if (friendRequest.status === "REJECTED") {
      friendRequest.status = "PENDING";
      friendRequest.save({ validateBeforeSave: false });
      return res
        .status(200)
        .json(new ApiResponse(200, null, "friend request sent successfully"));
    }

    throw new ApiError(
      409,
      `Friend request is already sent and is ${friendRequest.status}`
    );
  }
);

export const updateFriendrequestController = asyncRequestHandler(
  async (req, res, next) => {
    const { friend_request_id, status } = req.body;

    const request = await FriendRequest.findOne({
      _id: friend_request_id,
    });

    if (!request) throw new ApiError(404, "request not found");

    if (!request.to.equals(req.user._id))
      throw new ApiError(
        401,
        "You are not authorized to change this request status"
      );

    if (request.status === "ACCEPTED")
      throw new ApiError(409, "request already accepted");

    request.status = status;
    request.save({
      validateBeforeSave: false,
    });

    if (status === "REJECTED") {
      return res
        .status(200)
        .json(new ApiResponse(200, null, "Request rejected successfully"));
    }

    // add each user to each other friends list
    await User.findByIdAndUpdate(request.from, {
      $push: {
        friends: request.to,
      },
    });

    await User.findByIdAndUpdate(request.to, {
      $push: {
        friends: request.from,
      },
    });

    res.send("friend request accepted");
  }
);

export const unfriendController = asyncRequestHandler(
  async (req, res, next) => {
    const { userId } = req.body;

    const me = await User.findById(req.user._id);

    if (!me.friends.includes(new mongoose.Types.ObjectId(userId)))
      throw new ApiError(404, "not a friend to unfriend");

    // remove from friend list of each other
    me.friends.pull(new mongoose.Types.ObjectId(userId));
    await me.save({ validateBeforeSave: false });

    await User.findByIdAndUpdate(
      new mongoose.Types.ObjectId(userId),
      {
        $pull: {
          friends: me._id,
        },
      },
      {
        new: true,
      }
    );

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Unfriended successfully"));
  }
);

export const getAllFriendrequestController = asyncRequestHandler(
  async (req, res, next) => {
    const friendRequests = await FriendRequest.find({
      $or: [{ to: req.user._id }],
    }).populate({
      path: "from",
      select: "username avatar",
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          friendRequests,
          "Friend requests retrived successfully"
        )
      );
  }
);
