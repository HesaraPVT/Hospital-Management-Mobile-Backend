const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const User = require('../models/user.model');
const generateToken = require('../utils/generateToken');
const asyncHandler = require('../utils/asyncHandler');
const { sendResetEmail } = require('../utils/emailService');

const logFile = process.cwd() + '/debug.log';

const debugLog = (msg) => {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `[${timestamp}] ${msg}\n`);
};

exports.registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: 'Email is already registered' });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  let role = 'patient';
  if (req.body.role && ['patient', 'doctor', 'admin'].includes(req.body.role)) {
    role = req.body.role;
  } else {
    // Bootstrap for academic demos: if no admin exists, create the first account as admin.
    const adminExists = await User.exists({ role: 'admin' });
    if (!adminExists) role = 'admin';
  }

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
  });

  const token = generateToken(user._id);

  res.status(201).json({
    token,
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    address: user.address,
    profileImage: user.profileImage,
  });
});

exports.loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = generateToken(user._id);

  res.status(200).json({
    token,
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    address: user.address,
    profileImage: user.profileImage,
  });
});

exports.getMe = asyncHandler(async (req, res) => {
  const user = req.user;
  res.status(200).json(user);
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  debugLog(`🔄 FORGOT PASSWORD REQUEST - Email: ${email}`);

  if (!email) {
    debugLog('❌ No email provided');
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const user = await User.findOne({ email });
    debugLog(`User found: ${user ? user.email : 'NOT FOUND'}`);
    
    if (!user) {
      debugLog('❌ User not found');
      return res.status(404).json({ message: 'No user found with this email' });
    }

    // Generate reset token
    debugLog('🔐 Generating reset token...');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Save token to database with 1 hour expiration
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();
    debugLog('✅ Token saved in database');

    // Create reset link
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&email=${email}`;
    debugLog('📧 Reset link created, sending email...');

    await sendResetEmail(email, resetLink);
    
    debugLog('✅ Email sent successfully!');
    
    res.status(200).json({
      message: 'Password reset link sent to your email. Please check your inbox.',
    });
  } catch (error) {
    debugLog(`❌ ERROR IN FORGOT PASSWORD - ${error.message}`);
    debugLog(`Error stack: ${error.stack}`);
    
    // Clear token if email fails to send
    try {
      const user = await User.findOne({ email });
      if (user) {
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();
      }
    } catch (cleanupError) {
      debugLog(`Cleanup error: ${cleanupError.message}`);
    }

    return res.status(500).json({ 
      message: 'Failed to send email. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { email, token, newPassword, confirmPassword } = req.body;

  if (!email || !token || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Hash the token to compare
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Check if token matches and hasn't expired
  if (user.resetPasswordToken !== hashedToken) {
    return res.status(400).json({ message: 'Invalid reset token' });
  }

  if (Date.now() > user.resetPasswordExpires) {
    return res.status(400).json({ message: 'Reset token has expired. Please request a new one.' });
  }

  // Hash new password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  // Update password and clear reset token
  user.password = hashedPassword;
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  await user.save();

  res.status(200).json({
    message: 'Password has been reset successfully. You can now login with your new password.',
  });
});
