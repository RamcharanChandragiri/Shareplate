import express from "express";
import {
  createRequest,
  getMyRequests,
  getIncomingRequests,
  getRequestById,
  approveRequest,
  rejectRequest,
  cancelRequest,
  schedulePickup,
  markReadyForPickup,
  confirmHandover,
  confirmCollection,
  getNgoStats
} from "../controllers/requestController.js";
import {
  protect,
  authorizeRoles,
  requireVerifiedNgo
} from "../middleware/authMiddleware.js";

const router = express.Router();

// NGO Endpoints
router.post("/", protect, authorizeRoles("NGO"), requireVerifiedNgo, createRequest);
router.get("/my", protect, authorizeRoles("NGO"), getMyRequests);
router.get("/ngo/stats", protect, authorizeRoles("NGO"), getNgoStats);
router.put("/:id/cancel", protect, authorizeRoles("NGO"), cancelRequest);
router.put("/:id/confirm-collection", protect, authorizeRoles("NGO"), confirmCollection);

// Donor Endpoints
router.get("/incoming", protect, authorizeRoles("DONOR"), getIncomingRequests);
router.put("/:id/approve", protect, authorizeRoles("DONOR"), approveRequest);
router.put("/:id/reject", protect, authorizeRoles("DONOR"), rejectRequest);
router.put("/:id/ready-for-pickup", protect, authorizeRoles("DONOR"), markReadyForPickup);
router.put("/:id/confirm-handover", protect, authorizeRoles("DONOR"), confirmHandover);

// Shared (Donor & NGO)
router.put("/:id/schedule-pickup", protect, schedulePickup);
router.get("/:id", protect, getRequestById);

export default router;
