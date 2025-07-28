import multer from "multer";
import { BadRequestError } from "../utils/Error.js";
import supabase from "./supabase/supabase.js";

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

// Enhanced retry logic for network issues
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const retryOperation = async (operation, maxRetries = 3, baseDelay = 1000) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt} failed:`, error.message);

      // Check if it's a network/timeout error that might benefit from retry
      const isRetryableError =
        error.message?.includes("fetch failed") ||
        error.message?.includes("Connect Timeout") ||
        error.code === "UND_ERR_CONNECT_TIMEOUT" ||
        error.code === "ECONNRESET" ||
        error.code === "ETIMEDOUT";

      if (!isRetryableError || attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff with jitter
      const delayTime =
        baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      console.log(`Retrying in ${Math.round(delayTime)}ms...`);
      await delay(delayTime);
    }
  }

  throw lastError;
};

// Upload file to Supabase storage with correct bucket/folder structure
// Upload file to Supabase storage with correct bucket/folder structure
const uploadToSupabase = async (file, rawBucket = "uploads") => {
  const bucket = rawBucket.trim();

  try {
    // Skip bucket validation to avoid extra network calls
    // Assume bucket exists and let the upload operation handle errors

    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExt = file.originalname.split(".").pop();
    const fileName = `incident-${uniqueSuffix}.${fileExt}`;

    // Upload to uploads bucket in the incidents folder
    const filePath = `incidents/${fileName}`;

    console.log(`Uploading ${filePath} to Supabase bucket: ${bucket}`);

    const uploadOperation = async () => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error("Supabase upload error:", error);

        // Handle specific bucket not found error
        if (
          error.message?.includes("Bucket not found") ||
          error.message?.includes("bucket does not exist")
        ) {
          throw new BadRequestError(
            `Bucket '${bucket}' does not exist. Please check your Supabase configuration.`
          );
        }

        throw new BadRequestError(`Upload failed: ${error.message}`);
      }

      return data;
    };

    const data = await retryOperation(uploadOperation, 3, 2000);

    console.log("File uploaded successfully to Supabase:", data);
    return data.path; // This will be "incidents/incident-xxx.jpg"
  } catch (error) {
    console.error("Error uploading to Supabase after retries:", error);

    // Provide more specific error messages
    if (
      error.message?.includes("fetch failed") ||
      error.code === "UND_ERR_CONNECT_TIMEOUT" ||
      error.message?.includes("Connect Timeout")
    ) {
      throw new BadRequestError(
        "Network connection to Supabase failed. Please check your internet connection and try again."
      );
    }

    throw error;
  }
};

// Enhanced middleware wrapper with better error handling and fallback
const uploadMiddleware = (req, res, next) => {
  console.log("Request headers:", req.headers);
  console.log("Request body keys:", Object.keys(req.body || {}));

  upload(req, res, async function (err) {
    // Log parsed form data
    console.log("Parsed form fields:", req.body);
    console.log("Uploaded file:", req.file ? "Present" : "None");

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

    // If file was uploaded, try to upload it to Supabase
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

        // Instead of failing completely, continue without the file
        // and let the route handler decide what to do
        req.uploadError = uploadError;
        console.warn("Continuing without file upload due to network issues");
      }
    } else {
      console.log("No file uploaded in this request");
    }

    next();
  });
};

// Helper to get public URL from Supabase with correct bucket/folder structure
const getFileUrl = (filename, bucket = "uploads") => {
  try {
    // If filename already includes the folder path, use it as is
    const filePath = filename.includes("incidents/")
      ? filename
      : `incidents/${filename}`;
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  } catch (error) {
    console.error("Error getting file URL:", error);
    return null;
  }
};

// Helper to get file path (for backward compatibility)
const getFilePath = (filename) => {
  // Return the full path including the folder
  return filename.includes("incidents/") ? filename : `incidents/${filename}`;
};

// Helper to delete file from Supabase with retry logic
const deleteFile = async (filename, bucket = "uploads") => {
  try {
    const filePath = filename.includes("incidents/")
      ? filename
      : `incidents/${filename}`;

    const deleteOperation = async () => {
      const { error } = await supabase.storage.from(bucket).remove([filePath]);
      if (error) {
        console.error("Error deleting file from Supabase:", error);
        throw new BadRequestError(`Delete failed: ${error.message}`);
      }
      return true;
    };

    await retryOperation(deleteOperation, 2, 1000);
    console.log(`File ${filePath} deleted successfully from Supabase`);
    return true;
  } catch (error) {
    console.error("Error deleting file after retries:", error);
    throw error;
  }
};

// Health check function to test Supabase connection
const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
      console.error("Supabase connection test failed:", error);
      return false;
    }
    console.log("Supabase connection test passed");
    console.log(
      "Available buckets:",
      data.map((b) => b.name)
    );
    return true;
  } catch (error) {
    console.error("Supabase connection test error:", error);
    return false;
  }
};

// Function to test the uploads/incidents structure
const testUploadsIncidentsStructure = async () => {
  try {
    console.log("Testing uploads/incidents structure...");

    // List files in the uploads bucket
    const { data, error } = await supabase.storage
      .from("uploads")
      .list("incidents", {
        limit: 1,
      });

    if (error) {
      console.error("Error testing structure:", error);
      return false;
    }

    console.log("✅ uploads/incidents structure is accessible");
    return true;
  } catch (error) {
    console.error("Error testing uploads/incidents:", error);
    return false;
  }
};

// Export individual functions and the upload middleware
export const uploadSingle = uploadMiddleware;
export {
  getFilePath,
  getFileUrl,
  deleteFile,
  uploadToSupabase,
  testSupabaseConnection,
  testUploadsIncidentsStructure,
};

// Default export for backward compatibility
export default {
  upload: { single: () => uploadMiddleware },
  getFilePath,
  getFileUrl,
  deleteFile,
  testSupabaseConnection,
  testUploadsIncidentsStructure,
};
