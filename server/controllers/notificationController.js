import Notification from "../models/Notification.js";

/**
 * GET /api/notifications
 * Fetch user notifications and unread counter
 */
export const getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false
    });

    res.status(200).json({
      success: true,
      unreadCount,
      notifications
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/notifications/:id/read
 * Mark a single notification as read
 */
export const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true },
      { returnDocument: "after" }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found."
      });
    }

    res.status(200).json({
      success: true,
      notification
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read for current user
 */
export const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    );

    res.status(200).json({
      success: true,
      message: "All notifications marked as read."
    });
  } catch (error) {
    next(error);
  }
};
