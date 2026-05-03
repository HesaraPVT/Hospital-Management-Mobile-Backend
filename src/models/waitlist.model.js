const mongoose = require('mongoose');

const waitlistSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    appointmentDate: { type: Date, required: true },
    slotTime: { type: String, required: true }, // Format: HH:MM
    status: { type: String, enum: ['active', 'notified', 'cancelled'], default: 'active' },
    notificationSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Create index for finding waitlisted users for a slot
waitlistSchema.index({ doctorId: 1, appointmentDate: 1, slotTime: 1 });
waitlistSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Waitlist', waitlistSchema);
