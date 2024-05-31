import { spawn } from "child_process";
import path from "path";
import { __filename, __dirname } from "../app.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getExtension = (fileName) => {
  return fileName.split(".").pop();
};

const removeExtension = (fileName) => {
  return fileName.split(".")[0];
};

export const convertDocumentsController = (req, res) => {
  console.log(req.body, req.file);

  const file = req.file;

  


  return res.status(200).json(
    new ApiResponse(
      200,
      {
        input: inputFile,
        output: outputFile,
      },
      "converted"
    )
  );
};
