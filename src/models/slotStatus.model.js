const mongoose = require('mongoose');

const slotStatusSchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    appointmentDate: { type: Date, required: true }, // Date only (no time)
    slotTime: { type: String, required: true }, // Format: HH:MM (e.g., "09:00")
    isBooked: { type: Boolean, default: false },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', default: null },
    serviceDuration: { type: Number, default: 30 }, // Duration in minutes
    endTime: { type: String, default: null }, // Format: HH:MM - when service ends
  },
  { timestamps: true }
);

// Create compound index for faster queries
slotStatusSchema.index({ doctorId: 1, appointmentDate: 1, slotTime: 1 }, { unique: true });
slotStatusSchema.index({ doctorId: 1, appointmentDate: 1 });
slotStatusSchema.index({ doctorId: 1, appointmentDate: 1, isBooked: 1 });

module.exports = mongoose.model('SlotStatus', slotStatusSchema);
