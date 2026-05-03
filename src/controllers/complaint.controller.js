const Complaint = require('../models/complaint.model');
const asyncHandler = require('../utils/asyncHandler');

exports.createComplaint = asyncHandler(async (req, res) => {
  const { title, description, category, contactDetails } = req.body;

  if (!title || !description || !category) {
    return res.status(400).json({ message: 'Title, description, and category are required' });
  }

  const complaint = await Complaint.create({
    userId: req.user._id,
    title,
    description,
    category,
    contactDetails,
  });

  res.status(201).json(complaint);
});

exports.updateComplaint = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, category, updatedAt } = req.body;

  const complaint = await Complaint.findById(id);
  if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

  if (complaint.isDeleted) return res.status(400).json({ message: 'Complaint is deleted' });

  const isOwner = complaint.userId.toString() === req.user._id.toString();
  if (!isOwner) return res.status(403).json({ message: 'Forbidden' });

  if (updatedAt && new Date(complaint.updatedAt).getTime() !== new Date(updatedAt).getTime()) {
    return res.status(409).json({ message: 'Complaint was modified by someone else. Please refresh and try again.' });
  }

  if (complaint.status !== 'submitted') {
    return res.status(400).json({ message: 'Cannot edit after admin starts review' });
  }

  // Save edit history
  complaint.editHistory.push({
    title: complaint.title,
    description: complaint.description,
    category: complaint.category,
  });

  if (title !== undefined) complaint.title = title;
  if (description !== undefined) complaint.description = description;
  if (category !== undefined) complaint.category = category;

  if (!complaint.title || !complaint.description || !complaint.category) {
    return res.status(400).json({ message: 'Title, description, and category are required' });
  }

  await complaint.save();
  res.status(200).json(complaint);
});

exports.getComplaints = asyncHandler(async (req, res) => {
  const { status, priority, category, search } = req.query;
  const filter = { isDeleted: { $ne: true } };
  
  if (req.user.role !== 'admin') {
    filter.userId = req.user._id;
  } else {
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { complaintId: { $regex: search, $options: 'i' } }
      ];
    }
  }

  let complaints = await Complaint.find(filter)
    .populate('userId', 'name email')
    .sort({ createdAt: -1 });

  // For admin search by user name (populate filter fallback)
  if (req.user.role === 'admin' && search) {
    const searchRegex = new RegExp(search, 'i');
    complaints = complaints.filter(c => 
      searchRegex.test(c.complaintId) || 
      (c.userId && c.userId.name && searchRegex.test(c.userId.name))
    );
  }

  // Sort: solved to the bottom, new ones to top
  const solvedStatuses = ['resolved', 'closed'];
  complaints.sort((a, b) => {
    const aSolved = solvedStatuses.includes(a.status);
    const bSolved = solvedStatuses.includes(b.status);
    if (aSolved && !bSolved) return 1;
    if (!aSolved && bSolved) return -1;
    return 0; // maintain createdAt desc
  });

  res.status(200).json(complaints);
});

exports.getComplaintById = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id).populate('userId', 'name email');

  if (!complaint || complaint.isDeleted) {
    return res.status(404).json({ message: 'Complaint not found' });
  }

  if (req.user.role !== 'admin' && complaint.userId._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  res.status(200).json(complaint);
});

exports.updateComplaintStatus = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint || complaint.isDeleted) {
    return res.status(404).json({ message: 'Complaint not found' });
  }

  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

  const { status, priority, adminReply, internalNotes, updatedAt } = req.body;
  const allowedStatus = ['submitted', 'under_review', 'in_progress', 'resolved', 'closed'];
  const allowedPriority = ['low', 'medium', 'high', 'critical'];
  
  if (status && !allowedStatus.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  if (priority && !allowedPriority.includes(priority)) {
    return res.status(400).json({ message: 'Invalid priority' });
  }

  if (updatedAt && new Date(complaint.updatedAt).getTime() !== new Date(updatedAt).getTime()) {
    return res.status(409).json({ message: 'Complaint was modified by someone else. Please refresh and try again.' });
  }

  if (status) complaint.status = status;
  if (priority) complaint.priority = priority;
  if (adminReply !== undefined) complaint.adminReply = adminReply;
  if (internalNotes !== undefined) complaint.internalNotes = internalNotes;
  
  await complaint.save();

  res.status(200).json(complaint);
});

exports.deleteComplaint = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint || complaint.isDeleted) {
    return res.status(404).json({ message: 'Complaint not found' });
  }

  if (req.user.role !== 'admin' && complaint.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Unauthorized: You do not own this complaint' });
  }

  if (req.user.role !== 'admin' && complaint.status !== 'submitted') {
    return res.status(400).json({ message: `Cannot delete: Status is ${complaint.status}` });
  }

  // Soft delete
  await Complaint.findOneAndUpdate(
    { _id: req.params.id },
    { $set: { isDeleted: true } }
  );
  
  res.status(200).json({ message: 'Complaint deleted successfully' });
});

exports.rateComplaint = asyncHandler(async (req, res) => {
  const { rating, userFeedback } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Valid rating (1-5) is required' });
  }

  const complaint = await Complaint.findById(req.params.id);
  if (!complaint || complaint.isDeleted) {
    return res.status(404).json({ message: 'Complaint not found' });
  }

  // Only the owner can rate
  if (complaint.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  // Can only rate if resolved or closed
  const allowedStatuses = ['resolved', 'closed'];
  if (!allowedStatuses.includes(complaint.status)) {
    return res.status(400).json({ message: 'You can only rate after the complaint is resolved or closed' });
  }

  // Prevent multiple ratings
  if (complaint.rating) {
    return res.status(400).json({ message: 'You have already rated this complaint' });
  }

  complaint.rating = rating;
  complaint.userFeedback = userFeedback;
  complaint.ratedAt = new Date();

  await complaint.save();

  res.status(200).json(complaint);
});

