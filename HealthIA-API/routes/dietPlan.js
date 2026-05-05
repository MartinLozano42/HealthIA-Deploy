import express from "express";
import {
  createUserFood,
  generateDietPlan,
  getAvailableIngredients,
  updateAvailableIngredients,
} from "../controllers/dietPlanController.js";

const router = express.Router();

router.get("/available/:idUser", getAvailableIngredients);
router.put("/available/:idUser", updateAvailableIngredients);
router.post("/foods", createUserFood);
router.post("/generate", generateDietPlan);

export default router;