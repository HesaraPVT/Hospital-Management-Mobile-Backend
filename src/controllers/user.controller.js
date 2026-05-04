const User = require('../models/user.model');
const asyncHandler = require('../utils/asyncHandler');
const bcrypt = require('bcryptjs');

exports.getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password');
  res.status(200).json(users);
});

exports.createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: 'Email is already registered' });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: role || 'patient',
  });

  const userResponse = await User.findById(user._id).select('-password');
  res.status(201).json(userResponse);
});

exports.getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const user = await User.findById(id).select('-password');
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.status(200).json(user);
});

exports.updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const updates = {
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    address: req.body.address,
    profileImage: req.body.profileImage,
  };

  const user = await User.findByIdAndUpdate(id, updates, { new: true }).select('-password');
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.status(200).json(user);
});

exports.deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Allow users to delete their own profile OR admin to delete any user
  if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  await User.deleteOne({ _id: id });
  res.status(200).json({ message: 'User deleted successfully' });
});
