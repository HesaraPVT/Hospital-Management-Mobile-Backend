const express = require('express');
const { generateReport, getReports, getReportById, deleteReport } = require('../controllers/report.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');

const router = express.Router();

router.use(authMiddleware);
router.post('/generate', roleMiddleware('admin'), generateReport);
router.get('/', roleMiddleware('admin'), getReports);
router.get('/:id', roleMiddleware('admin'), getReportById);
router.delete('/:id', roleMiddleware('admin'), deleteReport);

module.exports = router;
