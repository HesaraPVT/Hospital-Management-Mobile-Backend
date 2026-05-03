jest.mock('../models/appointment.model', () => ({
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../models/payment.model', () => ({
  find: jest.fn(),
}));

jest.mock('../models/doctor.model', () => ({
  find: jest.fn(),
}));

const Appointment = require('../models/appointment.model');
const Payment = require('../models/payment.model');
const Doctor = require('../models/doctor.model');
const { generateReportData } = require('../services/report.service');

describe('report.service generateReportData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates appointments report with status counts', async () => {
    Appointment.countDocuments.mockResolvedValue(10);
    Appointment.aggregate.mockResolvedValue([
      { _id: 'approved', count: 3 },
      { _id: 'pending', count: 5 },
      // rejected intentionally missing to ensure default 0
    ]);

    const result = await generateReportData('appointments');
    expect(result).toEqual({
      totalAppointments: 10,
      approvedCount: 3,
      pendingCount: 5,
      rejectedCount: 0,
    });
  });

  it('generates revenue report totalCompletedPayments and totalRevenue', async () => {
    Payment.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([{ amount: 100 }, { amount: 50 }, { amount: 'abc' }]),
    });

    const result = await generateReportData('revenue');
    expect(result.totalCompletedPayments).toBe(3);
    expect(result.totalRevenue).toBe(150);
  });

  it('generates doctor_performance report (appointments per doctor)', async () => {
    const doctorId1 = 'd1';
    const doctorId2 = 'd2';

    Appointment.aggregate.mockResolvedValue([
      { _id: doctorId1, appointmentCount: 2 },
      { _id: doctorId2, appointmentCount: 1 },
    ]);

    Doctor.find.mockResolvedValue([
      { _id: doctorId1, name: 'Doc One', specialization: 'Cardiology' },
      { _id: doctorId2, name: 'Doc Two', specialization: 'Orthopedics' },
    ]);

    // report.service calls Doctor.find(...).select(...)
    Doctor.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([
        { _id: doctorId1, name: 'Doc One', specialization: 'Cardiology' },
        { _id: doctorId2, name: 'Doc Two', specialization: 'Orthopedics' },
      ]),
    });

    const result = await generateReportData('doctor_performance');
    expect(result).toEqual([
      {
        doctorId: doctorId1,
        doctorName: 'Doc One',
        specialization: 'Cardiology',
        appointmentCount: 2,
      },
      {
        doctorId: doctorId2,
        doctorName: 'Doc Two',
        specialization: 'Orthopedics',
        appointmentCount: 1,
      },
    ]);
  });
});

