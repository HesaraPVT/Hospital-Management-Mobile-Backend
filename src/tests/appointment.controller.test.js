jest.mock('../models/appointment.model', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../models/doctor.model', () => ({
  findById: jest.fn(),
}));

jest.mock('../models/service.model', () => ({
  findById: jest.fn(),
}));

const Appointment = require('../models/appointment.model');
const Doctor = require('../models/doctor.model');
const Service = require('../models/service.model');

const { createAppointment } = require('../controllers/appointment.controller');

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('appointment.controller createAppointment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects booking when doctor is not available', async () => {
    Doctor.findById.mockResolvedValue({ _id: 'doc1', availabilityStatus: false });
    Service.findById.mockResolvedValue({ _id: 'srv1', availabilityStatus: true });

    const req = {
      user: { _id: 'user1' },
      body: {
        doctorId: 'doc1',
        serviceId: 'srv1',
        appointmentDate: '2026-04-10',
        appointmentTime: '10:00',
        notes: 'test',
      },
    };
    const res = createRes();
    const next = jest.fn();

    await createAppointment(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Selected doctor is not available' });
    expect(Appointment.findOne).not.toHaveBeenCalled();
  });

  it('prevents double booking (409 when slot already booked)', async () => {
    Doctor.findById.mockResolvedValue({ _id: 'doc1', availabilityStatus: true });
    Service.findById.mockResolvedValue({ _id: 'srv1', availabilityStatus: true });
    Appointment.findOne.mockResolvedValue({ _id: 'existing' });

    const req = {
      user: { _id: 'user1' },
      body: {
        doctorId: 'doc1',
        serviceId: 'srv1',
        appointmentDate: '2026-04-10',
        appointmentTime: '10:00',
        notes: 'test',
      },
    };
    const res = createRes();
    const next = jest.fn();

    await createAppointment(req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: 'Selected slot is already booked for this doctor' });
    expect(Appointment.create).not.toHaveBeenCalled();
  });

  it('creates appointment when slot is free', async () => {
    Doctor.findById.mockResolvedValue({ _id: 'doc1', availabilityStatus: true });
    Service.findById.mockResolvedValue({ _id: 'srv1', availabilityStatus: true });
    Appointment.findOne.mockResolvedValue(null);
    Appointment.create.mockResolvedValue({ _id: 'app1', userId: 'user1' });

    const req = {
      user: { _id: 'user1' },
      body: {
        doctorId: 'doc1',
        serviceId: 'srv1',
        appointmentDate: '2026-04-10',
        appointmentTime: '10:00',
        notes: 'test',
      },
    };
    const res = createRes();
    const next = jest.fn();

    await createAppointment(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ _id: 'app1', userId: 'user1' });
    expect(Appointment.create).toHaveBeenCalled();
  });
});

