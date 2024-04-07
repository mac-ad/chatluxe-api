import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
  updateFriendrequestController,
  sendFriendrequestController,
  unfriendController,
} from "../controllers/friendship.controller.js";

const router = Router();

router.route("/").put(verifyJWT, unfriendController);

router
  .route("/send-friend-request")
  .post(verifyJWT, sendFriendrequestController);
router
  .route("/update-friend-request")
  .put(verifyJWT, updateFriendrequestController);

export default router;
