const Notification = require('../models/notification.model');
const asyncHandler = require('../utils/asyncHandler');

// Get user's notifications
exports.getNotifications = asyncHandler(async (req, res) => {
  const { limit = 20, skip = 0, unreadOnly = false } = req.query;

  const filter = { userId: req.user._id };
  if (unreadOnly === 'true') {
    filter.isRead = false;
  }

  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(parseInt(skip));

  const total = await Notification.countDocuments(filter);
  const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });

  res.status(200).json({
    notifications,
    total,
    unreadCount,
  });
});

// Mark notification as read
exports.markAsRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  const notification = await Notification.findById(notificationId);
  if (!notification) {
    return res.status(404).json({ message: 'Notification not found' });
  }

  if (notification.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  notification.isRead = true;
  await notification.save();

  res.status(200).json(notification);
});

// Mark all notifications as read
exports.markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { isRead: true }
  );

  res.status(200).json({ message: 'All notifications marked as read' });
});

// Delete notification
exports.deleteNotification = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  const notification = await Notification.findById(notificationId);
  if (!notification) {
    return res.status(404).json({ message: 'Notification not found' });
  }

  if (notification.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  await Notification.findByIdAndDelete(notificationId);

  res.status(200).json({ message: 'Notification deleted' });
});

// Get unread count
exports.getUnreadCount = asyncHandler(async (req, res) => {
  const unreadCount = await Notification.countDocuments({
    userId: req.user._id,
    isRead: false,
  });

  res.status(200).json({ unreadCount });
});
