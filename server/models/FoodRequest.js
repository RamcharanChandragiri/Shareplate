import mongoose from "mongoose";

const foodRequestSchema = new mongoose.Schema(
  {
    ngo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "NGO reference is required"],
      index: true
    },
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Donor reference is required"],
      index: true
    },
    donation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FoodDonation",
      required: [true, "Food donation reference is required"],
      index: true
    },
    requestedQuantity: {
      type: Number,
      required: [true, "Requested quantity is required"],
      min: [1, "Requested quantity must be at least 1"]
    },
    status: {
      type: String,
      enum: [
        "PENDING",
        "APPROVED",
        "REJECTED",
        "CANCELLED",
        "READY_FOR_PICKUP",
        "COMPLETED"
      ],
      default: "PENDING",
      index: true
    },
    donorResponse: {
      type: String,
      default: "",
      trim: true
    },
    rejectionReason: {
      type: String,
      default: "",
      trim: true
    },
    pickupScheduledTime: {
      type: Date
    },
    pickupNotes: {
      type: String,
      default: "",
      trim: true
    },
    handoverConfirmedByDonor: {
      type: Boolean,
      default: false
    },
    handoverConfirmedByDonorAt: {
      type: Date
    },
    collectionConfirmedByNgo: {
      type: Boolean,
      default: false
    },
    collectionConfirmedByNgoAt: {
      type: Date
    },
    completedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

const FoodRequest = mongoose.model("FoodRequest", foodRequestSchema);

export default FoodRequest;
