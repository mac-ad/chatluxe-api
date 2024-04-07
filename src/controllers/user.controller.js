import {
  asyncFunctionHandler,
  asyncRequestHandler,
} from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { emailVerificationMailgenContent, sendEmail } from "../utils/mail.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import crypto from "crypto";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);

    console.log("user===", user);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;

    user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (err) {
    throw new ApiError(500, "Error occured while generating token" + err);
  }
};

export const registerUser = asyncRequestHandler(async (req, res, next) => {
  const { email, username } = req.body;

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser)
    throw new ApiError(409, "User with email or username already exists");

  const user = await User.create({
    email,
    username,
    avatar: {
      url: `https://api.multiavatar.com/${username}.svg`,
    },
  });

  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();

  console.log({ unHashedToken, hashedToken, tokenExpiry });

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;

  await user.save({ validateBeforeSave: true });

  console.log(
    `${req.protocol}://${req.get(
      "host"
    )}/api/users/verify-email/${unHashedToken}`
  );

  await sendEmail({
    email: user?.email,
    subject: "Please verify your email",
    mailgenContent: emailVerificationMailgenContent(
      user.username,
      `${req.protocol}://${req.get(
        "host"
      )}/api/users/verify-email/${unHashedToken}`
    ),
  });

  const createdUser = await User.findById(user._id).select(
    "-refreshToken -emailVerificationToken -emailVerificationExpiry"
  );

  if (!createdUser)
    throw new ApiError(500, "Something went wrong while registering user");

  return res.status(201).json(
    new ApiResponse(
      200,
      {
        user: createdUser,
      },
      "Users registered successfully and verification email has been sent on your email."
    )
  );
});

export const verifyEmail = asyncRequestHandler(async (req, res, next) => {
  const { verificationToken } = req.params;

  if (!verificationToken)
    throw new ApiError(400, "Email verification token is missing");

  let hashedToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpiry: {
      $gt: Date.now(),
    },
  });

  if (!user) throw new ApiError(489, "Token is invalid or expired");

  user.emailVerificationExpiry = undefined;
  user.emailVerificationToken = undefined;

  user.isEmailVerified = true;

  await user.save({
    validateBeforeSave: true,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { isEmailVerified: true }, "Email is verified"));
});

export const loginUser = asyncRequestHandler(async (req, res, next) => {
  const { username, email } = req.body;

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) throw new ApiError(404, "User doesnot exist");

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user?._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry"
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

export const logoutUser = asyncRequestHandler(async (req, res, next) => {
  console.log(req.user._id);

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: null,
      },
    },
    {
      new: true,
    }
  );

  console.log(await User.findById(req.user._id));

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User loggedout successfully"));
});

export const resendEmailVerification = asyncRequestHandler(
  async (req, res, next) => {
    console.log("resending email verification");

    const user = await User.findById(req.user?._id);

    if (!user) throw new ApiError(404, "User doesnot exist", []);

    if (user.isEmailVerified)
      throw new ApiError(409, "Email is already verified");

    const { unHashedToken, hashedToken, tokenExpiry } =
      user.generateTemporaryToken();

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpiry = tokenExpiry;

    await user.save({ validateBeforeSave: false });

    await sendEmail({
      email: user?.email,
      subject: "Please verify your email",
      mailgenContent: emailVerificationMailgenContent(
        user.username,
        `${req.protocol}://${req.get(
          "host"
        )}/api/users/verify-email/${unHashedToken}`
      ),
    });

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Mail has been sent to your mailID"));
  }
);

export const getLoggedInUser = asyncRequestHandler(async (req, res, next) => {
  console.log("getting logged in user");

  const user = await User.findById(req.user._id).select("-refreshToken ");

  console.log("user = ", user);

  return res
    .status(200)
    .json(new ApiResponse(200, user, "profile retrived successfully"));
});

export const deleteUser = asyncRequestHandler(async (req, res, next) => {
  const { userId } = req.params;

  const deletedUser = await User.findByIdAndDelete(
    new mongoose.Types.ObjectId(userId)
  );

  if (!deletedUser) throw new ApiError(404, "User not found");

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: deletedUser,
      },
      "user deleted successfully"
    )
  );
});
