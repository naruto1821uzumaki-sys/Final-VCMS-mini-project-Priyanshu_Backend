const nodemailer = require('nodemailer');

// Create email transporter for real emails (Gmail)
const createEmailTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    throw new Error('EMAIL_USER and EMAIL_PASSWORD must be set in server/.env');
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    }
  });
};

// Email OTP Store
const emailOtpStore = new Map();

// Send OTP via Email (Real Email)
const sendEmailOtp = async (email) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiryTime = Date.now() + 10 * 60 * 1000;

  emailOtpStore.set(email, { code: otp, expiresAt: expiryTime });

  try {
    const transporter = createEmailTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_USER || 'vcmsdemo.project@gmail.com',
      to: email,
      subject: '🔐 Virtual Clinic - Password Reset OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h2 style="margin: 0;">Virtual Clinic Management System</h2>
            <p style="margin: 5px 0 0;">Password Reset Request</p>
          </div>
          <div style="padding: 20px; background: #f5f5f5; border-radius: 0 0 8px 8px;">
            <p>Hello,</p>
            <p>You requested to reset your password. Your OTP code is:</p>
            <div style="background: white; border: 3px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 8px; text-align: center;">
              <h1 style="color: #667eea; letter-spacing: 5px; font-size: 36px; margin: 0;">${otp}</h1>
            </div>
            <p style="color: #666;"><strong>⏱️ Valid for:</strong> 10 minutes</p>
            <p style="color: #999; font-size: 12px; margin-top: 20px;">If you didn't request this, please ignore this email.</p>
          </div>
        </div>
      `
    });
    console.log(`✅ Real email OTP sent to ${email}: ${otp}`);
    return otp;
  } catch (error) {
    console.error(`❌ Email failed for ${email}:`, error.message);
    console.error('⚠️  SOLUTION: Set up your Gmail App Password in server/.env');
    console.error('📖 Guide: https://myaccount.google.com/apppasswords');
    throw new Error('Email configuration error. Please set up Gmail App Password in server/.env');
  }
};

// Verify Email OTP
const verifyEmailOtp = (email, code) => {
  const storedOtp = emailOtpStore.get(email);

  if (!storedOtp) {
    return { success: false, message: 'OTP not found' };
  }

  if (Date.now() > storedOtp.expiresAt) {
    emailOtpStore.delete(email);
    return { success: false, message: 'OTP expired' };
  }

  if (storedOtp.code !== code.toString()) {
    return { success: false, message: 'Invalid OTP' };
  }

  storedOtp.verified = true;
  storedOtp.expiresAt = Date.now() + 5 * 60 * 1000;

  return { success: true, message: 'OTP verified' };
};

// Clear Email OTP
const clearEmailOtp = (email) => {
  emailOtpStore.delete(email);
};

module.exports = {
  emailOtpStore,
  sendEmailOtp,
  verifyEmailOtp,
  clearEmailOtp
};
