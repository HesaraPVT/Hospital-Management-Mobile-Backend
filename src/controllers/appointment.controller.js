const Appointment = require('../models/appointment.model');
const Doctor = require('../models/doctor.model');
const Service = require('../models/service.model');
const SlotStatus = require('../models/slotStatus.model');
const Waitlist = require('../models/waitlist.model');
const Notification = require('../models/notification.model');
const asyncHandler = require('../utils/asyncHandler');
const { generateTimeSlots } = require('../utils/slotGenerator');

const getDayRangeUTC = (dateValue) => {
  const d = new Date(dateValue);
  const start = new Date(d);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
};

const isValidTime = (t) => /^\d{2}:\d{2}$/.test(String(t));

/**
 * Convert HH:MM time to total minutes
 */
const timeToMinutes = (timeStr) => {
  const [hours, mins] = timeStr.split(':').map(Number);
  return hours * 60 + mins;
};

/**
 * Convert minutes to HH:MM format
 */
const minutesToTime = (totalMins) => {
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

/**
 * Check if time ranges overlap
 */
const hasTimeConflict = (start1, end1, start2, end2) => {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  
  // Check if ranges overlap: start of one is before end of other
  return s1 < e2 && s2 < e1;
};

exports.createAppointment = asyncHandler(async (req, res) => {
  const { doctorId, serviceId, appointmentDate, appointmentTime, notes } = req.body;

  if (!doctorId || !serviceId || !appointmentDate || !appointmentTime) {
    return res.status(400).json({ message: 'Doctor, service, date, and time are required' });
  }

  if (!isValidTime(appointmentTime)) {
    return res.status(400).json({ message: 'appointmentTime must be in HH:MM format' });
  }

  const doctor = await Doctor.findById(doctorId);
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
  if (!doctor.availabilityStatus) {
    return res.status(400).json({ message: 'Selected doctor is not available' });
  }

  const service = await Service.findById(serviceId);
  if (!service) return res.status(404).json({ message: 'Service not found' });
  if (!service.availabilityStatus) {
    return res.status(400).json({ message: 'Selected service is not available' });
  }

  // Calculate appointment end time based on service duration
  const appointmentEndTime = minutesToTime(timeToMinutes(appointmentTime) + service.duration);

  // Verify appointment fits within doctor availability
  if (timeToMinutes(appointmentEndTime) > timeToMinutes(doctor.availabilityEndTime)) {
    return res.status(400).json({ 
      message: `Appointment duration (${service.duration} mins) extends beyond doctor's availability. Try an earlier time.` 
    });
  }

  const { start, end } = getDayRangeUTC(appointmentDate);
  
  // Get all active appointments for this doctor on this date
  const existingAppointments = await Appointment.find({
    doctorId,
    appointmentDate: { $gte: start, $lte: end },
    status: { $nin: ['cancelled', 'rejected'] },
  }).populate('serviceId');

  // Check for time conflicts with existing appointments
  for (const existing of existingAppointments) {
    const existingEndTime = minutesToTime(timeToMinutes(existing.appointmentTime) + (existing.serviceId?.duration || 30));
    
    if (hasTimeConflict(appointmentTime, appointmentEndTime, existing.appointmentTime, existingEndTime)) {
      return res.status(409).json({ 
        message: `Time slot conflicts with existing appointment (${existing.appointmentTime}-${existingEndTime})` 
      });
    }
  }

  // Create the appointment
  const appointment = await Appointment.create({
    userId: req.user._id,
    doctorId,
    serviceId,
    appointmentDate: new Date(appointmentDate),
    appointmentTime,
    notes,
  });

  // Create slot status records for the entire duration
  const appointmentDateOnly = new Date(appointmentDate);
  appointmentDateOnly.setUTCHours(0, 0, 0, 0);

  try {
    // Block all 30-minute slots that this appointment spans
    let currentSlotTime = appointmentTime;
    const endTimeMinutes = timeToMinutes(appointmentEndTime);
    
    while (timeToMinutes(currentSlotTime) < endTimeMinutes) {
      await SlotStatus.findOneAndUpdate(
        {
          doctorId,
          appointmentDate: appointmentDateOnly,
          slotTime: currentSlotTime,
        },
        {
          isBooked: true,
          appointmentId: appointment._id,
          serviceId,
          serviceDuration: service.duration,
          endTime: appointmentEndTime,
        },
        { upsert: true, new: true }
      );
      
      // Move to next 30-minute interval
      currentSlotTime = minutesToTime(timeToMinutes(currentSlotTime) + 30);
    }
  } catch (error) {
    console.error('Error creating slot status:', error);
  }

  res.status(201).json(appointment);
});

exports.getAppointments = asyncHandler(async (req, res) => {
  console.log('📅 [APPOINTMENT] GET /appointments - User role:', req.user?.role, 'User ID:', req.user?._id);
  const filter = req.user.role === 'admin' ? {} : { userId: req.user._id };
  console.log('📅 [APPOINTMENT] Filter:', JSON.stringify(filter));
  const appointments = await Appointment.find(filter)
    .populate('doctorId')
    .populate('serviceId')
    .populate('userId', '-password');
  console.log(`📅 [APPOINTMENT] Found ${appointments.length} appointments`);
  res.status(200).json(appointments);
});

exports.getAppointmentById = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate('doctorId')
    .populate('serviceId')
    .populate('userId', '-password');

  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found' });
  }

  if (req.user.role !== 'admin' && appointment.userId._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  res.status(200).json(appointment);
});

