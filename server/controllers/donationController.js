import FoodDonation from "../models/FoodDonation.js";
import FoodRequest from "../models/FoodRequest.js";
import { sendNotification } from "../services/notificationService.js";

/**
 * POST /api/donations
 * Create a new food donation listing (Donor only)
 */
export const createDonation = async (req, res, next) => {
  try {
    const {
      title,
      category,
      description,
      totalQuantity,
      quantityUnit,
      preparationDateTime,
      expiryDateTime,
      pickupLocation,
      pickupWindow,
      imageUrl,
      specialInstructions
    } = req.body;

    if (
      !title ||
      !category ||
      !description ||
      !totalQuantity ||
      !quantityUnit ||
      !preparationDateTime ||
      !expiryDateTime ||
      !pickupLocation ||
      !pickupWindow
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide all required fields: title, category, description, quantity, unit, prep time, expiry deadline, pickup location, and pickup window."
      });
    }

    const qty = Number(totalQuantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: "Total quantity must be a positive number greater than zero."
      });
    }

    const expiry = new Date(expiryDateTime);
    if (expiry <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Expiry deadline must be set to a future date and time."
      });
    }

    const donation = new FoodDonation({
      donor: req.user._id,
      title: title.trim(),
      category,
      description: description.trim(),
      totalQuantity: qty,
      availableQuantity: qty,
      reservedQuantity: 0,
      fulfilledQuantity: 0,
      quantityUnit: quantityUnit.trim(),
      preparationDateTime: new Date(preparationDateTime),
      expiryDateTime: expiry,
      pickupLocation: pickupLocation.trim(),
      pickupWindow: pickupWindow.trim(),
      imageUrl: (imageUrl || "").trim(),
      specialInstructions: (specialInstructions || "").trim(),
      status: "AVAILABLE"
    });

    await donation.save();

    res.status(201).json({
      success: true,
      message: "Food donation published successfully.",
      donation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/donations
 * Browse active food donations (Accessible to Verified NGOs, Donors, Admins)
 */
export const getDonations = async (req, res, next) => {
  try {
    const { category, search, status, donor, sortBy, page = 1, limit = 12 } = req.query;

    // Automatically expire any active donations past expiry deadline
    await FoodDonation.updateMany(
      {
        status: { $in: ["AVAILABLE", "PARTIALLY_RESERVED"] },
        expiryDateTime: { $lte: new Date() }
      },
      { $set: { status: "EXPIRED" } }
    );

    const query = {};

    // Donors/Admins can see specific statuses; default for browse is active
    if (status) {
      query.status = status.toUpperCase();
    } else if (req.user.role === "NGO") {
      query.status = { $in: ["AVAILABLE", "PARTIALLY_RESERVED"] };
      query.expiryDateTime = { $gt: new Date() };
    }

    if (category) {
      query.category = category.toUpperCase();
    }

    if (donor) {
      query.donor = donor;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { pickupLocation: { $regex: search, $options: "i" } }
      ];
    }

    const sortOption = sortBy === "expiry" ? { expiryDateTime: 1 } : { createdAt: -1 };
    const skip = (Number(page) - 1) * Number(limit);

    const [donations, total] = await Promise.all([
      FoodDonation.find(query)
        .populate("donor", "name email phone donorDetails")
        .populate("claimedBy", "name email phone ngoDetails")
        .sort(sortOption)
        .skip(skip)
        .limit(Number(limit)),
      FoodDonation.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: donations.length,
      total,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      donations
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/donations/my
 * Get all donations created by the authenticated donor
 */
export const getMyDonations = async (req, res, next) => {
  try {
    const donations = await FoodDonation.find({ donor: req.user._id })
      .populate("claimedBy", "name email phone ngoDetails")
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
 * GET /api/donations/:id
 * Get single donation details by ID
 */
export const getDonationById = async (req, res, next) => {
  try {
    const donation = await FoodDonation.findById(req.params.id)
      .populate("donor", "name email phone donorDetails")
      .populate("claimedBy", "name email phone ngoDetails");

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Food donation listing not found."
      });
    }

    // Refresh expiry status if passed
    if (
      ["AVAILABLE", "PARTIALLY_RESERVED"].includes(donation.status) &&
      new Date(donation.expiryDateTime) <= new Date()
    ) {
      donation.status = "EXPIRED";
      await donation.save();
    }

    res.status(200).json({
      success: true,
      donation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/donations/:id
 * Update an existing food donation listing (Donor only, must be owner)
 */
export const updateDonation = async (req, res, next) => {
  try {
    const donation = await FoodDonation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Food donation listing not found."
      });
    }

    if (donation.donor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied: You can only edit your own food listings."
      });
    }

    if (["COMPLETED", "CANCELLED", "EXPIRED"].includes(donation.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot edit a donation with status '${donation.status}'.`
      });
    }

    const {
      title,
      category,
      description,
      totalQuantity,
      quantityUnit,
      preparationDateTime,
      expiryDateTime,
      pickupLocation,
      pickupWindow,
      imageUrl,
      specialInstructions
    } = req.body;

    if (title) donation.title = title.trim();
    if (category) donation.category = category;
    if (description) donation.description = description.trim();
    if (quantityUnit) donation.quantityUnit = quantityUnit.trim();
    if (preparationDateTime) donation.preparationDateTime = new Date(preparationDateTime);
    if (expiryDateTime) {
      const exp = new Date(expiryDateTime);
      if (exp <= new Date()) {
        return res.status(400).json({
          success: false,
          message: "Expiry deadline must be in the future."
        });
      }
      donation.expiryDateTime = exp;
    }
    if (pickupLocation) donation.pickupLocation = pickupLocation.trim();
    if (pickupWindow) donation.pickupWindow = pickupWindow.trim();
    if (imageUrl !== undefined) donation.imageUrl = imageUrl.trim();
    if (specialInstructions !== undefined)
      donation.specialInstructions = specialInstructions.trim();

    if (totalQuantity !== undefined) {
      const newTotal = Number(totalQuantity);
      if (newTotal < donation.reservedQuantity + donation.fulfilledQuantity) {
        return res.status(400).json({
          success: false,
          message: `Total quantity cannot be set below already reserved (${donation.reservedQuantity}) + fulfilled (${donation.fulfilledQuantity}) quantity.`
        });
      }
      donation.totalQuantity = newTotal;
      donation.availableQuantity =
        newTotal - donation.reservedQuantity - donation.fulfilledQuantity;
    }

    donation.updateStatusBasedOnState();
    await donation.save();

    res.status(200).json({
      success: true,
      message: "Donation updated successfully.",
      donation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/donations/:id/cancel
 * Cancel a donation listing (Donor only)
 */
export const cancelDonation = async (req, res, next) => {
  try {
    const donation = await FoodDonation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Food donation listing not found."
      });
    }

    if (donation.donor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied: You can only cancel your own food listings."
      });
    }

    if (["COMPLETED", "CLAIMED", "PICKED_UP"].includes(donation.status) || donation.claimedBy) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a donation that is already ${donation.status}.`
      });
    }

    // Check if there are active requests
    const activeRequests = await FoodRequest.countDocuments({
      donation: donation._id,
      status: { $in: ["PENDING", "APPROVED", "READY_FOR_PICKUP"] }
    });

    if (activeRequests > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel: There are ${activeRequests} active NGO requests associated with this listing. Please resolve them first.`
      });
    }

    // Atomically cancel only if still no active reserved claims, unclaimed, and not completed/cancelled
    const cancelledDonation = await FoodDonation.findOneAndUpdate(
      {
        _id: req.params.id,
        donor: req.user._id,
        status: { $nin: ["COMPLETED", "CANCELLED", "CLAIMED", "PICKED_UP"] },
        claimedBy: null,
        reservedQuantity: 0
      },
      {
        $set: { status: "CANCELLED", availableQuantity: 0 }
      },
      { returnDocument: "after" }
    );

    if (!cancelledDonation) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot cancel donation: It may already be completed/cancelled or has active reserved claims."
      });
    }

    res.status(200).json({
      success: true,
      message: "Food donation listing cancelled successfully.",
      donation: cancelledDonation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/donations/donor/stats
 * Statistics summary for authenticated donor dashboard
 */
export const getDonorStats = async (req, res, next) => {
  try {
    const donorId = req.user._id;

    const [donations, requests] = await Promise.all([
      FoodDonation.find({ donor: donorId }),
      FoodRequest.find({ donor: donorId })
    ]);

    const totalDonations = donations.length;
    const activeListings = donations.filter((d) =>
      ["AVAILABLE", "PARTIALLY_RESERVED"].includes(d.status)
    ).length;
    const claimedDonations = donations.filter((d) =>
      ["CLAIMED", "PICKED_UP"].includes(d.status)
    ).length;
    const completedDonations = donations.filter((d) => d.status === "COMPLETED").length;
    const cancelledOrExpiredDonations = donations.filter((d) =>
      ["CANCELLED", "EXPIRED"].includes(d.status)
    ).length;

    let totalQuantityRescued = 0;
    donations.forEach((d) => {
      totalQuantityRescued += d.fulfilledQuantity || 0;
    });

    const pendingRequests = requests.filter((r) => r.status === "PENDING").length;
    const approvedRequests = requests.filter((r) =>
      ["APPROVED", "READY_FOR_PICKUP"].includes(r.status)
    ).length;

    res.status(200).json({
      success: true,
      stats: {
        totalDonations,
        activeListings,
        claimedDonations,
        completedDonations,
        cancelledOrExpiredDonations,
        totalQuantityRescued,
        pendingRequests,
        approvedRequests
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/donations/:id/claim
 * Verified NGO directly claims an available donation
 */
export const claimDonation = async (req, res, next) => {
  try {
    if (req.user.role !== "NGO") {
      return res.status(403).json({
        success: false,
        message: "Access denied: Only NGOs can claim food donations."
      });
    }

    if (req.user.ngoVerificationStatus !== "VERIFIED") {
      return res.status(403).json({
        success: false,
        message: "Access denied: Only verified NGOs can claim surplus food."
      });
    }

    const donationId = req.params.id;

    // Atomic conditional claim: status must be AVAILABLE and not expired and unclaimed
    const claimedDonation = await FoodDonation.findOneAndUpdate(
      {
        _id: donationId,
        status: "AVAILABLE",
        expiryDateTime: { $gt: new Date() },
        claimedBy: null
      },
      {
        $set: {
          status: "CLAIMED",
          claimedBy: req.user._id,
          claimedAt: new Date(),
          availableQuantity: 0,
          reservedQuantity: 0
        }
      },
      { returnDocument: "after" }
    )
      .populate("donor", "name email phone donorDetails")
      .populate("claimedBy", "name email phone ngoDetails");

    if (!claimedDonation) {
      const existing = await FoodDonation.findById(donationId);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Food donation listing not found."
        });
      }
      if (new Date(existing.expiryDateTime) <= new Date()) {
        existing.status = "EXPIRED";
        await existing.save();
        return res.status(400).json({
          success: false,
          message: "This food donation listing has expired and cannot be claimed."
        });
      }
      if (existing.status === "CLAIMED" || existing.claimedBy) {
        return res.status(409).json({
          success: false,
          message: "This food donation has already been claimed by another NGO."
        });
      }
      return res.status(400).json({
        success: false,
        message: `This donation is not available for claiming (status: ${existing.status}).`
      });
    }

    // Notify Donor
    await sendNotification({
      recipient: claimedDonation.donor._id,
      sender: req.user._id,
      title: "Donation Claimed!",
      message: `${req.user.ngoDetails?.ngoName || req.user.name} has claimed your surplus food listing '${claimedDonation.title}'.`,
      type: "REQUEST_RECEIVED",
      link: "/donor/my-donations"
    });

    res.status(200).json({
      success: true,
      message: "Food donation claimed successfully!",
      donation: claimedDonation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/donations/:id/pickup
 * Mark donation as picked up (Donor or claiming NGO)
 */
export const markDonationPickedUp = async (req, res, next) => {
  try {
    const donation = await FoodDonation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Food donation listing not found."
      });
    }

    const userId = req.user._id.toString();
    const isDonor = donation.donor.toString() === userId;
    const isClaimedNgo = donation.claimedBy?.toString() === userId;
    const isAdmin = req.user.role === "ADMIN";

    if (!isDonor && !isClaimedNgo && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied: You are not authorized to update pickup status for this donation."
      });
    }

    if (donation.status !== "CLAIMED") {
      return res.status(400).json({
        success: false,
        message: `Pickup status requires donation to be in CLAIMED status. Current status: '${donation.status}'.`
      });
    }

    donation.status = "PICKED_UP";
    donation.pickedUpAt = new Date();
    await donation.save();

    // Notify counterpart
    const counterpartId = isDonor ? donation.claimedBy : donation.donor;
    if (counterpartId) {
      await sendNotification({
        recipient: counterpartId,
        sender: req.user._id,
        title: "Food Donation Picked Up!",
        message: `Surplus food donation '${donation.title}' has been collected and marked as picked up.`,
        type: "READY_FOR_PICKUP",
        link: `/donations/${donation._id}`
      });
    }

    res.status(200).json({
      success: true,
      message: "Donation marked as picked up.",
      donation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/donations/:id/schedule-pickup
 * Coordinate pickup details and notes (Donor or Claimed NGO)
 */
export const scheduleDonationPickup = async (req, res, next) => {
  try {
    const { pickupScheduledTime, pickupNotes, pickupWindow } = req.body;

    const donation = await FoodDonation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Food donation listing not found."
      });
    }

    const userId = req.user._id.toString();
    const isDonor = donation.donor.toString() === userId;
    const isClaimedNgo = donation.claimedBy?.toString() === userId;
    const isAdmin = req.user.role === "ADMIN";

    if (!isDonor && !isClaimedNgo && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Only the donor or claimed NGO can coordinate pickup."
      });
    }

    if (!["CLAIMED", "PICKED_UP", "AVAILABLE"].includes(donation.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot update pickup for listing in '${donation.status}' status.`
      });
    }

    if (pickupScheduledTime) donation.pickupScheduledTime = new Date(pickupScheduledTime);
    if (pickupNotes !== undefined) donation.pickupNotes = pickupNotes.trim();
    if (pickupWindow !== undefined) donation.pickupWindow = pickupWindow.trim();

    await donation.save();

    // Notify counterpart if claimed
    const counterpartId = isDonor ? donation.claimedBy : donation.donor;
    if (counterpartId) {
      await sendNotification({
        recipient: counterpartId,
        sender: req.user._id,
        title: "Pickup Logistics Updated",
        message: `Pickup details updated for '${donation.title}'.`,
        type: "SYSTEM",
        link: `/donations/${donation._id}`
      });
    }

    res.status(200).json({
      success: true,
      message: "Pickup logistics saved successfully.",
      donation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/donations/:id/complete
 * Mark donation as completed (Donor or claiming NGO)
 */
export const markDonationCompleted = async (req, res, next) => {
  try {
    const donation = await FoodDonation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Food donation listing not found."
      });
    }

    const userId = req.user._id.toString();
    const isDonor = donation.donor.toString() === userId;
    const isClaimedNgo = donation.claimedBy?.toString() === userId;
    const isAdmin = req.user.role === "ADMIN";

    if (!isDonor && !isClaimedNgo && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied: You are not authorized to complete this donation."
      });
    }

    if (!["CLAIMED", "PICKED_UP"].includes(donation.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot complete donation in '${donation.status}' status.`
      });
    }

    donation.status = "COMPLETED";
    donation.completedAt = new Date();
    donation.fulfilledQuantity = donation.totalQuantity;
    await donation.save();

    // Notify counterpart
    const counterpartId = isDonor ? donation.claimedBy : donation.donor;
    if (counterpartId) {
      await sendNotification({
        recipient: counterpartId,
        sender: req.user._id,
        title: "Donation Completed & Confirmed!",
        message: `Surplus food donation '${donation.title}' is officially COMPLETED. Thank you for rescuing surplus food!`,
        type: "HANDOVER_CONFIRMED",
        link: `/donations/${donation._id}`
      });
    }

    res.status(200).json({
      success: true,
      message: "Donation marked as completed successfully.",
      donation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/donations/upload-image
 * Validate and process food image upload
 */
export const uploadDonationImage = async (req, res, next) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({
        success: false,
        message: "No image payload provided."
      });
    }

    const isDataUri = typeof image === "string" && image.startsWith("data:image/");
    const isHttpUrl = typeof image === "string" && /^https?:\/\//i.test(image);

    if (!isDataUri && !isHttpUrl) {
      return res.status(400).json({
        success: false,
        message: "Invalid image format. Must be a valid image Data URL (PNG, JPEG, WebP) or HTTPS image URL."
      });
    }

    if (isDataUri && image.length > 8 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: "Image payload exceeds maximum allowed size of 8MB."
      });
    }

    res.status(200).json({
      success: true,
      message: "Image processed successfully.",
      imageUrl: image
    });
  } catch (error) {
    next(error);
  }
};
