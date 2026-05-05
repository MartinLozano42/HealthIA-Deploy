import express from "express";
import { getActivityLevels } from "../controllers/activityLevelController.js";

const router = express.Router();

router.get("/", getActivityLevels);

export default router;
