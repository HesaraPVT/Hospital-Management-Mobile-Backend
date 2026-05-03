const express = require('express');
const {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointment,
  deleteAppointment,
  updateAppointmentStatus,
  getAvailableSlots,
  cancelAppointmentWithNotification,
} = require('../controllers/appointment.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');

const router = express.Router();

router.use(authMiddleware);
router.get('/slots/available', getAvailableSlots);
router.get('/', getAppointments);
router.post('/', createAppointment);
router.post('/:appointmentId/cancel', cancelAppointmentWithNotification);
router.get('/:id', getAppointmentById);
router.put('/:id', updateAppointment);
router.delete('/:id', deleteAppointment);
router.patch('/:id/status', roleMiddleware('admin'), updateAppointmentStatus);

module.exports = router;
