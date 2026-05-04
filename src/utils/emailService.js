const nodemailer = require('nodemailer');

// Lazy-init transporter — reads env vars at call time (important for Render/cloud deploys)
const createTransporter = () =>
  nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Use SSL/TLS directly
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

// Send password reset email
const sendResetEmail = async (email, resetLink) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset Request - MediLink',
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #f0f7fb; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #0d6b99; padding-bottom: 20px;">
            <h2 style="color: #0a2e40; margin: 0 0 5px 0;">MediLink</h2>
            <p style="color: #4a6170; margin: 5px 0 0 0; font-size: 14px;">Password Reset Request</p>
          </div>

          <p style="color: #0a2e40; font-size: 16px; margin-bottom: 15px;">
            Hello,
          </p>

          <p style="color: #4a6170; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
            We received a request to reset your password. Click the button below to create a new password. This link will expire in 1 hour.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #0d6b99; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; font-size: 14px;">
              Reset Your Password
            </a>
          </div>

          <p style="color: #4a6170; font-size: 13px; margin: 20px 0; line-height: 1.6;">
            <strong>Or copy this link:</strong><br/>
            <span style="word-break: break-all; color: #0d6b99;">${resetLink}</span>
          </p>

          <hr style="border: none; border-top: 1px solid #eef4f8; margin: 20px 0;">

          <p style="color: #7a99a8; font-size: 12px; margin: 15px 0;">
            If you didn't request a password reset, please ignore this email or contact our support team.
          </p>

          <p style="color: #7a99a8; font-size: 12px; margin: 10px 0;">
            <strong>For security:</strong> Never share your reset link with anyone.
          </p>

          <div style="text-align: center; margin-top: 30px; color: #7a99a8; font-size: 12px; border-top: 1px solid #eef4f8; padding-top: 15px;">
            <p>MediLink Healthcare Solutions</p>
            <p>&copy; 2026 All rights reserved.</p>
          </div>

        </div>
      </div>
    `,
  };

  try {
    console.log(`📧 Attempting to send email to: ${email}`);
    const transporter = createTransporter();
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${email}`);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error(`❌ Email send error for ${email}:`, error.message);
    throw new Error(`Email delivery failed: ${error.message}`);
  }
};

module.exports = {
  sendResetEmail,
};
