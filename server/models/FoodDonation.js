import mongoose from "mongoose";

const foodDonationSchema = new mongoose.Schema(
  {
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Donor reference is required"],
      index: true
    },
    title: {
      type: String,
      required: [true, "Food name/title is required"],
      trim: true,
      maxlength: [150, "Title cannot exceed 150 characters"]
    },
    category: {
      type: String,
      required: [true, "Food category is required"],
      enum: {
        values: [
          "COOKED_MEALS",
          "BAKED_GOODS",
          "RAW_INGREDIENTS",
          "PACKAGED_FOOD",
          "FRUITS_VEGETABLES",
          "DAIRY",
          "BEVERAGES",
          "OTHER"
        ],
        message: "{VALUE} is not a valid food category"
      },
      index: true
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"]
    },
    totalQuantity: {
      type: Number,
      required: [true, "Total available quantity is required"],
      min: [1, "Quantity must be at least 1"]
    },
    availableQuantity: {
      type: Number,
      required: [true, "Available quantity is required"],
      min: [0, "Available quantity cannot be negative"]
    },
    reservedQuantity: {
      type: Number,
      default: 0,
      min: [0, "Reserved quantity cannot be negative"]
    },
    fulfilledQuantity: {
      type: Number,
      default: 0,
      min: [0, "Fulfilled quantity cannot be negative"]
    },
    quantityUnit: {
      type: String,
      required: [true, "Quantity unit is required (e.g. kg, meals, packets)"],
      trim: true,
      maxlength: [30, "Unit cannot exceed 30 characters"]
    },
    preparationDateTime: {
      type: Date,
      required: [true, "Preparation date and time is required"]
    },
    expiryDateTime: {
      type: Date,
      required: [true, "Expiry deadline is required"],
      index: true
    },
    pickupLocation: {
      type: String,
      required: [true, "Pickup location address is required"],
      trim: true
    },
    pickupWindow: {
      type: String,
      required: [true, "Available pickup time window is required"],
      trim: true
    },
    imageUrl: {
      type: String,
      default: "",
      trim: true
    },
    specialInstructions: {
      type: String,
      default: "",
      trim: true
    },
    claimedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },
    claimedAt: {
      type: Date,
      default: null
    },
    pickedUpAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    pickupScheduledTime: {
      type: Date,
      default: null
    },
    pickupNotes: {
      type: String,
      default: "",
      trim: true
    },
    status: {
      type: String,
      enum: [
        "AVAILABLE",
        "CLAIMED",
        "PICKED_UP",
        "COMPLETED",
        "CANCELLED",
        "EXPIRED",
        "PARTIALLY_RESERVED",
        "FULLY_RESERVED"
      ],
      default: "AVAILABLE",
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Method to refresh status based on quantities and expiry time
foodDonationSchema.methods.updateStatusBasedOnState = function () {
  if (
    this.status === "CANCELLED" ||
    this.status === "COMPLETED" ||
    this.status === "CLAIMED" ||
    this.status === "PICKED_UP"
  ) {
    return;
  }

  const now = new Date();
  if (new Date(this.expiryDateTime) <= now) {
    this.status = "EXPIRED";
    return;
  }

  if (this.availableQuantity === 0) {
    if (this.fulfilledQuantity >= this.totalQuantity) {
      this.status = "COMPLETED";
    } else {
      this.status = "FULLY_RESERVED";
    }
  } else if (this.availableQuantity < this.totalQuantity) {
    this.status = "PARTIALLY_RESERVED";
  } else {
    this.status = "AVAILABLE";
  }
};

const FoodDonation = mongoose.model("FoodDonation", foodDonationSchema);

export default FoodDonation;
