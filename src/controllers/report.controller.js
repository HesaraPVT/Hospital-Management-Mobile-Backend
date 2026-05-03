const Report = require('../models/report.model');
const Appointment = require('../models/appointment.model');
const Payment = require('../models/payment.model');
const Doctor = require('../models/doctor.model');
const asyncHandler = require('../utils/asyncHandler');
const { generateReportData } = require('../services/report.service');

const titleFor = (reportType) => {
  if (reportType === 'appointments') return 'Appointment Report';
  if (reportType === 'revenue') return 'Revenue Report';
  if (reportType === 'doctor_performance') return 'Doctor Performance Report';
  return 'Report';
};

exports.generateReport = asyncHandler(async (req, res) => {
  const { reportType } = req.body;

  if (!reportType) {
    return res.status(400).json({ message: 'reportType is required' });
  }

  const data = await generateReportData(reportType);

  const report = await Report.create({
    generatedBy: req.user._id,
    reportType,
    title: titleFor(reportType),
    data,
  });

  res.status(201).json(report);
});

exports.getReports = asyncHandler(async (req, res) => {
  const reports = await Report.find({})
    .sort({ createdAt: -1 })
    .populate('generatedBy', '-password');
  res.status(200).json(reports);
});

exports.getReportById = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id).populate('generatedBy', '-password');
  if (!report) return res.status(404).json({ message: 'Report not found' });
  res.status(200).json(report);
});

exports.deleteReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) return res.status(404).json({ message: 'Report not found' });

  await report.deleteOne();
  res.status(200).json({ message: 'Report deleted successfully' });
});
