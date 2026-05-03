jest.mock('../models/complaint.model', () => ({
  findById: jest.fn(),
}));

const Complaint = require('../models/complaint.model');
const { updateComplaintStatus } = require('../controllers/complaint.controller');

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('complaint.controller updateComplaintStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects non-admin (403)', async () => {
    Complaint.findById.mockResolvedValue({
      _id: 'c1',
      userId: 'u1',
      status: 'submitted',
      save: jest.fn(),
    });

    const req = {
      user: { _id: 'u1', role: 'patient' },
      params: { id: 'c1' },
      body: { status: 'resolved', adminReply: 'ok' },
    };
    const res = createRes();
    const next = jest.fn();

    await updateComplaintStatus(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
  });

  it('rejects invalid status (400)', async () => {
    Complaint.findById.mockResolvedValue({
      _id: 'c1',
      userId: 'u1',
      status: 'submitted',
      save: jest.fn(),
    });

    const req = {
      user: { _id: 'admin1', role: 'admin' },
      params: { id: 'c1' },
      body: { status: 'bad' },
    };
    const res = createRes();
    const next = jest.fn();

    await updateComplaintStatus(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid status' });
  });
});

