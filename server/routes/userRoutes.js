import express from "express";
import {
  getProfile,
  updateProfile,
  getAllUsers,
  verifyNgo
} from "../controllers/userController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Current user profile endpoints
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);

// Admin-only management endpoints
router.get("/", protect, authorizeRoles("ADMIN"), getAllUsers);
router.put("/:id/verify-ngo", protect, authorizeRoles("ADMIN"), verifyNgo);

export default router;
