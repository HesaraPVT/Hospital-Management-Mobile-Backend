const express = require('express');
const {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaint,
  updateComplaintStatus,
  deleteComplaint,
  rateComplaint,
} = require('../controllers/complaint.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');

const router = express.Router();

router.use(authMiddleware);
router.get('/', getComplaints);
router.post('/', createComplaint);
router.get('/:id', getComplaintById);
router.put('/:id', updateComplaint);
router.patch('/:id/status', roleMiddleware('admin'), updateComplaintStatus);
router.patch('/:id/rate', rateComplaint);
router.delete('/:id', deleteComplaint);

module.exports = router;
