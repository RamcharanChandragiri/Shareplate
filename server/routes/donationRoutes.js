import express from "express";
import {
  createDonation,
  getDonations,
  getMyDonations,
  getDonationById,
  updateDonation,
  cancelDonation,
  getDonorStats,
  claimDonation,
  markDonationPickedUp,
  markDonationCompleted,
  uploadDonationImage,
  scheduleDonationPickup
} from "../controllers/donationController.js";
import {
  protect,
  authorizeRoles,
  requireVerifiedNgo
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Public / Authenticated Browse
router.get("/", protect, getDonations);

// Image Upload
router.post("/upload-image", protect, authorizeRoles("DONOR"), uploadDonationImage);

// Donor-specific endpoints
router.post("/", protect, authorizeRoles("DONOR"), createDonation);
router.get("/my", protect, authorizeRoles("DONOR"), getMyDonations);
router.get("/donor/stats", protect, authorizeRoles("DONOR"), getDonorStats);

// Single Donation Details
router.get("/:id", protect, getDonationById);

// NGO Direct Claim endpoint
router.put(
  "/:id/claim",
  protect,
  authorizeRoles("NGO"),
  requireVerifiedNgo,
  claimDonation
);

// Pickup & Completion Status Transitions (Donor, Claiming NGO, or Admin)
router.put("/:id/schedule-pickup", protect, scheduleDonationPickup);
router.put("/:id/pickup", protect, markDonationPickedUp);
router.put("/:id/complete", protect, markDonationCompleted);

// Donor Manage Existing
router.put("/:id", protect, authorizeRoles("DONOR"), updateDonation);
router.patch("/:id/cancel", protect, authorizeRoles("DONOR"), cancelDonation);

export default router;
