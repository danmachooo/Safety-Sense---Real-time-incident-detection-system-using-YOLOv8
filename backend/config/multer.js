import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import { BadRequestError } from "../utils/Error.js";

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Configure multer to use memory storage instead of disk storage
const storage = multer.memoryStorage();

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  console.log("Received file in filter:", file);

  if (file.mimetype.startsWith("image/")) {
    console.log(`File accepted: ${file.originalname} (${file.mimetype})`);
    cb(null, true);
  } else {
    console.log(`File rejected: ${file.originalname} (${file.mimetype})`);
    cb(
      new BadRequestError(
        `Only image files are allowed! Received: ${file.mimetype}`
      ),
      false
    );
  }
};

// Create multer upload instance with memory storage
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
}).single("image");

// Upload file to Supabase storage
const uploadToSupabase = async (file, bucket = "incidents") => {
  try {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExt = file.originalname.split(".").pop();
    const fileName = `incident-${uniqueSuffix}.${fileExt}`;

    console.log(`Uploading ${fileName} to Supabase bucket: ${bucket}`);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      throw new BadRequestError(`Upload failed: ${error.message}`);
    }

    console.log("File uploaded successfully to Supabase:", data);
    return data.path;
  } catch (error) {
    console.error("Error uploading to Supabase:", error);
    throw error;
  }
};

// Middleware wrapper for better error handling
const uploadMiddleware = (req, res, next) => {
  console.log("Request headers:", req.headers);

  upload(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      console.error("Multer error:", err);
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(
          new BadRequestError("File too large. Maximum size is 10MB")
        );
      }
      return next(new BadRequestError(`Upload error: ${err.message}`));
    } else if (err) {
      console.error("Unknown upload error:", err);
      return next(err);
    }

    // If file was uploaded, upload it to Supabase
    if (req.file) {
      try {
        console.log("Processing file for Supabase upload:", req.file);
        const supabasePath = await uploadToSupabase(req.file);

        // Add Supabase path to the request object
        req.file.supabasePath = supabasePath;
        req.file.filename = supabasePath.split("/").pop(); // Extract filename from path

        console.log("Upload middleware completed successfully");
        console.log("req.file after Supabase upload:", req.file);
      } catch (uploadError) {
        console.error("Supabase upload failed:", uploadError);
        return next(uploadError);
      }
    }

    next();
  });
};

// Helper to get public URL from Supabase
const getFileUrl = (filename, bucket = "incidents") => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
  return data.publicUrl;
};

// Helper to get file path (for backward compatibility)
const getFilePath = (filename) => filename;

// Helper to delete file from Supabase
const deleteFile = async (filename, bucket = "incidents") => {
  try {
    const { error } = await supabase.storage.from(bucket).remove([filename]);
    if (error) {
      console.error("Error deleting file from Supabase:", error);
      throw new BadRequestError(`Delete failed: ${error.message}`);
    }
    console.log(`File ${filename} deleted successfully from Supabase`);
    return true;
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
};

// Export individual functions and the upload middleware
export const uploadSingle = uploadMiddleware;
export { getFilePath, getFileUrl, deleteFile, uploadToSupabase };

// Default export for backward compatibility
export default {
  upload: { single: () => uploadMiddleware },
  getFilePath,
  getFileUrl,
  deleteFile,
};
