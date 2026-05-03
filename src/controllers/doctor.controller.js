const Doctor = require('../models/doctor.model');
const asyncHandler = require('../utils/asyncHandler');

exports.createDoctor = asyncHandler(async (req, res) => {
  const { name, specialization, experience, description, consultationFee, qualifications, department, image, availabilityStatus, availabilityStartTime, availabilityEndTime } = req.body;

  if (!name || !specialization || experience === undefined) {
    return res.status(400).json({ message: 'Name, specialization, and experience are required' });
  }

  // Validate time format (HH:MM)
  const timeRegex = /^\d{2}:\d{2}$/;
  if (availabilityStartTime && !timeRegex.test(availabilityStartTime)) {
    return res.status(400).json({ message: 'availabilityStartTime must be in HH:MM format' });
  }
  if (availabilityEndTime && !timeRegex.test(availabilityEndTime)) {
    return res.status(400).json({ message: 'availabilityEndTime must be in HH:MM format' });
  }

  const doctor = await Doctor.create({
    name,
    specialization,
    experience,
    description,
    consultationFee,
    qualifications,
    department,
    image,
    availabilityStatus: availabilityStatus !== undefined ? availabilityStatus : true,
    availabilityStartTime: availabilityStartTime || '09:00',
    availabilityEndTime: availabilityEndTime || '17:00',
  });

  res.status(201).json(doctor);
});

exports.getDoctors = asyncHandler(async (req, res) => {
  const doctors = await Doctor.find();
  res.status(200).json(doctors);
});

exports.getDoctorById = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) {
    return res.status(404).json({ message: 'Doctor not found' });
  }
  res.status(200).json(doctor);
});

exports.updateDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) {
    return res.status(404).json({ message: 'Doctor not found' });
  }

  const updates = {};
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.specialization !== undefined) updates.specialization = req.body.specialization;
  if (req.body.experience !== undefined) updates.experience = req.body.experience;
  if (req.body.description !== undefined) updates.description = req.body.description;
  if (req.body.consultationFee !== undefined) updates.consultationFee = req.body.consultationFee;
  if (req.body.qualifications !== undefined) updates.qualifications = req.body.qualifications;
  if (req.body.department !== undefined) updates.department = req.body.department;
  if (req.body.image !== undefined) updates.image = req.body.image;
  if (req.body.availabilityStatus !== undefined) updates.availabilityStatus = req.body.availabilityStatus;

  // Handle availability time updates
  if (req.body.availabilityStartTime !== undefined) {
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(req.body.availabilityStartTime)) {
      return res.status(400).json({ message: 'availabilityStartTime must be in HH:MM format' });
    }
    updates.availabilityStartTime = req.body.availabilityStartTime;
  }
  if (req.body.availabilityEndTime !== undefined) {
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(req.body.availabilityEndTime)) {
      return res.status(400).json({ message: 'availabilityEndTime must be in HH:MM format' });
    }
    updates.availabilityEndTime = req.body.availabilityEndTime;
  }

  Object.assign(doctor, updates);
  await doctor.save();

  res.status(200).json(doctor);
});

exports.deleteDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) {
    return res.status(404).json({ message: 'Doctor not found' });
  }

  await doctor.deleteOne();
  res.status(200).json({ message: 'Doctor deleted successfully' });
});
