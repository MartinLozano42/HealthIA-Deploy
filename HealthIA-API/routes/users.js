import express from "express";
import {
  getOnboarding,
  getUser,
  getUsers,
  saveActivityProfile,
  saveOnboarding,
  updateUserStatus,
} from "../controllers/userController.js";

const router = express.Router();

router.get("/", getUsers);
router.get("/onboarding/:idUser", getOnboarding);
router.post("/onboarding", saveOnboarding);
router.post("/activity-profile", saveActivityProfile);
router.post("/useractivityprofile", saveActivityProfile);
router.get("/:id", getUser);
router.put("/:id/status",updateUserStatus);
export default router;
