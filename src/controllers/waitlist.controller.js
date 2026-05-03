const Waitlist = require('../models/waitlist.model');
const Notification = require('../models/notification.model');
const Doctor = require('../models/doctor.model');
const SlotStatus = require('../models/slotStatus.model');
const asyncHandler = require('../utils/asyncHandler');

// Add user to waitlist for a specific slot
exports.addToWaitlist = asyncHandler(async (req, res) => {
  const { doctorId, appointmentDate, slotTime } = req.body;

  if (!doctorId || !appointmentDate || !slotTime) {
    return res.status(400).json({ message: 'Doctor ID, date, and time are required' });
  }

  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    return res.status(404).json({ message: 'Doctor not found' });
  }

  // Check if already on waitlist
  const existingWaitlist = await Waitlist.findOne({
    userId: req.user._id,
    doctorId,
    appointmentDate: new Date(appointmentDate),
    slotTime,
    status: 'active',
  });

  if (existingWaitlist) {
    return res.status(409).json({ message: 'Already on waitlist for this slot' });
  }

  const waitlist = await Waitlist.create({
    userId: req.user._id,
    doctorId,
    appointmentDate: new Date(appointmentDate),
    slotTime,
  });

  res.status(201).json({
    message: 'Added to waitlist. You will be notified when slot becomes available.',
    waitlist,
  });
});

// Get user's waitlist
exports.getUserWaitlist = asyncHandler(async (req, res) => {
  const waitlist = await Waitlist.find({
    userId: req.user._id,
    status: 'active',
  })
    .populate('doctorId', 'name specialization')
    .sort({ createdAt: -1 });

  res.status(200).json(waitlist);
});

// Remove from waitlist
exports.removeFromWaitlist = asyncHandler(async (req, res) => {
  const { waitlistId } = req.params;

  const waitlist = await Waitlist.findById(waitlistId);
  if (!waitlist) {
    return res.status(404).json({ message: 'Waitlist entry not found' });
  }

  if (waitlist.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  waitlist.status = 'cancelled';
  await waitlist.save();

  res.status(200).json({ message: 'Removed from waitlist' });
});

// Notify waitlisted users (called when a slot becomes free)
exports.notifyWaitlistedUsers = asyncHandler(async (req, res) => {
  const { doctorId, appointmentDate, slotTime } = req.body;

  if (!doctorId || !appointmentDate || !slotTime) {
    return res.status(400).json({ message: 'Doctor ID, date, and time are required' });
  }

  // Find all users waiting for this slot
  const waitlistedUsers = await Waitlist.find({
    doctorId,
    appointmentDate: new Date(appointmentDate),
    slotTime,
    status: 'active',
  });

  if (waitlistedUsers.length === 0) {
    return res.status(200).json({ message: 'No users to notify' });
  }

  const doctor = await Doctor.findById(doctorId);
  const notifications = [];

  for (const waitlist of waitlistedUsers) {
    const notification = await Notification.create({
      userId: waitlist.userId,
      type: 'slot_available',
      title: `Slot Available with ${doctor.name}`,
      message: `A slot on ${appointmentDate} at ${slotTime} is now available. Hurry up and book!`,
      relatedData: {
        doctorId,
        appointmentDate,
        slotTime,
      },
    });

    // Update waitlist status
    waitlist.status = 'notified';
    waitlist.notificationSent = true;
    await waitlist.save();

    notifications.push(notification);
  }

  res.status(200).json({
    message: `Notified ${notifications.length} users`,
    notificationsCount: notifications.length,
  });
});
