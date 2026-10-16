import express from "express";
import {
  stockIn,
  stockOut,
  adjustStock,
  getTransactions,
  getAlerts,
} from "../controllers/inventory.controller.js";
import { protect, adminOnly } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/stock-in", protect, adminOnly, stockIn);
router.post("/stock-out", protect, adminOnly, stockOut);
router.post("/adjust", protect, adminOnly, adjustStock);
router.get("/transactions", protect, adminOnly, getTransactions);
router.get("/alerts", protect, getAlerts);

export default router;