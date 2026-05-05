import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { analyzeMealWithGemini } from "../controllers/aiMealController.js";

const router = express.Router();

const uploadsDir = path.resolve("uploads/meal-images");
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    const safeExt = ext.match(/^\.(jpg|jpeg|png|webp)$/) ? ext : ".jpg";
    cb(null, `meal-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Formato de imagen no permitido. Usa JPG, PNG o WEBP."));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.post("/analyze", upload.single("image"), analyzeMealWithGemini);

export default router;