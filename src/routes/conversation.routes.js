import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
  getAllConversationsController,
  createOrGetOneToOneController,
  createAGroupController,
} from "../controllers/conversation.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/").get(getAllConversationsController);

router.route("/c/:recieverId").post(createOrGetOneToOneController);

router.route("/group").post(createAGroupController);

export default router;
