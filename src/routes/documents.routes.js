import { Router } from "express";
import { convertDocumentsController } from "../controllers/document.controller.js";
import multer from "multer";

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Replace 'uploads/' with your desired storage directory
  },
  filename: (req, file, cb) => {
    cb(null, `${file.originalname}`); // Use the original filename with extension
  },
});

const upload = multer({ storage: storage });

router
  .route("/convert")
  .post(upload.single("file"), convertDocumentsController);

export { router as documentRoutes };