exports.updateAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found' });
  }

  if (req.user.role !== 'admin' && appointment.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const updates = {};
  if (req.body.doctorId !== undefined) updates.doctorId = req.body.doctorId;
  if (req.body.serviceId !== undefined) updates.serviceId = req.body.serviceId;
  if (req.body.appointmentDate !== undefined) updates.appointmentDate = req.body.appointmentDate;
  if (req.body.appointmentTime !== undefined) updates.appointmentTime = req.body.appointmentTime;
  if (req.body.notes !== undefined) updates.notes = req.body.notes;

  if (updates.appointmentTime !== undefined && !isValidTime(updates.appointmentTime)) {
    return res.status(400).json({ message: 'appointmentTime must be in HH:MM format' });
  }

  const effectiveDoctorId = updates.doctorId || appointment.doctorId;
  const effectiveServiceId = updates.serviceId || appointment.serviceId;

  const doctor = await Doctor.findById(effectiveDoctorId);
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
  if (!doctor.availabilityStatus) {
    return res.status(400).json({ message: 'Selected doctor is not available' });
  }

  const service = await Service.findById(effectiveServiceId);
  if (!service) return res.status(404).json({ message: 'Service not found' });
  if (!service.availabilityStatus) {
    return res.status(400).json({ message: 'Selected service is not available' });
  }

  const doctorChanged = updates.doctorId !== undefined;
  const dateChanged = updates.appointmentDate !== undefined;
  const timeChanged = updates.appointmentTime !== undefined;

  if (doctorChanged || dateChanged || timeChanged) {
    const checkDoctor = effectiveDoctorId;
    const checkDate = updates.appointmentDate || appointment.appointmentDate;
    const checkTime = updates.appointmentTime || appointment.appointmentTime;

    const { start, end } = getDayRangeUTC(checkDate);
    const conflict = await Appointment.findOne({
      _id: { $ne: appointment._id },
      doctorId: checkDoctor,
      appointmentDate: { $gte: start, $lte: end },
      appointmentTime: checkTime,
      status: { $nin: ['cancelled', 'rejected'] },
    });

    if (conflict) return res.status(409).json({ message: 'Selected slot is already booked' });
  }

  Object.assign(appointment, updates);
  if (updates.appointmentDate !== undefined) {
    appointment.appointmentDate = new Date(updates.appointmentDate);
  }
  await appointment.save();

  res.status(200).json(appointment);
});

exports.deleteAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found' });
  }

  if (req.user.role !== 'admin' && appointment.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  await appointment.remove();
  res.status(200).json({ message: 'Appointment deleted successfully' });
});

exports.updateAppointmentStatus = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { status } = req.body;
  const allowed = ['pending', 'approved', 'rejected', 'cancelled'];
  if (!status || !allowed.includes(status)) {
    return res.status(400).json({ message: 'Valid status is required' });
  }

  appointment.status = status;
  await appointment.save();

  res.status(200).json(appointment);
});

