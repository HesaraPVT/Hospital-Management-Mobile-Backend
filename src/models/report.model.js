const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reportType: { type: String, enum: ['appointments', 'revenue', 'doctor_performance'], required: true },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);
