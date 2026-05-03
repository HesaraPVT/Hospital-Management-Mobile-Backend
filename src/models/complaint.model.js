const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    complaintId: { type: String, unique: true, sparse: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    contactDetails: { type: String },
    status: { 
      type: String, 
      enum: ['submitted', 'under_review', 'in_progress', 'resolved', 'closed'], 
      default: 'submitted' 
    },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    adminReply: { type: String },
    internalNotes: { type: String },
    isDeleted: { type: Boolean, default: false },
    editHistory: [
      {
        title: String,
        description: String,
        category: String,
        editedAt: { type: Date, default: Date.now },
      }
    ],
    rating: { type: Number, min: 1, max: 5 },
    userFeedback: { type: String },
    ratedAt: { type: Date },
  },
  { timestamps: true }
);

complaintSchema.pre('save', async function () {
  if (!this.complaintId) {
    this.complaintId = 'CMP-' + Math.floor(10000 + Math.random() * 90000);
  }
});

module.exports = mongoose.model('Complaint', complaintSchema);
