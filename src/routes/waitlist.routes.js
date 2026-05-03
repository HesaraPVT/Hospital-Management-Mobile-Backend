const express = require('express');
const {
  addToWaitlist,
  getUserWaitlist,
  removeFromWaitlist,
  notifyWaitlistedUsers,
} = require('../controllers/waitlist.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');

const router = express.Router();

router.use(authMiddleware);

// User routes
router.post('/', addToWaitlist);
router.get('/', getUserWaitlist);
router.delete('/:waitlistId', removeFromWaitlist);

// Admin routes
router.post('/admin/notify', roleMiddleware('admin'), notifyWaitlistedUsers);

module.exports = router;
