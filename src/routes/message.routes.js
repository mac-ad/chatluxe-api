import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
  getAllMessagesController,
  sendMessageController,
  messageSeenController,
} from "../controllers/message.controller.js";

const router = Router();

router.use(verifyJWT);

router
  .route("/:conversationId")
  .get(getAllMessagesController)
  .post(sendMessageController);

router.route("/:messageId/seen/").post(messageSeenController);

export default router;
