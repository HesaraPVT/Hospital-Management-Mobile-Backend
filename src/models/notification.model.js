const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { 
      type: String, 
      enum: ['slot_available', 'appointment_confirmed', 'appointment_cancelled', 'appointment_reminder'], 
      required: true 
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    relatedData: {
      doctorId: mongoose.Schema.Types.ObjectId,
      appointmentId: mongoose.Schema.Types.ObjectId,
      appointmentDate: Date,
      slotTime: String,
    },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Create index for finding unread notifications
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
