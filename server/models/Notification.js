import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Recipient is required"],
      index: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true
    },
    type: {
      type: String,
      enum: [
        "REQUEST_RECEIVED",
        "REQUEST_APPROVED",
        "REQUEST_REJECTED",
        "REQUEST_CANCELLED",
        "READY_FOR_PICKUP",
        "HANDOVER_CONFIRMED",
        "COLLECTION_CONFIRMED",
        "REQUEST_COMPLETED",
        "NGO_VERIFIED",
        "NGO_REJECTED",
        "SYSTEM"
      ],
      default: "SYSTEM"
    },
    link: {
      type: String,
      default: ""
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
