import { Router } from "express";
import {
  registerUser,
  verifyEmail,
  loginUser,
  logoutUser,
  resendEmailVerification,
  getLoggedInUser,
  deleteUser,
  refreshToken,
  getAllUsers,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

router.route("/me").get(verifyJWT, getLoggedInUser);
router.route("/").post(registerUser).get(verifyJWT, getAllUsers);
router.route("/:userId").delete(deleteUser);
router.route("/verify-email/:verificationToken").get(verifyEmail);
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router
  .route("/resend-email-verification")
  .post(verifyJWT, resendEmailVerification);

router.route("/refresh-token").post(refreshToken);

export default router;
