import express from "express";
import { getSummary } from "../controllers/dashboard.controller.js";
import { protect, adminOnly } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/summary", protect, adminOnly, getSummary);

export default router;