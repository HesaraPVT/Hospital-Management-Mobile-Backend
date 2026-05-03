/*const express = require('express');
const { createService, getServices, getServiceById, updateService, deleteService } = require('../controllers/service.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');

const router = express.Router();

router.get('/', getServices);
router.post('/', authMiddleware, roleMiddleware('admin'), createService);
router.get('/:id', getServiceById);
router.put('/:id', authMiddleware, roleMiddleware('admin'), updateService);
router.delete('/:id', authMiddleware, roleMiddleware('admin'), deleteService);

module.exports = router;
*/



const express = require('express');
const router = express.Router();

// Import controllers
const serviceController = require('../controllers/service.controller');

// Import access control middlewares
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

/**
 * Routes for /api/services
 */

// Publicly accessible routes
router.route('/')
    .get(serviceController.getServices);

router.route('/:id')
    .get(serviceController.getServiceById);

// Restricted routes (Admin only)
router.use(authenticate); // Apply authentication to all routes below this line

router.route('/')
    .post(authorize('admin'), serviceController.createService);

router.route('/:id')
    .put(authorize('admin'), serviceController.updateService)
    .delete(authorize('admin'), serviceController.deleteService);

module.exports = router;