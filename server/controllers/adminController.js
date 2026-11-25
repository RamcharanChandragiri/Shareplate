import User from "../models/User.js";
import FoodDonation from "../models/FoodDonation.js";
import FoodRequest from "../models/FoodRequest.js";
import { sendNotification } from "../services/notificationService.js";

/**
 * GET /api/admin/metrics
 * Comprehensive system overview for administrators
 */
export const getAdminMetrics = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalDonors,
      totalNgos,
      pendingNgos,
      verifiedNgos,
      rejectedNgos,
      totalDonations,
      activeDonations,
      claimedDonations,
      pickedUpDonations,
      completedDonations,
      cancelledDonations,
      expiredDonations,
      totalRequests,
      completedRequests
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "DONOR" }),
      User.countDocuments({ role: "NGO" }),
      User.countDocuments({ role: "NGO", ngoVerificationStatus: "PENDING" }),
      User.countDocuments({ role: "NGO", ngoVerificationStatus: "VERIFIED" }),
      User.countDocuments({ role: "NGO", ngoVerificationStatus: "REJECTED" }),
      FoodDonation.countDocuments(),
      FoodDonation.countDocuments({ status: { $in: ["AVAILABLE", "PARTIALLY_RESERVED"] } }),
      FoodDonation.countDocuments({ status: "CLAIMED" }),
      FoodDonation.countDocuments({ status: "PICKED_UP" }),
      FoodDonation.countDocuments({ status: "COMPLETED" }),
      FoodDonation.countDocuments({ status: "CANCELLED" }),
      FoodDonation.countDocuments({ status: "EXPIRED" }),
      FoodRequest.countDocuments(),
      FoodRequest.countDocuments({ status: "COMPLETED" })
    ]);

    // Aggregate total quantity fulfilled
    const donations = await FoodDonation.find({}, "fulfilledQuantity");
    let totalMealsRescued = 0;
    donations.forEach((d) => {
      totalMealsRescued += d.fulfilledQuantity || 0;
    });

    res.status(200).json({
      success: true,
      metrics: {
        totalUsers,
        totalDonors,
        totalNgos,
        pendingNgos,
        verifiedNgos,
        rejectedNgos,
        totalDonations,
        activeDonations,
        claimedDonations,
        pickedUpDonations,
        completedDonations,
        cancelledDonations,
        expiredDonations,
        totalRequests,
        completedRequests,
        totalMealsRescued
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/donations
 * Administrative list of all food donations across all donors
 */
export const getAllDonationsAdmin = async (req, res, next) => {
  try {
    const { status, category } = req.query;
    const filter = {};
    if (status) filter.status = status.toUpperCase();
    if (category) filter.category = category.toUpperCase();

    const donations = await FoodDonation.find(filter)
      .populate("donor", "name email phone donorDetails")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: donations.length,
      donations
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/requests
 * Administrative list of all food requests across the platform
 */
export const getAllRequestsAdmin = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status.toUpperCase();

    const requests = await FoodRequest.find(filter)
      .populate("donation")
      .populate("donor", "name email phone donorDetails")
      .populate("ngo", "name email phone ngoDetails")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/users/:id/status
 * Suspend or reactivate user accounts
 */
export const updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["ACTIVE", "SUSPENDED"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either 'ACTIVE' or 'SUSPENDED'."
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    if (user.role === "ADMIN" && user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "Administrators cannot suspend their own account."
      });
    }

    user.accountStatus = status;
    await user.save();

    await sendNotification({
      recipient: user._id,
      sender: req.user._id,
      title: "Account Status Update",
      message: `Your account status has been changed to '${status}'.`,
      type: "SYSTEM"
    });

    res.status(200).json({
      success: true,
      message: `User status changed to ${status}.`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/reports
 * Comprehensive reporting and analytics data aggregated from MongoDB
 */
export const getReportsAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const query = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

    // 1. Status distribution
    const statusCounts = await FoodDonation.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalQuantity: { $sum: "$totalQuantity" },
          fulfilledQuantity: { $sum: "$fulfilledQuantity" }
        }
      }
    ]);

    // 2. Category distribution
    const categoryCounts = await FoodDonation.aggregate([
      { $match: query },
      { $group: { _id: "$category", count: { $sum: 1 }, quantity: { $sum: "$totalQuantity" } } },
      { $sort: { count: -1 } }
    ]);

    // 3. Top Donor contributions
    const topDonors = await FoodDonation.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$donor",
          donationCount: { $sum: 1 },
          completedCount: { $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] } },
          totalFoodSupplied: { $sum: "$totalQuantity" },
          foodFulfilled: { $sum: "$fulfilledQuantity" }
        }
      },
      { $sort: { totalFoodSupplied: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "donorUser"
        }
      },
      { $unwind: "$donorUser" },
      {
        $project: {
          _id: 1,
          donationCount: 1,
          completedCount: 1,
          totalFoodSupplied: 1,
          foodFulfilled: 1,
          name: "$donorUser.name",
          organizationName: "$donorUser.donorDetails.organizationName",
          organizationType: "$donorUser.donorDetails.organizationType"
        }
      }
    ]);

    // 4. Top NGO distributions (both direct claims and requests)
    const claimedNgoAgg = await FoodDonation.aggregate([
      { $match: { ...query, claimedBy: { $ne: null } } },
      {
        $group: {
          _id: "$claimedBy",
          claimsCount: { $sum: 1 },
          quantityReceived: { $sum: "$fulfilledQuantity" }
        }
      },
      { $sort: { quantityReceived: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "ngoUser"
        }
      },
      { $unwind: "$ngoUser" },
      {
        $project: {
          _id: 1,
          claimsCount: 1,
          quantityReceived: 1,
          name: "$ngoUser.name",
          ngoName: "$ngoUser.ngoDetails.ngoName"
        }
      }
    ]);

    // 5. Monthly donations timeline
    const monthlyVolume = await FoodDonation.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          donationsCount: { $sum: 1 },
          quantityRescued: { $sum: "$fulfilledQuantity" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Total summary metrics
    const totalDonations = await FoodDonation.countDocuments(query);
    const completedDonations = await FoodDonation.countDocuments({ ...query, status: "COMPLETED" });
    const allFulfilled = await FoodDonation.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: "$fulfilledQuantity" } } }
    ]);
    const totalFoodRedistributed = allFulfilled[0]?.total || 0;

    res.status(200).json({
      success: true,
      report: {
        totalDonations,
        completedDonations,
        totalFoodRedistributed,
        statusDistribution: statusCounts,
        categoryDistribution: categoryCounts,
        topDonors,
        topNgos: claimedNgoAgg,
        monthlyVolume
      }
    });
  } catch (error) {
    next(error);
  }
};
