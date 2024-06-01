import { Router } from "express";
import multer from "multer";
import {
  uploadChunkController,
  uploadCommitController,
  uploadSessionController,
} from "../controllers/fileUpload.controller.js";
import fs from "fs";

const router = Router();

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     fs.mkdirSync("uploads/tmp/", { recursive: true });
//     cb(null, "uploads/tmp/"); // Replace 'uploads/' with your desired storage directory
//   },
//   // ,
//   // filename: (req, file, cb) => {
//   //   cb(null, `${file.originalname}`); // Use the original filename with extension
//   // },
// });

const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload-session", uploadSessionController);
router.post(
  "/upload-chunk/:uploadId",
  upload.single("chunk"),
  uploadChunkController
);
router.post("/upload-commit/:uploadId", uploadCommitController);

// router.post(upload.single("file"), fileUploadController);

export { router as fileUploadRoutes };
