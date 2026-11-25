import express from "express";
import {
  getAdminMetrics,
  getAllDonationsAdmin,
  getAllRequestsAdmin,
  updateUserStatus,
  getReportsAnalytics
} from "../controllers/adminController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes are strictly restricted to ADMIN
router.use(protect, authorizeRoles("ADMIN"));

router.get("/metrics", getAdminMetrics);
router.get("/reports", getReportsAnalytics);
router.get("/donations", getAllDonationsAdmin);
router.get("/requests", getAllRequestsAdmin);
router.put("/users/:id/status", updateUserStatus);

export default router;
