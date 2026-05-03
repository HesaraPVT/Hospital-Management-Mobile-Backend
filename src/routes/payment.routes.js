const express = require('express');
const { createPayment, getPayments, getPaymentById, updatePayment, deletePayment, createStripePaymentIntent, confirmStripePayment, approveCashPayment } = require('../controllers/payment.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);
router.get('/', getPayments);
router.post('/', createPayment);
router.post('/stripe/create-intent', createStripePaymentIntent);
router.post('/stripe/confirm', confirmStripePayment);
router.put('/:id/approve-cash', approveCashPayment);
router.get('/:id', getPaymentById);
router.put('/:id', updatePayment);
router.delete('/:id', deletePayment);

module.exports = router;
