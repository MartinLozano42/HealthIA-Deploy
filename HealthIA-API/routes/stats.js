import express from "express";
import {
  saveStats,
  getAdminSummary,
  getUserProgressStats,
} from "../controllers/statsController.js";

const router = express.Router();

router.post("/", saveStats);

// Estadísticas personales del usuario
router.get("/user/:idUser", getUserProgressStats);

// Estadísticas del admin
router.get("/admin-summary", getAdminSummary);

export default router;