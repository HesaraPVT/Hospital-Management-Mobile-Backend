const express = require('express');
const upload = require('../middleware/upload.middleware');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');
const { uploadDoctorImage } = require('../controllers/upload.controller');

const router = express.Router();

router.post(
  '/doctor-image',
  authMiddleware,
  roleMiddleware('admin'),
  upload.single('doctorImage'),
  uploadDoctorImage
);

module.exports = router;
