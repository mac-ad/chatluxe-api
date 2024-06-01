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

export const ChatEventEnum = Object.freeze({
  CONNECTED: "CONNECTED",
  DISCONNECTED: "DISCONNECTED",
  JOIN_CHAT: "JOINCHAT",
  LEAVE_CHAT: "LEAVECHAT",
  UPDATE_GROUP_NAME: "UPDATEGROUPNAME",
  MESSAGE_RECIEVED: "MESSAGERECIEVED",
  NEW_CHAT: "NEWCHAT",
  SOCKET_ERROR: "SOCKETERROR",
  STOP_TYPING: "STOPTYPING",
  TYPING: "TYPING",
  CHAT_UPDATE: "CHATUPDATE",
});
