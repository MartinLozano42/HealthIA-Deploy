import express from "express";
import {
	forgotPassword,
	login,
	register,
	resetPassword,
	testMail,
	verifyCode,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.post("/forgot-password", forgotPassword);
router.post("/verify-code", verifyCode);
router.post("/reset-password", resetPassword);
router.post("/test-mail", testMail);

export default router;