exports.getAvailableSlots = asyncHandler(async (req, res) => {
  const { doctorId, appointmentDate, serviceId } = req.query;

  if (!doctorId || !appointmentDate || !serviceId) {
    return res.status(400).json({ message: 'Doctor ID, appointment date, and service ID are required' });
  }

  // Validate appointmentDate format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)) {
    return res.status(400).json({ message: 'appointmentDate must be in YYYY-MM-DD format' });
  }

  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    return res.status(404).json({ message: 'Doctor not found' });
  }

  const service = await Service.findById(serviceId);
  if (!service) {
    return res.status(404).json({ message: 'Service not found' });
  }

  try {
    // Validate doctor has availability times set
    if (!doctor.availabilityStartTime || !doctor.availabilityEndTime) {
      return res.status(400).json({ 
        message: 'Doctor availability times not configured. Admin must set availability hours.' 
      });
    }

    // Get all appointments for this doctor on the specified date
    const { start, end } = getDayRangeUTC(appointmentDate);
    const existingAppointments = await Appointment.find({
      doctorId,
      appointmentDate: { $gte: start, $lte: end },
      status: { $nin: ['cancelled', 'rejected'] },
    }).populate('serviceId');

    // Generate available slots with service duration
    let allSlots = [];
    try {
      allSlots = generateTimeSlots(doctor.availabilityStartTime, doctor.availabilityEndTime, service.duration);
    } catch (error) {
      return res.status(400).json({ 
        message: `Invalid doctor availability times: ${error.message}` 
      });
    }

    // Check each slot for conflicts with existing appointments
    const slotsWithStatus = allSlots.map(slot => {
      const slotEnd = slot.endTime;
      let isBooked = false;
      let bookedAppointmentId = null;
      let actualBookedEndTime = slotEnd; // Track the ACTUAL booked appointment end time

      // Check if this slot conflicts with any existing appointment
      for (const existing of existingAppointments) {
        const existingEndTime = minutesToTime(timeToMinutes(existing.appointmentTime) + (existing.serviceId?.duration || 30));
        
        if (hasTimeConflict(slot.startTime, slotEnd, existing.appointmentTime, existingEndTime)) {
          isBooked = true;
          bookedAppointmentId = existing._id;
          actualBookedEndTime = existingEndTime; // Store the ACTUAL booked end time, not calculated
          break;
        }
      }

      return {
        time: slot.startTime,
        endTime: isBooked ? actualBookedEndTime : slotEnd, // Show actual booked end time OR calculated available end time
        duration: slot.duration,
        actualDuration: isBooked ? (timeToMinutes(actualBookedEndTime) - timeToMinutes(slot.startTime)) : slot.duration, // Actual booked duration
        isBooked,
        appointmentId: bookedAppointmentId,
      };
    });

    res.status(200).json({
      success: true,
      doctorId,
      appointmentDate,
      serviceId,
      serviceName: service.serviceName,
      serviceDuration: service.duration,
      availabilityStartTime: doctor.availabilityStartTime,
      availabilityEndTime: doctor.availabilityEndTime,
      slots: slotsWithStatus, // ALL slots (both booked and available)
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    return res.status(500).json({ message: 'Error fetching available slots', error: error.message });
  }
});

// Cancel appointment and notify waitlisted users
exports.cancelAppointmentWithNotification = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;
  const { cancellationReason } = req.body;

  const appointment = await Appointment.findById(appointmentId)
    .populate('doctorId')
    .populate('userId');

  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found' });
  }

  // Only user or admin can cancel
  if (req.user.role !== 'admin' && appointment.userId._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  // Check if already cancelled
  if (appointment.status === 'cancelled') {
    return res.status(400).json({ message: 'Appointment already cancelled' });
  }

  // Update appointment status
  appointment.status = 'cancelled';
  await appointment.save();

  // Delete or mark all slots as available for this appointment
  const appointmentDateOnly = new Date(appointment.appointmentDate);
  appointmentDateOnly.setUTCHours(0, 0, 0, 0);

  // Find all slot status records for this appointment and mark as available
  await SlotStatus.updateMany(
    {
      appointmentId: appointment._id,
      doctorId: appointment.doctorId._id,
      appointmentDate: appointmentDateOnly,
    },
    { 
      isBooked: false, 
      appointmentId: null,
    }
  );

  // Find and notify waitlisted users (check for the specific start time)
  const waitlistedUsers = await Waitlist.find({
    doctorId: appointment.doctorId._id,
    appointmentDate: appointmentDateOnly,
    slotTime: appointment.appointmentTime,
    status: 'active',
  });

  const notifications = [];
  for (const waitlist of waitlistedUsers) {
    // Create notification for each waitlisted user
    const notification = await Notification.create({
      userId: waitlist.userId,
      type: 'slot_available',
      title: `Slot Available with ${appointment.doctorId.name}`,
      message: `A slot on ${appointment.appointmentDate.toDateString()} at ${appointment.appointmentTime} is now available. Book now!`,
      relatedData: {
        doctorId: appointment.doctorId._id,
        appointmentDate: appointmentDateOnly,
        slotTime: appointment.appointmentTime,
      },
    });

    // Update waitlist status
    waitlist.status = 'notified';
    waitlist.notificationSent = true;
    await waitlist.save();

    notifications.push(notification);
  }

  // Create cancellation notification for the user
  await Notification.create({
    userId: appointment.userId._id,
    type: 'appointment_cancelled',
    title: 'Appointment Cancelled',
    message: `Your appointment with ${appointment.doctorId.name} on ${appointment.appointmentDate.toDateString()} at ${appointment.appointmentTime} has been cancelled.`,
    relatedData: {
      appointmentId: appointment._id,
      doctorId: appointment.doctorId._id,
    },
  });

  res.status(200).json({
    message: 'Appointment cancelled successfully',
    appointment,
    waitlistedUsersNotified: notifications.length,
  });
});
