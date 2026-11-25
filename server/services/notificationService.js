import Notification from "../models/Notification.js";

/**
 * Create a new notification for a user (fail-safe)
 */
export const sendNotification = async ({
  recipient,
  sender = null,
  title,
  message,
  type = "SYSTEM",
  link = ""
}) => {
  try {
    const notification = new Notification({
      recipient,
      sender,
      title,
      message,
      type,
      link
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error(`Failed to create notification: ${error.message}`);
    return null;
  }
};
