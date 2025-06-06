// const { getFileUrl, getFilePath } = require("../../config/multer");
// const { StatusCodes } = require("http-status-codes");
// const { BadRequestError } = require("../../utils/Error");

import getFileUrl from "../../config/multer.js";
import getFilePath from "../../config/multer.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError } from "../../utils/Error.js";
/**
 * Upload an image for an incident report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const uploadIncidentImage = async (req, res, next) => {
  try {
    console.log("Upload controller reached");
    console.log("Request headers:", req.headers);
    console.log("Request body:", req.body);
    console.log("REQUEST FILE: ", req.file);

    // Check if file exists in the request
    if (!req.file) {
      console.log("No file found in request");

      // Check if the request has the correct content type
      if (
        !req.headers["content-type"] ||
        !req.headers["content-type"].includes("multipart/form-data")
      ) {
        throw new BadRequestError("Request must be multipart/form-data");
      }

      throw new BadRequestError("No image file uploaded");
    }

    // Generate URL for the uploaded file
    const imageUrl = getFileUrl(req.file.filename);

    console.log("Upload successful:", {
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      imageUrl: imageUrl,
    });

    const imagePath = getFilePath(req.file.filename);
    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Image uploaded successfully",
      data: {
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        imagePath: imagePath,
      },
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    next(error);
  }
};

export { uploadIncidentImage };
