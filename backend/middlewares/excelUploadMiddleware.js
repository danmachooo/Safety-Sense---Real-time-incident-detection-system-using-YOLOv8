import multer from "multer";
import { BadRequestError } from "../utils/Error.js";

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

export const uploadExcel = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
}).single("file");
