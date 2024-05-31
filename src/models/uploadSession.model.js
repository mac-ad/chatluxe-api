import mongoose from "mongoose";

const uploadSessionSchema = new mongoose.Schema({
  filename: String,
  totalSize: Number,
  uploadId: String,
  uploadedChunks: [Number],
});

export const UploadSession = mongoose.model(
  "UploadSession",
  uploadSessionSchema
);
