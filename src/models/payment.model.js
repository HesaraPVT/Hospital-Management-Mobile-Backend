const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['cash', 'card'], default: 'card' },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    transactionReference: { type: String },
    // Stripe specific fields
    stripePaymentIntentId: { type: String },
    stripeClientSecret: { type: String },
    stripePaymentMethodId: { type: String },
    stripeChargeId: { type: String },
    stripeStatus: { type: String, enum: ['requires_payment_method', 'requires_confirmation', 'requires_action', 'processing', 'requires_capture', 'canceled', 'succeeded'] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
