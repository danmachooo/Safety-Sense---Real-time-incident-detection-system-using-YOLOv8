import { getFileUrl, getFilePath } from "../../config/multer.js";
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

      if (
        !req.headers["content-type"] ||
        !req.headers["content-type"].includes("multipart/form-data")
      ) {
        throw new BadRequestError("Request must be multipart/form-data");
      }

      throw new BadRequestError("No image file uploaded");
    }

    // Check if upload failed
    if (req.uploadError) {
      console.error("Upload failed:", req.uploadError);
      throw new BadRequestError(`Upload failed: ${req.uploadError.message}`);
    }

    // Check if Supabase path exists
    if (!req.file.supabasePath) {
      throw new BadRequestError(
        "File upload to storage failed - no Supabase path"
      );
    }

    // Get the relative path (this is what should be stored in DB)
    const imagePath = getFilePath(req.file.supabasePath);

    // Generate public URL for reference (but DON'T store this in DB)
    const imageUrl = getFileUrl(req.file.supabasePath);

    console.log("Upload successful:", {
      supabasePath: req.file.supabasePath,
      mimetype: req.file.mimetype,
      size: req.file.size,
      imagePath: imagePath, // This is what should be saved to DB
      imageUrl: imageUrl, // This is just for reference
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Image uploaded successfully",
      data: {
        filename: req.file.supabasePath.split("/").pop(),
        // ✅ Primary path to use for database storage (relative path)
        path: imagePath,
        // ⚠️ Deprecated - for backward compatibility only
        fullPath: req.file.supabasePath,
        imagePath: imagePath,
        // 📝 Public URL for immediate display (don't store this in DB)
        imageUrl: imageUrl,
        // Metadata
        mimetype: req.file.mimetype,
        size: req.file.size,
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    next(error);
  }
};

export { uploadIncidentImage };
