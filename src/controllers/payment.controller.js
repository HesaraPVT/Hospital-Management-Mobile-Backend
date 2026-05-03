const Payment = require('../models/payment.model');
const Appointment = require('../models/appointment.model');
const User = require('../models/user.model');
const asyncHandler = require('../utils/asyncHandler');
const { createPaymentIntent, confirmPaymentIntent, getPaymentIntent } = require('../utils/stripeService');

exports.createPayment = asyncHandler(async (req, res) => {
  const { appointmentId, amount, paymentMethod, transactionReference, status } = req.body;

  if (!appointmentId || amount === undefined || !paymentMethod) {
    return res.status(400).json({ message: 'appointmentId, amount, and paymentMethod are required' });
  }

  const parsedAmount = Number(amount);
  if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number' });
  }

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found' });
  }

  if (req.user.role !== 'admin' && appointment.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  if (appointment.status !== 'approved') {
    return res.status(400).json({ message: 'Payment can be made only for approved appointments' });
  }

  // Prevent multiple payments for the same appointment.
  const existing = await Payment.findOne({ appointmentId });
  if (existing && existing.status !== 'failed') {
    return res.status(409).json({ message: 'Payment already exists for this appointment' });
  }

  const normalizedStatus = status || 'completed';
  const payment = await Payment.create({
    userId: req.user._id,
    appointmentId,
    amount: parsedAmount,
    paymentMethod,
    transactionReference,
    status: normalizedStatus,
  });

  if (normalizedStatus === 'completed') {
    appointment.paymentStatus = 'paid';
    await appointment.save();
  }

  res.status(201).json(payment);
});

exports.getPayments = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { userId: req.user._id };
  const payments = await Payment.find(filter)
    .populate('appointmentId')
    .populate('userId', '-password');
  res.status(200).json(payments);
});

exports.getPaymentById = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id)
    .populate('appointmentId')
    .populate('userId', '-password');

  if (!payment) {
    return res.status(404).json({ message: 'Payment not found' });
  }

  if (req.user.role !== 'admin' && payment.userId._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  res.status(200).json(payment);
});

exports.updatePayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { appointmentId, amount, paymentMethod, status, transactionReference } = req.body;

  const payment = await Payment.findById(id);
  if (!payment) return res.status(404).json({ message: 'Payment not found' });

  if (req.user.role !== 'admin' && payment.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  if (appointmentId !== undefined) payment.appointmentId = appointmentId;

  if (amount !== undefined) {
    const parsedAmount = Number(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number' });
    }
    payment.amount = parsedAmount;
  }

  if (paymentMethod !== undefined) payment.paymentMethod = paymentMethod;
  if (status !== undefined) payment.status = status;
  if (transactionReference !== undefined) payment.transactionReference = transactionReference;

  await payment.save();

  // Keep appointment.paymentStatus in sync for completed payments.
  if (payment.status === 'completed') {
    const appointment = await Appointment.findById(payment.appointmentId);
    if (appointment) {
      appointment.paymentStatus = 'paid';
      await appointment.save();
    }
  }

  res.status(200).json(payment);
});

exports.deletePayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) {
    return res.status(404).json({ message: 'Payment not found' });
  }

  if (req.user.role !== 'admin' && payment.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  await payment.remove();
  res.status(200).json({ message: 'Payment deleted successfully' });
});

/**
 * Create Stripe payment intent for card payments
 */
exports.createStripePaymentIntent = asyncHandler(async (req, res) => {
  const { appointmentId, amount } = req.body;

  if (!appointmentId || !amount) {
    return res.status(400).json({ message: 'appointmentId and amount are required' });
  }

  const parsedAmount = Number(amount);
  if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number' });
  }

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found' });
  }

  if (req.user.role !== 'admin' && appointment.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  if (appointment.status !== 'approved') {
    return res.status(400).json({ message: 'Payment can be made only for approved appointments' });
  }

  // Check for existing non-failed payment
  const existing = await Payment.findOne({ appointmentId });
  if (existing && existing.status !== 'failed') {
    return res.status(409).json({ message: 'Payment already exists for this appointment' });
  }

  try {
    const description = `Hospital Appointment Payment - User: ${req.user.email}`;

    // Create Stripe payment intent
    const paymentIntent = await createPaymentIntent(parsedAmount, null, description);

    // Create payment record
    const payment = await Payment.create({
      userId: req.user._id,
      appointmentId,
      amount: parsedAmount,
      paymentMethod: 'card',
      status: 'pending',
      stripePaymentIntentId: paymentIntent.id,
      stripeClientSecret: paymentIntent.client_secret,
      stripeStatus: paymentIntent.status,
    });

    res.status(201).json({
      paymentId: payment._id,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: parsedAmount,
      currency: 'usd',
    });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ message: 'Failed to create payment intent', error: error.message });
  }
});

/**
 * Confirm Stripe payment intent (called after card is processed on mobile)
 */
exports.approveCashPayment = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can approve cash payments' });
  }

  const payment = await Payment.findById(req.params.id);
  if (!payment) {
    return res.status(404).json({ message: 'Payment not found' });
  }

  if (payment.paymentMethod !== 'cash') {
    return res.status(400).json({ message: 'Only cash payments can be approved this way' });
  }

  if (payment.status !== 'pending') {
    return res.status(400).json({ message: `Payment is already ${payment.status}` });
  }

  payment.status = 'completed';
  await payment.save();

  const appointment = await Appointment.findById(payment.appointmentId);
  if (appointment) {
    appointment.paymentStatus = 'paid';
    await appointment.save();
  }

  res.status(200).json({ message: 'Cash payment approved successfully', payment });
});

