import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import { BadRequestError } from "../utils/Error.js";

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Use memory storage instead of disk storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype ===
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    cb(null, true);
  } else {
    cb(new BadRequestError("Only .xlsx files are allowed."), false);
  }
};

// Upload Excel file to Supabase storage
const uploadExcelToSupabase = async (file, bucket = "excels") => {
  try {
    const fileName = `inventory-${Date.now()}.xlsx`;

    console.log(`Uploading ${fileName} to Supabase bucket: ${bucket}`);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Supabase Excel upload error:", error);
      throw new BadRequestError(`Upload failed: ${error.message}`);
    }

    console.log("Excel file uploaded successfully to Supabase:", data);
    return data.path;
  } catch (error) {
    console.error("Error uploading Excel to Supabase:", error);
    throw error;
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// Enhanced middleware to handle Supabase upload
const uploadExcelMiddleware = (req, res, next) => {
  const uploadSingle = upload.single("file");

  uploadSingle(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      console.error("Multer error:", err);
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new BadRequestError("File too large. Maximum size is 5MB"));
      }
      return next(new BadRequestError(`Upload error: ${err.message}`));
    } else if (err) {
      console.error("Unknown upload error:", err);
      return next(err);
    }

    // If file was uploaded, upload it to Supabase
    if (req.file) {
      try {
        console.log("Processing Excel file for Supabase upload:", req.file);
        const supabasePath = await uploadExcelToSupabase(req.file);

        // Add Supabase path to the request object
        req.file.supabasePath = supabasePath;
        req.file.filename = supabasePath.split("/").pop();

        console.log("Excel upload middleware completed successfully");
        console.log("req.file after Supabase upload:", req.file);
      } catch (uploadError) {
        console.error("Supabase Excel upload failed:", uploadError);
        return next(uploadError);
      }
    }

    next();
  });
};

export const uploadExcel = uploadExcelMiddleware;
