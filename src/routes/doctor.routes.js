const express = require('express');
const { createDoctor, getDoctors, getDoctorById, updateDoctor, deleteDoctor } = require('../controllers/doctor.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');

const router = express.Router();

router.get('/', getDoctors);
router.post('/', authMiddleware, roleMiddleware('admin'), createDoctor);
router.get('/:id', getDoctorById);
router.put('/:id', authMiddleware, roleMiddleware('admin'), updateDoctor);
router.delete('/:id', authMiddleware, roleMiddleware('admin'), deleteDoctor);

module.exports = router;