exports.confirmStripePayment = asyncHandler(async (req, res) => {
  const { paymentId, paymentIntentId, cardNumber, expiryDate, cvv } = req.body;

  if (!paymentId || !paymentIntentId) {
    return res.status(400).json({ message: 'paymentId and paymentIntentId are required' });
  }

  const payment = await Payment.findById(paymentId);
  if (!payment) {
    return res.status(404).json({ message: 'Payment not found' });
  }

  if (req.user.role !== 'admin' && payment.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const stripeInstance = require('../utils/stripeService');
    let paymentIntent;

    // If card details are provided, create payment method and confirm
    if (cardNumber && expiryDate && cvv) {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

      // Clean card number (remove spaces and special characters)
      const cleanCardNumber = cardNumber.replace(/\s+/g, '');

      // Validate card number
      if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
        return res.status(400).json({ message: 'Invalid card number length' });
      }

      // Parse expiry date (MM/YY format)
      const [month, year] = expiryDate.split('/');
      const expMonth = parseInt(month, 10);
      const expYear = parseInt('20' + year, 10);

      if (!expMonth || !expYear || expMonth < 1 || expMonth > 12) {
        return res.status(400).json({ message: 'Invalid expiry date format. Use MM/YY' });
      }

      // Validate CVV
      if (cvv.length < 3 || cvv.length > 4) {
        return res.status(400).json({ message: 'Invalid CVV length (3-4 digits)' });
      }

      console.log(`Creating payment method - Card: ${cleanCardNumber.slice(-4)}, Exp: ${expMonth}/${expYear}`);

      // Create payment method from card details
      const paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: {
          number: cleanCardNumber,
          exp_month: expMonth,
          exp_year: expYear,
          cvc: cvv,
        },
      });

      console.log(`Payment method created: ${paymentMethod.id}`);

      // Confirm payment intent with the payment method
      paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethod.id,
        return_url: 'https://hospital-app.local/payment-return',
        off_session: true,
      });
    } else {
      // Just retrieve current status if no card details
      paymentIntent = await stripeInstance.getPaymentIntent(paymentIntentId);
    }

    // Update payment record with latest Stripe status
    payment.stripeStatus = paymentIntent.status;

    if (paymentIntent.status === 'succeeded') {
      payment.status = 'completed';
      payment.stripeChargeId = paymentIntent.charges?.data?.[0]?.id;
      payment.transactionReference = paymentIntentId;
      await payment.save();

      // Update appointment payment status
      const appointment = await Appointment.findById(payment.appointmentId);
      if (appointment) {
        appointment.paymentStatus = 'paid';
        await appointment.save();
      }

      res.status(200).json({
        message: 'Payment completed successfully',
        payment,
        status: 'succeeded',
      });
    } else if (paymentIntent.status === 'requires_action') {
      await payment.save();
      res.status(200).json({
        message: 'Payment requires additional action',
        status: 'requires_action',
        clientSecret: paymentIntent.client_secret,
      });
    } else if (paymentIntent.status === 'processing') {
      await payment.save();
      res.status(200).json({
        message: 'Payment is processing',
        status: 'processing',
      });
    } else if (paymentIntent.status === 'requires_payment_method') {
      payment.status = 'failed';
      await payment.save();
      res.status(400).json({
        message: 'Payment method is required or invalid',
        status: 'requires_payment_method',
      });
    } else if (paymentIntent.status === 'canceled') {
      payment.status = 'failed';
      await payment.save();
      res.status(400).json({
        message: 'Payment was canceled',
        status: 'canceled',
      });
    } else {
      payment.status = 'failed';
      await payment.save();
      res.status(400).json({
        message: 'Payment failed',
        status: paymentIntent.status,
        details: paymentIntent.last_payment_error?.message || 'Unknown error',
      });
    }
  } catch (error) {
    console.error('Error confirming payment:', error);

    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      console.error('Invalid request:', error.message);
      return res.status(400).json({
        message: 'Invalid payment details',
        error: error.message,
      });
    }

    if (error.type === 'StripeCardError') {
      console.error('Card error - Code:', error.code, 'Message:', error.message);
      return res.status(400).json({
        message: 'Card declined or invalid',
        error: error.message,
        code: error.code,
        details: {
          'card_declined': 'The card was declined by your bank',
          'incorrect_cvc': 'The CVV/CVC is incorrect',
          'expired_card': 'The card has expired',
          'processing_error': 'An error occurred while processing the card',
        }[error.code] || 'Unknown card error',
      });
    }

    if (error.type === 'StripeRateLimitError') {
      console.error('Rate limited:', error.message);
      return res.status(429).json({
        message: 'Too many requests, please try again later',
        error: error.message,
      });
    }

    if (error.type === 'StripeAuthenticationError') {
      console.error('Auth error:', error.message);
      return res.status(500).json({
        message: 'Authentication error with payment provider',
        error: 'Please check STRIPE_SECRET_KEY configuration',
      });
    }

    console.error('Unexpected error type:', error.type);
    res.status(500).json({
      message: 'Failed to confirm payment',
      error: error.message,
      details: error.code || 'Unknown error code',
    });
  }
});
