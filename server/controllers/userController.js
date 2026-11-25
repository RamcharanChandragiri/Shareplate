import User from "../models/User.js";
import { sendNotification } from "../services/notificationService.js";

/**
 * GET /api/users/profile
 * Get current user profile
 */
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/profile
 * Update user profile
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, donorDetails, ngoDetails } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    if (name) user.name = name.trim();
    if (phone) user.phone = phone.trim();

    if (user.role === "DONOR" && donorDetails) {
      user.donorDetails = {
        organizationName: donorDetails.organizationName || user.donorDetails.organizationName,
        organizationType: donorDetails.organizationType || user.donorDetails.organizationType,
        address: donorDetails.address || user.donorDetails.address
      };
    }

    if (user.role === "NGO" && ngoDetails) {
      user.ngoDetails = {
        ngoName: ngoDetails.ngoName || user.ngoDetails.ngoName,
        registrationNumber: ngoDetails.registrationNumber || user.ngoDetails.registrationNumber,
        contactPerson: ngoDetails.contactPerson || user.ngoDetails.contactPerson,
        address: ngoDetails.address || user.ngoDetails.address,
        organizationDetails: ngoDetails.organizationDetails || user.ngoDetails.organizationDetails
      };
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        donorDetails: user.donorDetails,
        ngoDetails: user.ngoDetails,
        ngoVerificationStatus: user.ngoVerificationStatus,
        accountStatus: user.accountStatus,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users (Admin only)
 * List all users with optional role filtering
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const { role, ngoVerificationStatus } = req.query;
    const filter = {};
    if (role) filter.role = role.toUpperCase();
    if (ngoVerificationStatus) filter.ngoVerificationStatus = ngoVerificationStatus.toUpperCase();

    const users = await User.find(filter).select("-password").sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/:id/verify-ngo (Admin only)
 * Approve or reject an NGO's verification status
 */
export const verifyNgo = async (req, res, next) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!["VERIFIED", "REJECTED"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either 'VERIFIED' or 'REJECTED'."
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    if (user.role !== "NGO") {
      return res.status(400).json({
        success: false,
        message: "Target user is not an NGO."
      });
    }

    user.ngoVerificationStatus = status;
    await user.save();

    await sendNotification({
      recipient: user._id,
      sender: req.user._id,
      title: `NGO Verification Update: ${status}`,
      message:
        status === "VERIFIED"
          ? "Congratulations! Your NGO registration has been verified. You now have full access to claim surplus food."
          : "Your NGO verification request was not approved. Please contact platform administration.",
      type: "SYSTEM",
      link: "/ngo/dashboard"
    });

    res.status(200).json({
      success: true,
      message: `NGO verification status updated to ${status}.`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        ngoDetails: user.ngoDetails,
        ngoVerificationStatus: user.ngoVerificationStatus
      }
    });
  } catch (error) {
    next(error);
  }
};
