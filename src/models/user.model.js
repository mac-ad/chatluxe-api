import mongoose, { Schema } from "mongoose";
import { SOCIAL_LOGINS } from "../constants.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { asyncFunctionHandler } from "../utils/asyncHandler.js";
import { FriendRequest } from "./friendrequest.model.js";

const userSchema = new Schema(
  {
    avatar: {
      type: {
        url: String,
      },
      default: {
        url: "",
      },
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    loginType: {
      type: String,
      enum: SOCIAL_LOGINS,
    },
    isEmailVerified: {
      type: Boolean,
      default: false, // this will be set to false later on
    },
    refreshToken: {
      type: String,
    },
    forgotPasswordToken: {
      type: String,
    },
    forgotPasswordExpiry: {
      type: Date,
    },
    emailVerificationToken: {
      type: String,
    },
    emailVerificationExpiry: {
      type: Date,
    },
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

userSchema.methods.generateAccessToken = function () {
  console.log("generating access token", this._id);
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
    },
    "accesstokensecret",
    {
      expiresIn: 1 * 24 * 60 * 60,
    }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    "refreshtokensecret",
    {
      expiresIn: 5 * 24 * 60 * 60,
    }
  );
};

userSchema.methods.generateTemporaryToken = () => {
  const unHashedToken = crypto.randomBytes(20).toString("hex");

  const hashedToken = crypto
    .createHash("sha256")
    .update(unHashedToken)
    .digest("hex");

  const tokenExpiry = Date.now() + 20 * 60 * 1000;

  return { unHashedToken, hashedToken, tokenExpiry };
};

// this is not working when user is deleted by using findByIdAndDelete
userSchema.pre("remove", async function (next) {
  console.log("deleting remove", this._id);
  try {
    await FriendRequest.deleteMany({
      $or: [
        {
          from: this._id,
        },
        {
          to: this._id,
        },
      ],
    });
    next();
  } catch (err) {
    next(err);
  }
});

export const User = mongoose.model("User", userSchema);
