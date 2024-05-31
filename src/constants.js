import fs from "fs";

export const UserLoginType = {
  GOOGLE: "GOOGLE",
  GITHUB: "GITHUB",
  EMAIL_PASSWORD: "EMAIL_PASSWORD",
};

export const SOCIAL_LOGINS = Object.values(UserLoginType);

export const FRIENDREQUEST_STATUS = ["PENDING", "ACCEPTED", "REJECTED"];

export const Permissions = {
  FILE_EXIST: fs.constants.F_OK,
  READ: fs.constants.R_OK,
  WRITE: fs.constants.W_OK,
  EXECUTE: fs.constants.X_OK,
};
