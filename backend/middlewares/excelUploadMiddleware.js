import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { BadRequestError } from "../utils/Error.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createUploadsDir = () => {
  const dir = path.join(__dirname, "../uploads/excels");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, createUploadsDir()),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `inventory-${Date.now()}${ext}`);
  },
});

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

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

export const uploadExcel = upload.single("file");
