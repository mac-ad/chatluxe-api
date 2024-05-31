import { checkPermission, generateRandomUUID } from "../utils/common.js";
import { UploadSession } from "../models/uploadSession.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncRequestHandler } from "../utils/asyncHandler.js";
import path from "path";
import fs from "fs";

import { __dirname } from "../app.js";
import { Permissions } from "../constants.js";

const generateTempFilename = (uploadId, chunkNumber) => {
  return `${uploadId}_${chunkNumber}`;
};

export const uploadSessionController = asyncRequestHandler(
  async (req, res, next) => {
    const { filename, totalSize } = req.body;

    // generate unique identifier for a session
    const uploadId = generateRandomUUID();

    const newSession = new UploadSession({
      filename,
      totalSize,
      uploadId,
      uploadedChunks: [],
    });

    await newSession.save();

    return res
      .status(200)
      .json(new ApiResponse(200, { uploadId }, "Upload session established"));
  }
);

export const uploadChunkController = asyncRequestHandler(
  async (req, res, next) => {
    const { uploadId } = req.params;
    const { chunkNumber } = req.body;
    const chunkData = req.file.buffer;

    console.log(uploadId, chunkNumber, req.file, chunkData);

    try {
      const session = await UploadSession.findOne({
        uploadId: { $eq: uploadId },
      });

      if (!session)
        return res
          .status(404)
          .json(new ApiResponse(404, null, "Upload session not found"));

      const filename = generateTempFilename(uploadId, chunkNumber);
      const filePath = path.join(__dirname, "/uploads/", filename);

      // console.log(filePath);

      // if (!checkPermission(filePath, Permissions.FILE_EXIST)) {
      //   console.log("no permission");
      //   return res
      //     .status(401)
      //     .json(
      //       new ApiResponse(401, null, "Write permission is not available")
      //     );
      // } else {
      //   console.log("permission");
      // }

      await fs.promises.writeFile(`./uploads/tmp/${filename}`, chunkData);

      session.uploadedChunks.push(chunkNumber);
      await session.save();

      console.log(session);

      return res
        .status(200)
        .json(new ApiResponse(200, null, "Chunk uploaded successfully"));
    } catch (err) {
      console.log(err);
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Error occured uploading a chunk"));
    }
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Chunk uploaded successfully"));
  }
);

export const uploadCommitController = asyncRequestHandler(
  async (req, res, next) => {
    const { uploadId } = req.params;

    const chunkSize = 30000;

    try {
      const session = await UploadSession.findOne({
        uploadId: {
          $eq: uploadId,
        },
      });

      if (!session)
        return res
          .status(404)
          .json(new ApiResponse(404, null, "Upload session not found"));

      const expectedChunks = Math.ceil(session.totalSize / chunkSize);
      const isUploadComplete =
        session.uploadedChunks.length === expectedChunks &&
        session.uploadedChunks.every((chunk) => chunk >= 0);

      if (!isUploadComplete) {
        return res
          .status(400)
          .json(new ApiResponse(400, null, "Missing chunk while uploading"));
      }

      const finalFilePath = path.join("./uploads", session.filename);
      const writeStream = fs.createWriteStream(finalFilePath);

      for (let chunkNumber = 0; chunkNumber < expectedChunks; chunkNumber++) {
        const tempFileName = generateTempFilename(uploadId, chunkNumber);
        const tempFilePath = path.join("./uploads/tmp/", tempFileName);
        try {
          const chunkData = await fs.promises.readFile(tempFilePath);
          writeStream.write(chunkData);
        } catch (error) {
          console.error(error);
          await fs.promises.unlink(finalFilePath); // Delete partially assembled file on error
          return res
            .status(500)
            .json(new ApiResponse(500, null, "Error assembling file"));
        } finally {
          await fs.promises.unlink(tempFilePath); // Cleanup temporary chunk file
        }
        writeStream.on("finish", async () => {
          console.log("write finished");
          writeStream.end(); // Close write stream
          await UploadSession.findByIdAndDelete(session._id);
          res
            .status(200)
            .json(new ApiResponse(200, null, "File Uploaded successfully"));
        });
      }
    } catch (err) {
      res.status(500).json(new ApiResponse(500, null, "Error occured"));
    }
    return res;
  }
);
