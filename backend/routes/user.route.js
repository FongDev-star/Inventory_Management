import express from "express";
import {
  getUsers,
  createUser,
  updateUser,
  resetPassword,
} from "../controllers/user.controller.js";
import { protect, adminOnly } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect, adminOnly);

router.get("/", getUsers);
router.post("/", createUser);
router.put("/:id", updateUser);
router.patch("/:id/password", resetPassword);

export default router;