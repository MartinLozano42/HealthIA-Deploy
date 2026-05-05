import { Router } from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "../controllers/notificationController.js";

const router = Router();

router.get("/:idUser", getNotifications);
router.patch("/:id/read", markAsRead);
router.patch("/:idUser/read-all", markAllAsRead);

export default router;
