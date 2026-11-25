import FoodRequest from "../models/FoodRequest.js";
import FoodDonation from "../models/FoodDonation.js";
import { sendNotification } from "../services/notificationService.js";

/**
 * POST /api/requests
 * Submit a food claim request (Verified NGO only)
 * Atomic database update to prevent over-reservation
 */
export const createRequest = async (req, res, next) => {
  try {
    const { donationId, requestedQuantity } = req.body;

    if (!donationId || !requestedQuantity) {
      return res.status(400).json({
        success: false,
        message: "Please provide both donationId and requestedQuantity."
      });
    }

    const qty = Number(requestedQuantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: "Requested quantity must be a positive number greater than 0."
      });
    }

    // Double-check NGO verification status
    if (req.user.role !== "NGO" || req.user.ngoVerificationStatus !== "VERIFIED") {
      return res.status(403).json({
        success: false,
        message:
          "Access denied: Only active, verified NGOs can request surplus food donations."
      });
    }

    // Atomic conditional decrement:
    // Only decrements if status is AVAILABLE or PARTIALLY_RESERVED,
    // not expired, and availableQuantity >= requested quantity
    const updatedDonation = await FoodDonation.findOneAndUpdate(
      {
        _id: donationId,
        status: { $in: ["AVAILABLE", "PARTIALLY_RESERVED"] },
        expiryDateTime: { $gt: new Date() },
        availableQuantity: { $gte: qty }
      },
      {
        $inc: {
          availableQuantity: -qty,
          reservedQuantity: qty
        }
      },
      { returnDocument: "after" }
    );

    if (!updatedDonation) {
      // Diagnose reason for client feedback
      const existingListing = await FoodDonation.findById(donationId);
      if (!existingListing) {
        return res.status(404).json({
          success: false,
          message: "The requested food donation listing does not exist."
        });
      }
      if (new Date(existingListing.expiryDateTime) <= new Date()) {
        existingListing.status = "EXPIRED";
        await existingListing.save();
        return res.status(400).json({
          success: false,
          message: "This food donation listing has expired and can no longer accept requests."
        });
      }
      if (existingListing.availableQuantity < qty) {
        return res.status(409).json({
          success: false,
          message: `Insufficient surplus remaining. Only ${existingListing.availableQuantity} ${existingListing.quantityUnit} currently available.`
        });
      }
      return res.status(400).json({
        success: false,
        message: `Listing is not available for requests (current status: ${existingListing.status}).`
      });
    }

    // Refresh donation status atomically based on remaining available quantity
    await FoodDonation.updateOne(
      { _id: donationId, availableQuantity: 0 },
      { $set: { status: "FULLY_RESERVED" } }
    );
    await FoodDonation.updateOne(
      { _id: donationId, availableQuantity: { $gt: 0 } },
      { $set: { status: "PARTIALLY_RESERVED" } }
    );

    // Create the food request
    const foodRequest = new FoodRequest({
      ngo: req.user._id,
      donor: updatedDonation.donor,
      donation: updatedDonation._id,
      requestedQuantity: qty,
      status: "PENDING"
    });

    await foodRequest.save();

    // Notify Donor
    await sendNotification({
      recipient: updatedDonation.donor,
      sender: req.user._id,
      title: "New Surplus Food Request",
      message: `${req.user.ngoDetails?.ngoName || req.user.name} requested ${qty} ${updatedDonation.quantityUnit} of '${updatedDonation.title}'.`,
      type: "REQUEST_RECEIVED",
      link: "/donor/requests"
    });

    res.status(201).json({
      success: true,
      message: "Food request submitted successfully. Awaiting donor approval.",
      request: foodRequest,
      remainingAvailable: updatedDonation.availableQuantity
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/requests/my
 * Get all requests submitted by the authenticated NGO
 */
export const getMyRequests = async (req, res, next) => {
  try {
    const requests = await FoodRequest.find({ ngo: req.user._id })
      .populate("donation")
      .populate("donor", "name email phone donorDetails")
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
 * GET /api/requests/incoming
 * Get all requests received by the authenticated donor
 */
export const getIncomingRequests = async (req, res, next) => {
  try {
    const requests = await FoodRequest.find({ donor: req.user._id })
      .populate("donation")
      .populate("ngo", "name email phone ngoDetails ngoVerificationStatus")
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
 * GET /api/requests/:id
 * Get single request details
 */
export const getRequestById = async (req, res, next) => {
  try {
    const request = await FoodRequest.findById(req.params.id)
      .populate("donation")
      .populate("donor", "name email phone donorDetails")
      .populate("ngo", "name email phone ngoDetails");

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Food request not found."
      });
    }

    const userId = req.user._id.toString();
    const isDonor = request.donor._id.toString() === userId;
    const isNgo = request.ngo._id.toString() === userId;
    const isAdmin = req.user.role === "ADMIN";

    if (!isDonor && !isNgo && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied: You are not authorized to view this request."
      });
    }

    res.status(200).json({
      success: true,
      request
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/requests/:id/approve
 * Donor approves a pending request
 */
export const approveRequest = async (req, res, next) => {
  try {
    const { donorResponse, pickupScheduledTime, pickupNotes } = req.body;

    const request = await FoodRequest.findOneAndUpdate(
      {
        _id: req.params.id,
        donor: req.user._id,
        status: "PENDING"
      },
      {
        $set: {
          status: "APPROVED",
          ...(donorResponse && { donorResponse: donorResponse.trim() }),
          ...(pickupNotes && { pickupNotes: pickupNotes.trim() }),
          ...(pickupScheduledTime && { pickupScheduledTime: new Date(pickupScheduledTime) })
        }
      },
      { returnDocument: "after" }
    ).populate("donation");

    if (!request) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot approve request: It either does not exist, is not for your listing, or is not in PENDING status."
      });
    }

    // Notify NGO
    await sendNotification({
      recipient: request.ngo,
      sender: req.user._id,
      title: "Food Request Approved!",
      message: `Your request for ${request.requestedQuantity} ${request.donation.quantityUnit} of '${request.donation.title}' was approved.`,
      type: "REQUEST_APPROVED",
      link: "/ngo/requests"
    });

    res.status(200).json({
      success: true,
      message: "Request approved successfully.",
      request
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/requests/:id/reject
 * Donor rejects a request -> Atomic quantity release back to available surplus
 */
export const rejectRequest = async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;

    // Atomic conditional state transition:
    // Only transitions if status is currently PENDING or APPROVED
    const request = await FoodRequest.findOneAndUpdate(
      {
        _id: req.params.id,
        donor: req.user._id,
        status: { $in: ["PENDING", "APPROVED"] }
      },
      {
        $set: {
          status: "REJECTED",
          rejectionReason: rejectionReason ? rejectionReason.trim() : ""
        }
      },
      { returnDocument: "after" }
    ).populate("donation");

    if (!request) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot reject request: It either does not exist, is not for your listing, or has already been resolved/cancelled."
      });
    }

    // Release reserved quantity back to available quantity atomically
    const updatedDonation = await FoodDonation.findByIdAndUpdate(
      request.donation._id,
      {
        $inc: {
          availableQuantity: request.requestedQuantity,
          reservedQuantity: -request.requestedQuantity
        }
      },
      { returnDocument: "after" }
    );

    if (updatedDonation) {
      await FoodDonation.updateOne(
        { _id: updatedDonation._id, $expr: { $gte: ["$availableQuantity", "$totalQuantity"] } },
        { $set: { status: "AVAILABLE" } }
      );
      await FoodDonation.updateOne(
        { _id: updatedDonation._id, $expr: { $lt: ["$availableQuantity", "$totalQuantity"] } },
        { $set: { status: "PARTIALLY_RESERVED" } }
      );
    }

    // Notify NGO
    await sendNotification({
      recipient: request.ngo,
      sender: req.user._id,
      title: "Food Request Update",
      message: `Your request for '${request.donation.title}' was not accepted.${rejectionReason ? ` Reason: ${rejectionReason}` : ""}`,
      type: "REQUEST_REJECTED",
      link: "/ngo/requests"
    });

    res.status(200).json({
      success: true,
      message: "Request rejected and reserved quantity restored to available surplus.",
      request
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/requests/:id/cancel
 * NGO cancels their own pending/approved request -> Atomic quantity release
 */
export const cancelRequest = async (req, res, next) => {
  try {
    // Atomic conditional state transition:
    // Only transitions if status is currently PENDING or APPROVED
    const request = await FoodRequest.findOneAndUpdate(
      {
        _id: req.params.id,
        ngo: req.user._id,
        status: { $in: ["PENDING", "APPROVED"] }
      },
      {
        $set: { status: "CANCELLED" }
      },
      { returnDocument: "after" }
    ).populate("donation");

    if (!request) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot cancel request: It either does not exist, belongs to another NGO, or has already been resolved."
      });
    }

    // Release reserved quantity back to available quantity atomically
    const updatedDonation = await FoodDonation.findByIdAndUpdate(
      request.donation._id,
      {
        $inc: {
          availableQuantity: request.requestedQuantity,
          reservedQuantity: -request.requestedQuantity
        }
      },
      { returnDocument: "after" }
    );

    if (updatedDonation) {
      await FoodDonation.updateOne(
        { _id: updatedDonation._id, $expr: { $gte: ["$availableQuantity", "$totalQuantity"] } },
        { $set: { status: "AVAILABLE" } }
      );
      await FoodDonation.updateOne(
        { _id: updatedDonation._id, $expr: { $lt: ["$availableQuantity", "$totalQuantity"] } },
        { $set: { status: "PARTIALLY_RESERVED" } }
      );
    }

    // Notify Donor
    await sendNotification({
      recipient: request.donor,
      sender: req.user._id,
      title: "Food Request Cancelled",
      message: `${req.user.ngoDetails?.ngoName || req.user.name} cancelled their request for '${request.donation.title}'.`,
      type: "REQUEST_CANCELLED",
      link: "/donor/requests"
    });

    res.status(200).json({
      success: true,
      message: "Request cancelled and reserved quantity restored to available surplus.",
      request
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/requests/:id/schedule-pickup
 * Coordinate pickup details (Donor or NGO)
 */
export const schedulePickup = async (req, res, next) => {
  try {
    const { pickupScheduledTime, pickupNotes } = req.body;

    const request = await FoodRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Food request not found."
      });
    }

    const userId = req.user._id.toString();
    const isDonor = request.donor.toString() === userId;
    const isNgo = request.ngo.toString() === userId;

    if (!isDonor && !isNgo) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Only the donor or requesting NGO can update pickup details."
      });
    }

    if (!["APPROVED", "READY_FOR_PICKUP"].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: `Pickup scheduling requires an APPROVED request. Current status: '${request.status}'.`
      });
    }

    if (pickupScheduledTime) request.pickupScheduledTime = new Date(pickupScheduledTime);
    if (pickupNotes !== undefined) request.pickupNotes = pickupNotes.trim();

    await request.save();

    // Notify counterpart
    const counterpartId = isDonor ? request.ngo : request.donor;
    await sendNotification({
      recipient: counterpartId,
      sender: req.user._id,
      title: "Pickup Details Updated",
      message: `Pickup details updated for request #${request._id.toString().slice(-6)}.`,
      type: "SYSTEM",
      link: isDonor ? "/donor/requests" : "/ngo/requests"
    });

    res.status(200).json({
      success: true,
      message: "Pickup coordination details saved successfully.",
      request
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/requests/:id/ready-for-pickup
 * Donor marks food as ready for pickup
 */
export const markReadyForPickup = async (req, res, next) => {
  try {
    const request = await FoodRequest.findOneAndUpdate(
      {
        _id: req.params.id,
        donor: req.user._id,
        status: "APPROVED"
      },
      {
        $set: { status: "READY_FOR_PICKUP" }
      },
      { returnDocument: "after" }
    ).populate("donation");

    if (!request) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot mark ready for pickup: Request is unauthorized, not found, or not in APPROVED status."
      });
    }

    // Notify NGO
    await sendNotification({
      recipient: request.ngo,
      sender: req.user._id,
      title: "Food Ready for Pickup!",
      message: `Your food donation '${request.donation.title}' is packed and ready for collection at ${request.donation.pickupLocation}.`,
      type: "READY_FOR_PICKUP",
      link: "/ngo/requests"
    });

    res.status(200).json({
      success: true,
      message: "Food marked as ready for pickup.",
      request
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/requests/:id/confirm-handover
 * Donor confirms food has been handed over to NGO
 * Triggers COMPLETED status if NGO has also confirmed collection
 */
export const confirmHandover = async (req, res, next) => {
  try {
    // Atomic confirmation: only succeeds if handoverConfirmedByDonor is false
    const request = await FoodRequest.findOneAndUpdate(
      {
        _id: req.params.id,
        donor: req.user._id,
        status: { $in: ["APPROVED", "READY_FOR_PICKUP"] },
        handoverConfirmedByDonor: false
      },
      {
        $set: {
          handoverConfirmedByDonor: true,
          handoverConfirmedByDonorAt: new Date()
        }
      },
      { returnDocument: "after" }
    ).populate("donation");

    if (!request) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot confirm handover: Request is unauthorized, not in pickup state, or handover has already been confirmed."
      });
    }

    // If both confirmed, atomically complete the transaction
    let isCompleted = false;
    if (request.collectionConfirmedByNgo) {
      const completedRequest = await FoodRequest.findOneAndUpdate(
        {
          _id: request._id,
          status: { $ne: "COMPLETED" },
          handoverConfirmedByDonor: true,
          collectionConfirmedByNgo: true
        },
        {
          $set: {
            status: "COMPLETED",
            completedAt: new Date()
          }
        },
        { returnDocument: "after" }
      );

      if (completedRequest) {
        isCompleted = true;
        request.status = "COMPLETED";
        request.completedAt = completedRequest.completedAt;

        // Shift reserved quantity to fulfilled quantity atomically
        const updatedDonation = await FoodDonation.findByIdAndUpdate(
          request.donation._id,
          {
            $inc: {
              reservedQuantity: -request.requestedQuantity,
              fulfilledQuantity: request.requestedQuantity
            }
          },
          { returnDocument: "after" }
        );

        if (updatedDonation) {
          const newStatus =
            updatedDonation.fulfilledQuantity >= updatedDonation.totalQuantity
              ? "COMPLETED"
              : updatedDonation.availableQuantity === 0
              ? "FULLY_RESERVED"
              : "PARTIALLY_RESERVED";
          await FoodDonation.updateOne(
            { _id: updatedDonation._id },
            { $set: { status: newStatus } }
          );
        }
      }
    }

    // Notify NGO
    await sendNotification({
      recipient: request.ngo,
      sender: req.user._id,
      title: "Handover Confirmed by Donor",
      message: `Donor confirmed handover of ${request.requestedQuantity} ${request.donation.quantityUnit}.${isCompleted ? " Transaction is now COMPLETED." : " Please confirm collection to finalize."}`,
      type: "HANDOVER_CONFIRMED",
      link: "/ngo/requests"
    });

    res.status(200).json({
      success: true,
      message: isCompleted
        ? "Both confirmations received. Donation request is officially COMPLETED!"
        : "Handover confirmed. Waiting for NGO collection confirmation.",
      request
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/requests/:id/confirm-collection
 * NGO confirms food was collected from Donor
 * Triggers COMPLETED status if Donor has also confirmed handover
 */
export const confirmCollection = async (req, res, next) => {
  try {
    // Atomic confirmation: only succeeds if collectionConfirmedByNgo is false
    const request = await FoodRequest.findOneAndUpdate(
      {
        _id: req.params.id,
        ngo: req.user._id,
        status: { $in: ["APPROVED", "READY_FOR_PICKUP"] },
        collectionConfirmedByNgo: false
      },
      {
        $set: {
          collectionConfirmedByNgo: true,
          collectionConfirmedByNgoAt: new Date()
        }
      },
      { returnDocument: "after" }
    ).populate("donation");

    if (!request) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot confirm collection: Request is unauthorized, not in pickup state, or collection has already been confirmed."
      });
    }

    // If both confirmed, atomically complete the transaction
    let isCompleted = false;
    if (request.handoverConfirmedByDonor) {
      const completedRequest = await FoodRequest.findOneAndUpdate(
        {
          _id: request._id,
          status: { $ne: "COMPLETED" },
          handoverConfirmedByDonor: true,
          collectionConfirmedByNgo: true
        },
        {
          $set: {
            status: "COMPLETED",
            completedAt: new Date()
          }
        },
        { returnDocument: "after" }
      );

      if (completedRequest) {
        isCompleted = true;
        request.status = "COMPLETED";
        request.completedAt = completedRequest.completedAt;

        // Shift reserved quantity to fulfilled quantity atomically
        const updatedDonation = await FoodDonation.findByIdAndUpdate(
          request.donation._id,
          {
            $inc: {
              reservedQuantity: -request.requestedQuantity,
              fulfilledQuantity: request.requestedQuantity
            }
          },
          { returnDocument: "after" }
        );

        if (updatedDonation) {
          const newStatus =
            updatedDonation.fulfilledQuantity >= updatedDonation.totalQuantity
              ? "COMPLETED"
              : updatedDonation.availableQuantity === 0
              ? "FULLY_RESERVED"
              : "PARTIALLY_RESERVED";
          await FoodDonation.updateOne(
            { _id: updatedDonation._id },
            { $set: { status: newStatus } }
          );
        }
      }
    }

    // Notify Donor
    await sendNotification({
      recipient: request.donor,
      sender: req.user._id,
      title: "Collection Confirmed by NGO",
      message: `${req.user.ngoDetails?.ngoName || req.user.name} confirmed collection of ${request.requestedQuantity} ${request.donation.quantityUnit}.${isCompleted ? " Transaction is now COMPLETED." : " Please confirm handover to finalize."}`,
      type: "COLLECTION_CONFIRMED",
      link: "/donor/requests"
    });

    res.status(200).json({
      success: true,
      message: isCompleted
        ? "Both confirmations received. Donation request is officially COMPLETED!"
        : "Collection confirmed. Waiting for donor handover confirmation.",
      request
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/requests/ngo/stats
 * Statistics summary for authenticated NGO dashboard
 */
export const getNgoStats = async (req, res, next) => {
  try {
    const ngoId = req.user._id;

    const [requests, directClaims, availableDonationsCount] = await Promise.all([
      FoodRequest.find({ ngo: ngoId }),
      FoodDonation.find({ claimedBy: ngoId }),
      FoodDonation.countDocuments({
        status: { $in: ["AVAILABLE", "PARTIALLY_RESERVED"] },
        expiryDateTime: { $gt: new Date() }
      })
    ]);

    const totalRequests = requests.length;
    const pendingRequests = requests.filter((r) => r.status === "PENDING").length;
    const approvedRequests = requests.filter((r) =>
      ["APPROVED", "READY_FOR_PICKUP"].includes(r.status)
    ).length;
    const completedRequests = requests.filter((r) => r.status === "COMPLETED").length;

    // Direct claims breakdown
    const directClaimsTotal = directClaims.length;
    const directClaimsPendingPickup = directClaims.filter((d) =>
      ["CLAIMED", "PICKED_UP"].includes(d.status)
    ).length;
    const directClaimsCompleted = directClaims.filter((d) => d.status === "COMPLETED").length;

    let totalQuantityCollected = 0;
    requests
      .filter((r) => r.status === "COMPLETED")
      .forEach((r) => {
        totalQuantityCollected += r.requestedQuantity || 0;
      });
    directClaims
      .filter((d) => d.status === "COMPLETED")
      .forEach((d) => {
        totalQuantityCollected += d.fulfilledQuantity || d.totalQuantity || 0;
      });

    res.status(200).json({
      success: true,
      stats: {
        totalRequests,
        pendingRequests,
        approvedRequests,
        completedRequests,
        totalQuantityCollected,
        // Phase 3 comprehensive fields:
        availableFoodDonations: availableDonationsCount,
        totalDonationsClaimed: totalRequests + directClaimsTotal,
        pendingPickups: approvedRequests + directClaimsPendingPickup,
        completedPickups: completedRequests + directClaimsCompleted,
        totalFoodReceived: totalQuantityCollected
      }
    });
  } catch (error) {
    next(error);
  }
};
