import {register, login, logout, getMe} from "../controllers/auth.controller.js";
import {protect} from "../middleware/auth.middleware.js";
import express from "express";
import {loginLimiter} from "../middleware/rateLimit.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", loginLimiter, login);
router.post("/logout", logout);

router.get("/me", protect, getMe);


export default router;