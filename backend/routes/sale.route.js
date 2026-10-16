import express from "express";
import {
  createSale,
  getSales,
  getSaleById,
  updatePaymentStatus,
} from "../controllers/sale.controller.js";
import { protect, adminOnly } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protect, createSale);
router.get("/", protect, getSales);
router.get("/:id", protect, getSaleById);
router.patch("/:id/payment", protect, adminOnly, updatePaymentStatus);

export default router;