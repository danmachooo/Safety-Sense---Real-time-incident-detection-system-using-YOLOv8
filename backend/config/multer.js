const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { BadRequestError } = require("../utils/Error");
require("dotenv").config(); // Make sure to load .env

// Create uploads directory if it doesn't exist
const createUploadsDir = () => {
  const uploadDir = path.join(__dirname, "../uploads");
  const incidentImagesDir = path.join(uploadDir, "incidents");

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`Created uploads directory: ${uploadDir}`);
  }

  if (!fs.existsSync(incidentImagesDir)) {
    fs.mkdirSync(incidentImagesDir, { recursive: true });
    console.log(`Created incidents directory: ${incidentImagesDir}`);
  }

  return incidentImagesDir;
};

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = createUploadsDir();
    console.log(`File will be saved to: ${uploadPath}`);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || ".jpg";
    const filename = `incident-${uniqueSuffix}${ext}`;
    console.log(
      `Generated filename: ${filename} for original: ${file.originalname}`
    );
    cb(null, filename);
  },
});

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

// Create multer upload instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
}).single("image");

// Middleware wrapper for better error handling
const uploadMiddleware = (req, res, next) => {
  console.log("Request headers:", req.headers);

  upload(req, res, function (err) {
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

    console.log("Upload middleware completed successfully");
    console.log("req.file after upload:", req.file);
    next();
  });
};

// Helper to construct the full image URL
const getFilePath = (filename) => `uploads/incidents/${filename}`;
const getFileUrl = (filename) => {
  const baseUrl =
    process.env.BASE_URL || `http://localhost:${process.env.PORT}`;
  return `${baseUrl}/uploads/incidents/${filename}`;
};

module.exports = {
  upload: { single: () => uploadMiddleware },
  getFilePath,
  getFileUrl,
};
