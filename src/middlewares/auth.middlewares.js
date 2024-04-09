import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncRequestHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncRequestHandler(async (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    //  req.header("Cookie")?.replace("Bearer", "") ||
    req.header("Authorization")?.replace("Bearer", "");

  if (!token) throw new ApiError(401, "Unauthorized request");

  try {
    const decodedToken = jwt.verify(token, "accesstokensecret");
    const user = await User.findById(decodedToken?._id).select("-refreshToken");

    if (!user) throw new ApiError(401, "Invalid access token");

    req.user = user;

    next();
  } catch (err) {
    throw new ApiError(401, err?.nessage || "invalid access token" + err);
  }
});
