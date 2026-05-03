const express = require('express');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
} = require('../controllers/notification.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', getNotifications);
router.get('/unread/count', getUnreadCount);
router.patch('/:notificationId/read', markAsRead);
router.patch('/read/all', markAllAsRead);
router.delete('/:notificationId', deleteNotification);

module.exports = router;
