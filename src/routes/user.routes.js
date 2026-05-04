const express = require('express');
const { getUsers, createUser, getUserById, updateUser, deleteUser } = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');

const router = express.Router();

router.use(authMiddleware);
router.get('/', roleMiddleware('admin'), getUsers);
router.post('/', roleMiddleware('admin'), createUser);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
