const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { users, students } = require('./db');
const PDFDocument = require('pdfkit');
const axios = require('axios');
const crypto = require('crypto');

const mongoose = require('mongoose');
const Student = require('./models/Student');
const User = require('./models/User');
const Request = require('./models/Request');
const Setting = require('./models/Setting');
const FeePlan = require('./models/FeePlan');
const LateralEntryStudent = require('./models/LateralEntryStudent');
const AcademicYearStatus = require('./models/AcademicYearStatus');
const AdmissionConfirmation = require('./models/AdmissionConfirmation');
const FeePayment = require('./models/FeePayment');
const PromotionHistory = require('./models/PromotionHistory');
const Notification = require('./models/Notification');
const DocumentRecord = require('./models/DocumentRecord');
const Department = require('./models/Department');
const Batch = require('./models/Batch');
const Admission = require('./models/Admission');
const StudentCredential = require('./models/StudentCredential');
const OfficeUser = require('./models/OfficeUser');
const LoginLog = require('./models/LoginLog');
const FaceAuthentication = require('./models/FaceAuthentication');
const {
  getCurrentAcademicYear,
  getNextAcademicYear,
  getStudyYear,
  getAcademicYearForStudyYear,
  getSemesterForYear,
  calculateFeeBreakup,
  ensureLifecycleForStudent,
  ensureLifecycleForApprovedStudents,
  syncAcademicStatus,
  createNotification,
  toObjectId
} = require('./lifecycleService');

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'super-secret-gecm-key-2026');
if (process.env.NODE_ENV === 'production' && (!process.env.MONGO_URI || !JWT_SECRET)) {
  throw new Error('Production requires MONGO_URI and JWT_SECRET environment variables.');
}
const isAdmissionFeeRecord = (payment) =>
  String(payment?.paymentMode || '').trim().toLowerCase() === 'admission record' ||
  /^ADMISSION-/i.test(String(payment?.transactionId || '')) ||
  /^admission fee collected/i.test(String(payment?.remarks || ''));

app.use(cors());
app.use(express.json({ limit: '8mb' }));

// Connect to MongoDB
const initializeDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/major');
    console.log('✅ Connected to MongoDB successfully');
    await seedSettings();
    await migrateLegacyLateralStudents();
  } catch (err) {
    if (process.env.NODE_ENV === 'production') throw err;
    console.warn('⚠️ MongoDB is not available. The app will continue in fallback/mock mode. Start MongoDB to enable database-backed features.');
    console.warn(err.message || err);
  }
};
initializeDatabase().catch((error) => {
  console.error('Database initialization failed:', error.message || error);
  process.exit(1);
});

// Built-in mock OTP storage
const loginAttempts = new Map();

const auditLogin = (entry) => LoginLog.create(entry).catch(() => {});
const loginThrottle = (key) => {
  const now = Date.now();
  const record = loginAttempts.get(key) || { count: 0, resetAt: now + 15 * 60 * 1000 };
  if (record.resetAt <= now) { record.count = 0; record.resetAt = now + 15 * 60 * 1000; }
  if (record.count >= 5) return true;
  record.count += 1;
  loginAttempts.set(key, record);
  return false;
};
const clearLoginThrottle = (key) => loginAttempts.delete(key);

// Dedicated authentication endpoints. Legacy login remains for backwards compatibility.
app.post('/api/auth/student/login', async (req, res) => {
  const studentId = String(req.body.studentId || req.body.username || '').trim();
  const password = String(req.body.password || '');
  const throttleKey = `student:${studentId}:${req.ip}`;
  if (!studentId || !password) return res.status(400).json({ error: 'Student ID and password are required' });
  if (loginThrottle(throttleKey)) return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
  try {
    const student = await Student.findOne({ $or: [{ studentId }, { 'credentials.username': studentId }] });
    if (!student || student.credentials?.isActive === false || student.studentStatus === 'Rejected' || !(await student.comparePassword(password))) {
      auditLogin({ userId: studentId, userType: 'student', role: 'student', action: 'LOGIN_FAILED', loginStatus: 'failed', ipAddress: req.ip });
      return res.status(401).json({ error: 'Invalid Student ID or password' });
    }
    clearLoginThrottle(throttleKey);
    const token = jwt.sign({ id: student._id, role: 'student', studentId: student.studentId }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });
    auditLogin({ userId: String(student._id), userType: 'student', role: 'student', action: 'LOGIN_SUCCESS', loginStatus: 'success', ipAddress: req.ip });
    return res.json({ token, user: { id: student._id, studentId: student.studentId, name: student.personalDetails.studentName, role: 'student' }, requiresPasswordChange: student.credentials?.passwordChangeRequired === true, faceRegistered: Boolean(student.securityDetails?.faceEmbedding?.length) });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to sign in at this time' });
  }
});

app.post('/api/auth/office/login', async (req, res) => {
  const username = String(req.body.username || req.body.employeeId || '').trim();
  const password = String(req.body.password || '');
  const throttleKey = `office:${username}:${req.ip}`;
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
  if (loginThrottle(throttleKey)) return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
  try {
    const user = await OfficeUser.findOne({ $or: [{ username }, { employeeId: username }, { email: username }] }).select('+passwordHash');
    if (!user || user.accountStatus !== 'Active' || !(await user.comparePassword(password))) {
      auditLogin({ userId: username, userType: 'office', action: 'LOGIN_FAILED', loginStatus: 'failed', ipAddress: req.ip });
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    clearLoginThrottle(throttleKey);
    const token = jwt.sign({ id: user._id, role: user.role, employeeId: user.employeeId }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });
    auditLogin({ userId: String(user._id), userType: 'office', role: user.role, action: 'LOGIN_SUCCESS', loginStatus: 'success', ipAddress: req.ip });
    return res.json({ token, user: { id: user._id, employeeId: user.employeeId, name: user.name, role: user.role, branch: user.branch }, redirectTo: user.role === 'admin' ? '/admin/dashboard' : user.role === 'hod' ? '/hod/dashboard' : '/principal/dashboard', requiresPasswordChange: user.firstLogin });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to sign in at this time' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const payload = token ? jwt.verify(token, JWT_SECRET) : null;
    if (payload) auditLogin({ userId: String(payload.id), userType: payload.role === 'student' ? 'student' : 'office', role: payload.role, action: 'LOGOUT', loginStatus: 'success', ipAddress: req.ip });
  } catch (_) { /* Logout remains safe even after an expired token. */ }
  res.status(204).end();
});

// --- AUTH ROUTES ---

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password, role, branch } = req.body;
  
  if (role === 'student') {
    try {
      // Student ID is the login username. CET fallback keeps previously enrolled accounts accessible.
      const student = await Student.findOne({ $or: [{ studentId: email }, { 'credentials.username': email }, { 'personalDetails.cetNumber': email }] });
      if (student) {
        const isMatch = await student.comparePassword(password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
        
        const token = jwt.sign({ id: student._id, role: 'student' }, JWT_SECRET, { expiresIn: '1d' });
        return res.json({
          token,
          user: { id: student._id, username: student.studentId || student.personalDetails.studentName, role: 'student', email: student.contactDetails.email }
        });
      }

      // Lateral-entry students receive the same Student ID based login.
      const lateralStudent = await LateralEntryStudent.findOne({ $or: [{ studentId: email }, { 'credentials.username': email }] }).select('+passwordHash');
      if (lateralStudent) {
        const isMatch = await lateralStudent.comparePassword(password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
        const token = jwt.sign({ id: lateralStudent._id, role: 'student', studentType: 'lateral' }, JWT_SECRET, { expiresIn: '1d' });
        return res.json({
          token,
          user: { id: lateralStudent._id, username: lateralStudent.studentId, role: 'student', email: lateralStudent.email }
        });
      }
    } catch (error) {
      console.log('MongoDB login query failed, falling back to mock users.');
    }
    
    // Fallback: Check mock 'users' array for a student credential
    const fallbackUser = users.find(u => (u.username === email || u.email === email) && u.role === 'student');
    if (fallbackUser) {
      const isMatch = bcrypt.compareSync(password, fallbackUser.passwordHash);
      if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
      const token = jwt.sign({ id: fallbackUser.id, role: 'student' }, JWT_SECRET, { expiresIn: '1d' });
      return res.json({
        token,
        user: { id: fallbackUser.id, username: fallbackUser.username, role: 'student', email: fallbackUser.email }
      });
    }

    return res.status(401).json({ error: 'Student profile not found' });
  }

  // Handle Staff, HOD, Principal via MongoDB User model
  try {
    const user = await User.findOne({ $or: [{ email }, { username: email }], role });
    if (!user) throw new Error('User not found in MongoDB');

    if (role === 'HOD' && user.branch !== branch) {
      return res.status(401).json({ error: 'Invalid branch for this HOD' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role, branch: user.branch }, JWT_SECRET, { expiresIn: '1d' });
    
    res.json({
      token,
      user: { id: user._id, name: user.name, role: user.role, email: user.email, branch: user.branch }
    });
  } catch (error) {
    // console.log(`No ${role} found in MongoDB with that email. Checking fallback mock data...`);
    const fallbackUser = users.find(u => (u.username === email || u.email === email) && u.role.toLowerCase() === role.toLowerCase());
    
    if (fallbackUser) {
      if (role === 'HOD' && fallbackUser.branch !== branch) {
        return res.status(401).json({ error: 'Invalid branch for this HOD' });
      }

      const isMatch = bcrypt.compareSync(password, fallbackUser.passwordHash);
      if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
      
      const token = jwt.sign({ id: fallbackUser.id, role: fallbackUser.role, branch: fallbackUser.branch || 'None' }, JWT_SECRET, { expiresIn: '1d' });
      return res.json({
        token,
        user: { id: fallbackUser.id, name: fallbackUser.username, role: fallbackUser.role, email: fallbackUser.email, branch: fallbackUser.branch || 'None' }
      });
    }

    return res.status(401).json({ error: 'Invalid credentials or role' });
  }
});

// --- OTP & EMAIL SYSTEM STORES ---
const otpStore = new Map(); // email -> { otpHash, expiresAt, attempts, used, resendAvailableAt }
const rateLimitMap = new Map(); // email -> [timestamps]
const verifiedEmails = new Map(); // email -> { verifiedAt }

function maskEmail(emailStr) {
  if (!emailStr || !emailStr.includes('@')) return emailStr;
  const [local, domain] = emailStr.trim().split('@');
  if (local.length <= 2) {
    return `${local.charAt(0)}*@${domain}`;
  }
  const maskedLocal = local.charAt(0) + '*'.repeat(Math.max(3, local.length - 2)) + local.charAt(local.length - 1);
  return `${maskedLocal}@${domain}`;
}

function isRateLimited(email) {
  const now = Date.now();
  const history = rateLimitMap.get(email) || [];
  const validHistory = history.filter(timestamp => now - timestamp < 15 * 60 * 1000);
  rateLimitMap.set(email, validHistory);
  return validHistory.length >= 3;
}

function recordOtpRequest(email) {
  const history = rateLimitMap.get(email) || [];
  history.push(Date.now());
  rateLimitMap.set(email, history);
}

const { Resend } = require('resend');

async function sendTransactionalEmail({ to, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return { success: false, configured: false };
  }

  try {
    const resend = new Resend(apiKey.trim());
    const from = process.env.EMAIL_FROM || 'GECM Portal <onboarding@resend.dev>';
    
    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject,
      text,
      html
    });

    if (error) {
      console.error('[RESEND API ERROR]', error);
      throw new Error(error.message || 'Resend email delivery failed');
    }

    return { success: true, messageId: data ? data.id : 'Sent', provider: 'Resend SDK' };
  } catch (err) {
    console.error('[RESEND FAILURE]', err.message);
    throw err;
  }
}

// 1. Send OTP Route
app.post('/api/auth/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email || !email.trim() || !email.includes('@')) {
    return res.status(400).json({ success: false, error: 'A valid email address is required.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  // Rate Limiting (max 3 per 15 minutes)
  if (isRateLimited(cleanEmail)) {
    return res.status(429).json({ success: false, error: 'Too many OTP requests. Please try again after 15 minutes.' });
  }

  // 60s Resend Cooldown Check
  const existingRecord = otpStore.get(cleanEmail);
  if (existingRecord && Date.now() < existingRecord.resendAvailableAt) {
    const waitSecs = Math.ceil((existingRecord.resendAvailableAt - Date.now()) / 1000);
    return res.status(429).json({
      success: false,
      error: `Please wait ${waitSecs} seconds before requesting a new verification code.`
    });
  }

  // Cryptographically secure 6-digit random OTP
  const otp = crypto.randomInt(100000, 1000000).toString();
  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

  // Invalidate previous OTP and store new hashed OTP
  otpStore.set(cleanEmail, {
    otpHash,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    attempts: 0,
    used: false,
    resendAvailableAt: Date.now() + 60 * 1000 // 60s cooldown
  });

  recordOtpRequest(cleanEmail);

  console.log(`[EMAIL LOG] Initiating transactional email delivery for recipient: ${cleanEmail}`);

  try {
    const delivery = await sendTransactionalEmail({
      to: cleanEmail,
      subject: 'GECM Portal - Email Verification Code',
      text: `Hello,\n\nYour verification code for the GECM Portal is:\n\n${otp}\n\nThis verification code will expire in 5 minutes.\n\nPlease do not share this code with anyone.\n\nIf you did not request this verification code, you can safely ignore this email.\n\nRegards,\nGECM Portal Administration`,
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #ffffff; padding: 30px; border-radius: 16px; max-width: 520px; margin: 0 auto; border: 1px solid rgba(139, 92, 246, 0.3);">
          <h2 style="color: #a78bfa; margin-top: 0; font-size: 22px; text-align: center;">GECM Portal</h2>
          <p style="color: #e2e8f0; font-size: 15px;">Hello,</p>
          <p style="color: #cbd5e1; font-size: 15px;">Your verification code for the GECM Portal is:</p>
          
          <div style="background: rgba(139, 92, 246, 0.15); border: 1px dashed #8b5cf6; padding: 20px; border-radius: 12px; text-align: center; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #38bdf8; margin: 24px 0;">
            ${otp}
          </div>
          
          <p style="color: #cbd5e1; font-size: 14px;">This verification code will expire in <b>5 minutes</b>.</p>
          <p style="color: #94a3b8; font-size: 13px;">Please do not share this code with anyone.</p>
          <p style="color: #94a3b8; font-size: 13px;">If you did not request this verification code, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 24px 0;" />
          <p style="color: #64748b; font-size: 12px; margin-bottom: 0; text-align: center;">Regards,<br /><b>GECM Portal Administration</b></p>
        </div>
      `
    });

    if (!delivery.configured) {
      otpStore.delete(cleanEmail);
      console.warn(`[OTP ERROR] Resend email service is not configured in server/.env`);
      return res.status(535).json({
        success: false,
        error: 'Resend email service requires RESEND_API_KEY to be configured in server/.env.'
      });
    }

    console.log(`[EMAIL SUCCESS] Accepted by ${delivery.provider} for ${cleanEmail} | Message ID: ${delivery.messageId || 'Accepted'}`);

    return res.json({
      success: true,
      message: 'Verification code sent successfully.',
      maskedEmail: maskEmail(cleanEmail)
    });
  } catch (mailError) {
    console.error(`[EMAIL FAILURE] Failed to deliver OTP email to ${cleanEmail}:`, mailError.message || mailError);
    otpStore.delete(cleanEmail);

    return res.status(500).json({
      success: false,
      error: `We couldn't send the verification email: ${mailError.message || 'Delivery error'}`
    });
  }
});

// 2. Verify OTP Route
app.post('/api/auth/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ success: false, error: 'Email and verification code are required.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanOtp = String(otp).trim();

  if (!cleanOtp.match(/^\d{6}$/)) {
    return res.status(400).json({ success: false, error: 'Incorrect verification code. Please try again.' });
  }

  const record = otpStore.get(cleanEmail);
  if (!record) {
    return res.status(400).json({ success: false, error: 'This verification code has expired. Please request a new code.' });
  }

  if (record.used) {
    return res.status(400).json({ success: false, error: 'This verification code has already been used. Please request a new code.' });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(cleanEmail);
    return res.status(400).json({ success: false, error: 'This verification code has expired. Please request a new code.' });
  }

  if (record.attempts >= 5) {
    return res.status(429).json({ success: false, error: 'Too many attempts. Please request a new verification code later.' });
  }

  record.attempts += 1;

  const incomingHash = crypto.createHash('sha256').update(cleanOtp).digest('hex');

  if (incomingHash !== record.otpHash) {
    return res.status(400).json({ success: false, error: 'Incorrect verification code. Please try again.' });
  }

  // Mark as verified & invalidate OTP
  record.used = true;
  verifiedEmails.set(cleanEmail, { verifiedAt: Date.now() });
  otpStore.delete(cleanEmail);

  console.log(`[OTP VERIFIED] Email ${cleanEmail} verified successfully.`);

  return res.json({
    success: true,
    message: 'Email verified successfully.'
  });
});

// 3. Test Email Route for Step 6 Debugging
app.post('/api/auth/test-email', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, error: 'Recipient email address is required.' });

  try {
    const delivery = await sendTransactionalEmail({
      to: email.trim(),
      subject: 'GECM Portal Email Service Test',
      text: 'This is a test email from the GECM Portal. Email delivery is working properly.',
      html: '<h3>GECM Portal Email Service Test</h3><p>This is a test email from the GECM Portal. Email delivery is working properly.</p>'
    });

    if (!delivery.configured) {
      return res.status(535).json({
        success: false,
        error: 'Transactional email service is not configured. Set RESEND_API_KEY (or SENDGRID_API_KEY, BREVO_API_KEY, or SMTP credentials) in server/.env.'
      });
    }

    console.log(`[TEST EMAIL SENT] To: ${email} | Provider: ${delivery.provider} | MessageID: ${delivery.messageId}`);
    return res.json({ success: true, message: `Test email accepted by ${delivery.provider} for ${email}. Message ID: ${delivery.messageId}` });
  } catch (error) {
    console.error(`[TEST EMAIL FAILED] To: ${email} | Error:`, error.message);
    return res.status(500).json({ success: false, error: `Email delivery failed: ${error.message}` });
  }
});

// Register New Member
app.post('/api/auth/register', (req, res) => {
  const { username, email, role, password, otp } = req.body;
  
  if (!username || !email || !role || !password || !otp) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Verify OTP
  const storedOtp = otpStore.get(email);
  if (!storedOtp || storedOtp !== otp) {
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }

  // Check existing
  if (users.find(u => u.username === username || u.email === email)) {
    return res.status(400).json({ error: 'Username or email already exists' });
  }

  const salt = bcrypt.genSaltSync(10);
  const newUser = {
    id: `u_${Date.now()}`,
    username,
    email,
    role,
    passwordHash: bcrypt.hashSync(password, salt),
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  otpStore.delete(email); // clean up

  res.status(201).json({ message: 'User registered successfully', user: { id: newUser.id, username } });
});

// Add New User (Mongoose DB)
app.post('/api/users/add', async (req, res) => {
  try {
    const { name, email, role, branch, password, otp } = req.body;
    
    if (!name || !email || !role || !password) {
      return res.status(400).json({ error: 'Name, email, role, and password are required' });
    }

    if (role === 'HOD' && !branch) {
      return res.status(400).json({ error: 'Branch is required for HOD role' });
    }

    // Verify OTP if provided (Optional but recommended)
    if (otp) {
      const storedOtp = otpStore.get(email);
      if (!storedOtp || storedOtp !== otp) {
        return res.status(400).json({ error: 'Invalid or expired OTP' });
      }
    }

    // Check existing
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const newUser = new User({
      name,
      email,
      role,
      branch: role === 'HOD' ? branch : 'None',
      password
    });

    await newUser.save();
    
    res.status(201).json({ message: 'User registered successfully', user: { id: newUser._id, name, role } });
  } catch (error) {
    console.error('Add User Error:', error);
    res.status(500).json({ error: 'Error saving user: ' + error.message });
  }
});

// --- USER MANAGEMENT ROUTES --- //

app.get('/api/users', (req, res) => {
  const safeUsers = users.map(u => ({ id: u.id, username: u.username, email: u.email, role: u.role, createdAt: u.createdAt }));
  res.json(safeUsers);
});

app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  if (users[idx].role === 'principal') return res.status(403).json({ error: 'Cannot delete principal account' });
  
  users.splice(idx, 1);
  res.json({ message: 'User deleted successfully' });
});

// Helper to verify token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(403).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized token' });
  }
};

const isOfficeReader = (role) => ['staff', 'office', 'principal', 'admin', 'hod'].includes(String(role || '').toLowerCase());
const isOfficeAdmin = (role) => ['staff', 'office', 'principal', 'admin', 'hod'].includes(String(role || '').toLowerCase());

const BRANCH_CODES = {
  CSE: 'CS', 'COMPUTER SCIENCE': 'CS', ECE: 'EC', 'ELECTRONICS & COMMUNICATION': 'EC',
  EEE: 'EE', ME: 'ME', MECHANICAL: 'ME', CE: 'CE', CIVIL: 'CE',
  'AI&DS': 'AD', 'AI & DS': 'AD', ISE: 'IS', 'INFORMATION SCIENCE': 'IS'
};

const getBranchCode = (branch = '') => BRANCH_CODES[String(branch).trim().toUpperCase()] || String(branch).replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase();
const getBatchLabel = (year) => `${year}-${String(Number(year) + 4).slice(-2)}`;
const makeInitialPassword = () => `Gecm@${crypto.randomBytes(4).toString('hex')}`;

async function syncStudentCredential({ studentId, username, initialPassword, studentRef, lateralRef }) {
  if (!studentId || !username) return;
  await StudentCredential.findOneAndUpdate(
    { studentId },
    {
      studentId,
      username,
      initialPassword,
      passwordChangeRequired: true,
      isActive: true,
      ...(studentRef ? { studentRef } : {}),
      ...(lateralRef ? { lateralRef } : {})
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function syncAdmissionRecord(payload) {
  const {
    studentId,
    studentRef,
    lateralRef,
    admissionNumber,
    admissionType = 'Regular',
    batch,
    batchYear,
    department,
    admissionYear,
    joiningSemester = 1,
    approvalStatus = 'Approved',
    admissionStatus,
    previousInstitution,
    previousUniversity
  } = payload;

  if (!studentId || !batch || !department) return;

  await Admission.findOneAndUpdate(
    { studentId },
    {
      studentId,
      studentRef,
      lateralRef,
      admissionNumber,
      admissionType,
      batch,
      batchYear: Number(batchYear || String(batch).slice(0, 4)),
      department,
      admissionYear: Number(admissionYear || batchYear || String(batch).slice(0, 4)),
      joiningSemester,
      approvalStatus,
      admissionStatus: admissionStatus || { previousYear: 'Inactive', currentYear: 'Active' },
      previousInstitution,
      previousUniversity
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function syncStudentRecords({ student, type = 'regular' }) {
  const isLateral = type === 'lateral';
  const studentId = student.studentId;
  const batchYear = isLateral ? student.admissionYear : student.admissionBatch;
  const branch = isLateral ? student.branch : student.academicDetails.branch;
  await Promise.all([
    syncStudentCredential({
      studentId,
      username: student.credentials?.username || studentId,
      initialPassword: student.credentials?.initialPassword,
      ...(isLateral ? { lateralRef: student._id } : { studentRef: student._id })
    }),
    syncAdmissionRecord({
      studentId,
      ...(isLateral ? { lateralRef: student._id } : { studentRef: student._id }),
      admissionNumber: student.admissionNumber,
      admissionType: isLateral ? 'Lateral Entry' : 'Regular',
      batch: isLateral ? student.academicBatch : getBatchLabel(batchYear),
      batchYear,
      department: branch,
      admissionYear: batchYear,
      joiningSemester: isLateral ? student.joiningSemester : student.semester,
      approvalStatus: isLateral ? 'Approved' : student.approvalStatus,
      admissionStatus: isLateral ? { previousYear: 'Inactive', currentYear: student.status } : student.admissionStatus,
      previousInstitution: isLateral ? student.previousCollege : undefined,
      previousUniversity: isLateral ? student.previousUniversity : undefined
    })
  ]);
}

// Idempotent transition: legacy documents become archive records that point to
// one permanent Student profile. New application code must query Student only.
async function migrateLegacyLateralStudents() {
  const legacyRecords = await LateralEntryStudent.find({ migratedStudentRef: { $exists: false } }).select('+passwordHash +credentials.initialPassword');
  for (const legacy of legacyRecords) {
    let student = await Student.findOne({ studentId: legacy.studentId });
    if (!student) {
      const hash = crypto.createHash('sha256').update(String(legacy._id)).digest('hex');
      const aadhaarNumber = `7${BigInt(`0x${hash.slice(0, 14)}`).toString().slice(-11).padStart(11, '0')}`;
      const temporaryPassword = legacy.credentials?.initialPassword || makeInitialPassword();
      student = new Student({
        studentId: legacy.studentId, admissionNumber: legacy.admissionNumber, admissionType: 'Lateral Entry', admissionBatch: legacy.admissionYear,
        approvalStatus: 'Approved', studentStatus: legacy.status || 'Active', admissionQuota: 'Lateral Entry', semester: legacy.joiningSemester || 3, currentStudyYear: legacy.directAdmissionYear || 2,
        personalDetails: { cetNumber: legacy.studentId, cetRank: legacy.diplomaPercentage || 0, studentName: legacy.studentName, dob: new Date('2000-01-01'), gender: 'Other', bloodGroup: 'Not Provided', religion: 'Not Provided', category: 'General', aadhaarNumber },
        familyDetails: { fatherName: 'Not Provided', motherName: 'Not Provided', parentContact: legacy.phone, fatherOccupation: 'Not Provided', motherOccupation: 'Not Provided', annualIncome: 0 },
        academicDetails: { qualifyingExam: legacy.previousQualification, board: 'Diploma Board', state: 'Not Provided', region: 'Not Provided', allottedCategory: 'General', branch: legacy.branch, year: legacy.directAdmissionYear || 2, feeCollected: legacy.paidFee || 0, percentage: legacy.diplomaPercentage || 0, diplomaMarks: legacy.diplomaPercentage || 0, lateralEntry: 'Yes' },
        contactDetails: { studentContact: legacy.phone, email: legacy.email, permanentAddress: 'Not Provided', correspondenceAddress: 'Not Provided' },
        securityDetails: { password: temporaryPassword, securityQuestion: 'Migration', securityAnswer: 'Migration' },
        credentials: { username: legacy.studentId, initialPassword: legacy.credentials?.initialPassword, passwordChangeRequired: legacy.credentials?.passwordChangeRequired !== false }, legacyPasswordHash: legacy.passwordHash,
        feeDetails: { totalFee: legacy.totalFee || 0, paidFee: legacy.paidFee || 0, pendingFee: Math.max(0, Number(legacy.totalFee || 0) - Number(legacy.paidFee || 0)) }, feeStatus: { previousYear: 'Completed', currentYear: legacy.feeStatus === 'Paid' ? 'Completed' : 'Pending' },
        lateralEntryDetails: { dcetNumber: legacy.universitySeatNumber, previousInstitution: legacy.previousCollege, previousUniversity: legacy.previousUniversity, joiningSemester: legacy.joiningSemester, diplomaPercentage: legacy.diplomaPercentage, documents: legacy.documents }
      });
      await student.save();
    }
    await syncStudentCredential({ studentId: student.studentId, username: student.studentId, initialPassword: legacy.credentials?.initialPassword, studentRef: student._id });
    await syncAdmissionRecord({ studentId: student.studentId, studentRef: student._id, admissionNumber: student.admissionNumber, admissionType: 'Lateral Entry', batch: legacy.academicBatch, batchYear: legacy.admissionYear, department: legacy.branch, admissionYear: legacy.admissionYear, joiningSemester: legacy.joiningSemester, approvalStatus: 'Approved', previousInstitution: legacy.previousCollege, previousUniversity: legacy.previousUniversity });
    legacy.migratedStudentRef = student._id;
    legacy.migratedAt = new Date();
    await legacy.save();
  }
}

// Register a New Student (From Admission Portal)
app.post('/api/students/register', async (req, res) => {
  try {
    const { personalDetails, familyDetails, academicDetails, contactDetails, securityDetails } = req.body;
    const studentId = String(req.body.studentId || '').trim().toUpperCase();
    if (!studentId) {
      return res.status(400).json({ error: 'Student ID / USN is required' });
    }
    
    // Check for existing student ID, CET, or Aadhaar
    const existing = await Student.findOne({ 
      $or: [
        { studentId },
        { 'personalDetails.cetNumber': personalDetails.cetNumber },
        { 'personalDetails.aadhaarNumber': personalDetails.aadhaarNumber }
      ]
    }) || await LateralEntryStudent.findOne({ studentId });

    if (existing) {
      return res.status(400).json({ error: 'A student with this Student ID, CET Number, or Aadhaar already exists.' });
    }

    // Verify OTP matching
    const storedOtp = otpStore.get(securityDetails.emailForOtp);
    if (!storedOtp || storedOtp !== securityDetails.emailOtp) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Create the virtual face profile during registration so recognition is available immediately.
    const faceSeed = personalDetails.cetNumber || personalDetails.aadhaarNumber || personalDetails.studentName;
    const registeredSecurityDetails = { ...securityDetails };
    let faceEmbedding = [];
    let faceImage = `virtual:${faceSeed}`;

    try {
      const faceResponse = await axios.post(
        'http://localhost:5001/extract',
        { virtualSeed: faceSeed },
        { timeout: 5000 }
      );
      faceEmbedding = faceResponse.data.embedding || [];
      faceImage = faceResponse.data.virtualImage || faceImage;
    } catch (faceError) {
      console.error('Virtual face service unavailable during registration:', faceError.message);
      const hashStr = crypto.createHash('sha256').update(String(faceSeed)).digest('hex');
      for (let i = 0; i < 512; i++) {
        const slice = hashStr.slice((i * 2) % hashStr.length, ((i * 2) % hashStr.length) + 2) || '00';
        faceEmbedding.push(((parseInt(slice, 16) / 255) * 2) - 1);
      }
    }

    registeredSecurityDetails.faceImageBase64 = faceImage;
    registeredSecurityDetails.faceEmbedding = faceEmbedding;
    registeredSecurityDetails.faceImages = [faceImage];

    const newStudent = new Student({
      studentId,
      personalDetails,
      familyDetails,
      academicDetails,
      contactDetails,
      securityDetails: registeredSecurityDetails,
      faceRegistered: true
    });

    await newStudent.save();
    otpStore.delete(securityDetails.emailForOtp); // clear otp

    res.status(201).json({ message: 'Admission details and virtual face profile registered successfully!' });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Error saving application: ' + error.message });
  }
});

function getBranchRegex(branchStr) {
  if (!branchStr || branchStr === 'All') return null;
  const b = String(branchStr).trim();
  const upper = b.toUpperCase();

  if (upper === 'CSE' || upper.includes('COMPUTER')) {
    return /Computer Science|CSE|^CS$/i;
  }
  if (upper === 'ECE' || upper.includes('ELECTRONIC')) {
    return /Electronic|ECE|^EC$/i;
  }
  if (upper === 'ME' || upper.includes('MECHANICAL')) {
    return /Mechanical|ME/i;
  }
  if (upper === 'CIVIL') {
    return /Civil/i;
  }
  if (upper === 'EEE' || upper.includes('ELECTRICAL')) {
    return /Electrical|EEE|^EE$/i;
  }
  if (upper.includes('AI') || upper.includes('ARTIFICIAL')) {
    return /AI|Artificial/i;
  }
  if (upper === 'ISE' || upper.includes('INFORMATION')) {
    return /Information|ISE|^IS$/i;
  }
  
  return new RegExp(b.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');
}

// Fetch all students (Admin/HOD views)
app.get('/api/students', verifyToken, async (req, res) => {
  try {
    const { search, filterMode, year, branch, gender, category, feeStatus, income, snqQuota, semester, section, admissionQuota, studentStatus, admissionType } = req.query;
    let query = {};

    if (admissionType === 'Lateral Entry') {
      query.$and = [{
        $or: [
          { admissionType: 'Lateral Entry' },
          { 'academicDetails.lateralEntry': 'Yes' }
        ]
      }];
    } else if (admissionType === 'Regular') {
      query.$and = [{
        $or: [
          { admissionType: 'Regular' },
          { admissionType: { $exists: false }, 'academicDetails.lateralEntry': { $ne: 'Yes' } }
        ]
      }];
    }
    
    // Branch isolation for HOD
    if (req.user.role === 'HOD') {
      const hRegex = getBranchRegex(req.user.branch);
      if (hRegex) {
        query.$or = [
          { 'academicDetails.branch': hRegex },
          { branch: hRegex },
          { course: hRegex },
          { department: hRegex }
        ];
      }
    }
    
    if (search && search.trim() !== '') {
      const reg = new RegExp(search.trim(), 'i');
      query.$or = [
        { 'personalDetails.studentName': reg },
        { 'personalDetails.cetNumber': reg },
        { 'personalDetails.aadhaarNumber': reg },
        { 'contactDetails.email': reg },
        { 'contactDetails.studentContact': reg },
        { studentId: reg },
        { admissionNumber: reg }
      ];
    }
    
    // Branch from query overrides filterMode if present, but HOD forced branch overrides everything
    const targetBranch = (req.user.role === 'HOD') ? req.user.branch : (branch && branch !== 'All' ? branch : (filterMode && filterMode !== 'All' ? filterMode : null));
    if (targetBranch) {
      const bRegex = getBranchRegex(targetBranch);
      query.$or = [
        { 'academicDetails.branch': bRegex },
        { branch: bRegex },
        { course: bRegex },
        { department: bRegex }
      ];
    }
    
    // Dynamic Filtering
    if (year && year !== 'All') {
      const yrNum = Number(year);
      query.$or = [{ 'academicDetails.year': yrNum }, { currentStudyYear: yrNum }, { year: yrNum }];
    }
    if (semester && semester !== 'All') {
      const semNum = Number(semester);
      query.$or = [{ semester: semNum }, { 'academicDetails.semester': semNum }];
    }
    if (section && section !== 'All') query.section = section;
    if (gender && gender !== 'All') query['personalDetails.gender'] = gender;
    if (category && category !== 'All') query['personalDetails.category'] = category;
    if (admissionQuota && admissionQuota !== 'All') query.admissionQuota = admissionQuota;
    if (studentStatus && studentStatus !== 'All') {
      query.$or = [{ studentStatus: studentStatus }, { status: studentStatus }];
    }
    if (feeStatus && feeStatus !== 'All') {
      if (feeStatus === 'Paid') {
        query.$or = [{ 'feeStatus.currentYear': 'Completed' }, { feePaid: true }, { 'feeDetails.pendingFee': 0 }];
      } else {
        query.$or = [{ 'feeStatus.currentYear': 'Pending' }, { feePaid: false }, { 'feeDetails.pendingFee': { $gt: 0 } }];
      }
    }
    if (snqQuota && snqQuota !== 'All') query['contactDetails.snqQuota'] = snqQuota;
    
    if (income && income !== 'All') {
      if (income === '< 1L') query['familyDetails.annualIncome'] = { $lt: 100000 };
      else if (income === '1L-5L') query['familyDetails.annualIncome'] = { $gte: 100000, $lte: 500000 };
      else if (income === '> 5L') query['familyDetails.annualIncome'] = { $gt: 500000 };
    }

    const studentsFound = await Student.find(query)
      .select('-securityDetails.password -securityDetails.faceEmbedding -securityDetails.faceImageBase64 -securityDetails.faceImages -documents -lateralEntryDetails.documents')
      .lean();
    res.json(studentsFound);
  } catch (error) {
    // Fallback if Mongo is down
    let results = students;
    if (req.query.admissionType === 'Lateral Entry' || req.query.admissionType === 'Regular') {
      const wantsLateral = req.query.admissionType === 'Lateral Entry';
      results = results.filter(student => {
        const isLateral = student.admissionType === 'Lateral Entry' || student.academicDetails?.lateralEntry === 'Yes';
        return isLateral === wantsLateral;
      });
    }
    if (req.query.search) {
      const q = req.query.search.toLowerCase();
      results = results.filter(s => (s.name || '').toLowerCase().includes(q) || (s.id || '').toLowerCase().includes(q));
    }
    const targetBranch = (req.user.role === 'HOD') ? req.user.branch : (req.query.branch && req.query.branch !== 'All' ? req.query.branch : (req.query.filterMode && req.query.filterMode !== 'All' ? req.query.filterMode : null));
    if (targetBranch) {
      const bRegex = getBranchRegex(targetBranch);
      results = results.filter(s => {
        const val = s.academicDetails?.branch || s.course || s.branch || s.department || '';
        return bRegex.test(val);
      });
    }
    if (req.query.year && req.query.year !== 'All') {
      results = results.filter(s => String(s.year) === String(req.query.year));
    }
    res.json(results);
  }
});

// Fetch Single Student
app.get('/api/students/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).select('-securityDetails.password');
    if (!student) throw new Error('Not Found in Mongo');
    res.json(student);
  } catch (error) {
    const fallbackStudent = students.find(s => s.id === req.params.id);
    if (fallbackStudent) return res.json(fallbackStudent);
    
    res.status(500).json({ error: 'Error fetching student' });
  }
});

// Update Student
app.put('/api/students/:id', async (req, res) => {
  try {
    const updated = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) throw new Error('Not found in mongo');
    res.json({ message: 'Student updated successfully', updated });
  } catch (error) {
    const idx = students.findIndex(s => s.id === req.params.id);
    if (idx !== -1) {
      students[idx] = { ...students[idx], ...req.body };
      return res.json({ message: 'Student updated successfully (Mock DB)', updated: students[idx] });
    }
    res.status(500).json({ error: 'Error updating student' });
  }
});

// Delete Student
app.delete('/api/students/:id', async (req, res) => {
  try {
    const deleted = await Student.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Student not found' });
    res.json({ message: 'Student removed from system' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting student' });
  }
});

// Get Student Stats
app.get('/api/stats', verifyToken, async (req, res) => {
  try {
    let matchStage = {};
    if (req.user.role === 'HOD') {
      matchStage['academicDetails.branch'] = req.user.branch;
    }

    const stats = await Student.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$academicDetails.year",
          count: { $sum: 1 }
        }
      }
    ]);

    const branchStats = await Student.aggregate([
      { $match: matchStage },
      { $group: { _id: { $ifNull: ['$academicDetails.branch', 'Unassigned'] }, count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } }
    ]);

    const yearBranchStats = await Student.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            year: { $ifNull: ['$academicDetails.year', '$currentStudyYear'] },
            branch: { $ifNull: ['$academicDetails.branch', 'Unassigned'] }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.branch': 1 } }
    ]);

    let total = 0;
    let year1 = 0;
    let year2 = 0;
    let year3 = 0;
    let year4 = 0;

    stats.forEach(stat => {
      total += stat.count;
      if (stat._id === 1) year1 = stat.count;
      else if (stat._id === 2) year2 = stat.count;
      else if (stat._id === 3) year3 = stat.count;
      else if (stat._id === 4) year4 = stat.count;
    });

    res.json({
      total,
      year1,
      year2,
      year3,
      year4,
      branchWiseStudents: branchStats.map(branch => ({ branch: branch._id, count: branch.count })),
      yearBranchStudents: yearBranchStats.map(item => ({
        year: item._id.year,
        branch: item._id.branch,
        count: item.count
      }))
    });
  } catch (error) {
    console.error('Stats Error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// --- NEW STUDENT APIs for Dashboard ---

// HOD API for fetching branch-wise students
app.get('/api/hod/students', verifyToken, async (req, res) => {
  try {
    if (String(req.user.role || '').toLowerCase() !== 'hod') {
      return res.status(403).json({ error: 'Access denied: HOD role required' });
    }
    
    const userBranch = req.user.branch || 'CSE';
    const branchCode = getBranchCode(userBranch) || 'CS';
    const branchRegex = new RegExp(`${userBranch}|${branchCode}`, 'i');

    let studentsFound = [];
    try {
      studentsFound = await Student.find({
        $or: [
          { 'academicDetails.branch': { $regex: branchRegex } },
          { course: { $regex: branchRegex } }
        ]
      }).select('-securityDetails.password');
    } catch (e) {}

    if (!studentsFound || studentsFound.length === 0) {
      studentsFound = students.filter(s => {
        const courseStr = String(s.course || s.academicDetails?.branch || '');
        return courseStr.toLowerCase().includes(userBranch.toLowerCase()) || 
               getBranchCode(courseStr) === branchCode;
      });
    }

    res.json(studentsFound);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch branch students' });
  }
});

// HOD API for dashboard stats
app.get('/api/hod/stats', verifyToken, async (req, res) => {
  try {
    if (String(req.user.role || '').toLowerCase() !== 'hod') {
      return res.status(403).json({ error: 'Access denied: HOD role required' });
    }
    
    const userBranch = req.user.branch || 'CSE';
    const branchCode = getBranchCode(userBranch) || 'CS';
    const branchRegex = new RegExp(`${userBranch}|${branchCode}`, 'i');

    let totalStudents = 0;
    try {
      totalStudents = await Student.countDocuments({
        $or: [
          { 'academicDetails.branch': { $regex: branchRegex } },
          { course: { $regex: branchRegex } }
        ]
      });
    } catch (e) {}

    if (totalStudents === 0) {
      totalStudents = students.filter(s => {
        const courseStr = String(s.course || s.academicDetails?.branch || '');
        return courseStr.toLowerCase().includes(userBranch.toLowerCase()) || 
               getBranchCode(courseStr) === branchCode;
      }).length;
    }
    
    res.json({ totalStudents, pendingRequests: 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch HOD stats' });
  }
});

// HOD API for pending requests
app.get('/api/requests', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'HOD') {
      return res.status(403).json({ error: 'Access denied: HOD role required' });
    }
    
    // Auto-seed some mock data for demonstration if none exist
    const count = await Request.countDocuments();
    if (count === 0) {
       await Request.insertMany([
         { studentName: 'Alice Johnson', studentId: '1MS21CS001', branch: req.user.branch, type: 'Leave', reason: 'Medical emergency for 2 days', status: 'Pending' },
         { studentName: 'Bob Smith', studentId: '1MS21CS002', branch: req.user.branch, type: 'Fee Extension', reason: 'Waiting for scholarship approval', status: 'Pending' },
         { studentName: 'Charlie Davis', studentId: '1MS21CS003', branch: req.user.branch, type: 'Document Approval', reason: 'Need signature on internship NOC', status: 'Approved' }
       ]);
    }

    const branch = req.user.branch;
    const requests = await Request.find({ branch }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

app.put('/api/requests/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'HOD') {
      return res.status(403).json({ error: 'Access denied: HOD role required' });
    }
    
    const { status } = req.body;
    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updated = await Request.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Request not found' });
    
    res.json({ message: `Request successfully ${status}`, request: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update request' });
  }
});


app.get('/api/student/dashboard', verifyToken, async (req, res) => {
  try {
    const student = req.user.studentType === 'lateral'
      ? await LateralEntryStudent.findById(req.user.id)
      : await Student.findById(req.user.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    if (req.user.studentType === 'lateral') {
      return res.json({
        name: student.studentName,
        cetNumber: student.studentId,
        branch: student.branch,
        admissionStatus: student.status,
        feeStatus: student.feeStatus,
        batch: student.academicBatch,
        academicYear: `${student.admissionYear}-${student.admissionYear + 1}`
      });
    }
    res.json({
      name: student.personalDetails.studentName,
      cetNumber: student.personalDetails.cetNumber,
      branch: student.academicDetails.branch,
      admissionStatus: student.admissionStatus?.currentYear || 'Active',
      feeStatus: student.feeStatus?.currentYear || 'Pending'
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/student/details', verifyToken, async (req, res) => {
  try {
    if (req.user.studentType === 'lateral') {
      const student = await LateralEntryStudent.findById(req.user.id);
      if (!student) return res.status(404).json({ error: 'Student not found' });
      // Keep the student dashboard view-only and expose a shape shared with regular admissions.
      return res.json({
        studentId: student.studentId,
        admissionNumber: student.admissionNumber,
        admissionBatch: student.academicBatch,
        personalDetails: { studentName: student.studentName },
        academicDetails: { branch: student.branch, qualifyingExam: student.previousQualification },
        contactDetails: { email: student.email, studentContact: student.phone },
        documents: {
          transferCertificate: Boolean(student.certificates?.transferCertificate),
          migrationCertificate: Boolean(student.certificates?.migrationCertificate),
          eligibilityCertificate: Boolean(student.certificates?.eligibilityCertificate)
        }
      });
    }
    const student = await Student.findById(req.user.id).select('-securityDetails.password -securityDetails.faceEmbedding -securityDetails.faceImageBase64 -securityDetails.faceImages');
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/student/documents/:documentType', verifyToken, async (req, res) => {
  try {
    if (String(req.user.role || '').toLowerCase() !== 'student' || req.user.studentType === 'lateral') {
      return res.status(403).json({ error: 'Document upload is available for regular student profiles.' });
    }
    const allowedTypes = ['aadhaar', 'marksCard', 'photo'];
    const { documentType } = req.params;
    const data = String(req.body.data || '');
    const mimeType = String(req.body.mimeType || '').toLowerCase();
    if (!allowedTypes.includes(documentType)) return res.status(400).json({ error: 'Unsupported document type.' });
    if (!/^data:(application\/pdf|image\/(jpeg|png));base64,/.test(data) || !['application/pdf', 'image/jpeg', 'image/png'].includes(mimeType)) {
      return res.status(400).json({ error: 'Upload a PDF, JPG, or PNG document.' });
    }
    const base64 = data.slice(data.indexOf(',') + 1);
    if (!base64 || Buffer.byteLength(base64, 'base64') > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Document must be 5 MB or smaller.' });
    }
    const student = await Student.findById(req.user.id);
    if (!student) return res.status(404).json({ error: 'Student not found.' });
    student.documents = { ...student.documents?.toObject?.(), [documentType]: data };
    await student.save();
    res.json({ documents: student.documents });
  } catch (error) {
    console.error('Student document upload failed:', error);
    res.status(500).json({ error: 'Unable to upload document.' });
  }
});

app.get('/api/student/status', verifyToken, async (req, res) => {
  try {
    if (req.user.studentType === 'lateral') {
      const student = await LateralEntryStudent.findById(req.user.id);
      if (!student) return res.status(404).json({ error: 'Student not found' });
      return res.json({
        previousYear: 'Inactive',
        currentYear: student.status || 'Active',
        yearWise: [{
          academicYear: student.academicBatch || `${student.admissionYear}-${student.admissionYear + 1}`,
          studyYear: student.directAdmissionYear || 2,
          semester: student.joiningSemester || 3,
          admissionStatus: student.status || 'Active'
        }]
      });
    }
    const student = await Student.findById(req.user.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    if (student.approvalStatus === 'Approved') {
      await ensureLifecycleForStudent(student, { userId: req.user.id });
    }

    const academicHistory = await AcademicYearStatus.find({ student: student._id })
      .sort({ studyYear: 1, academicYear: 1 })
      .lean();
    const currentStatus = student.approvalStatus === 'Approved'
      ? student.admissionStatus?.currentYear || student.studentStatus || 'Active'
      : student.approvalStatus || 'Pending';
    const yearWise = academicHistory.length > 0
      ? academicHistory.map(record => ({
        academicYear: record.academicYear,
        studyYear: record.studyYear,
        semester: record.semester,
        admissionStatus: record.admissionStatus,
        promotionStatus: record.promotionStatus,
        remarks: record.remarks
      }))
      : [{
        academicYear: student.currentAcademicYear || await getCurrentAcademicYear(),
        studyYear: student.currentStudyYear || student.academicDetails?.year || 1,
        semester: student.semester || null,
        admissionStatus: currentStatus,
        promotionStatus: student.studentStatus === 'Graduated' ? 'Graduated' : 'Not Started'
      }];

    res.json({
      previousYear: student.admissionStatus?.previousYear || 'Inactive',
      currentYear: currentStatus,
      yearWise
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/student/fee', verifyToken, async (req, res) => {
  try {
    if (req.user.studentType === 'lateral') {
      const student = await LateralEntryStudent.findById(req.user.id);
      if (!student) return res.status(404).json({ error: 'Student not found' });
      return res.json({ previousYear: 'Completed', currentYear: student.feeStatus || 'Pending' });
    }
    const student = await Student.findById(req.user.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const [annualFees, academicStatuses] = await Promise.all([
      FeePayment.find({ student: student._id }).sort({ studyYear: 1, academicYear: 1 }).lean(),
      AcademicYearStatus.find({ student: student._id }).select('academicYear studyYear semester').lean()
    ]);
    const academicByYear = new Map(academicStatuses.map((record) => [`${record.academicYear}:${Number(record.studyYear)}`, record]));
    const feeByYear = new Map();

    for (const fee of annualFees) {
      const key = `${fee.academicYear}:${Number(fee.studyYear)}`;
      const hasBreakdown = Number(fee.idpTuitionFee || fee.vtuAdmissionFee || fee.vtuInsuranceFee || fee.pdFee || fee.snqAdjustment) > 0;
      const totalFee = hasBreakdown
        ? Number(fee.idpTuitionFee || 0) + Number(fee.vtuAdmissionFee || 0) + Number(fee.vtuInsuranceFee || 0) + Number(fee.pdFee || 0) - Number(fee.snqAdjustment || 0)
        : Number(fee.totalFee || 0);
      feeByYear.set(key, { ...fee, totalFee, paidAmount: 0 });
    }

    const historyByYear = new Map();
    for (const payment of student.feeHistory || []) {
      if (!payment.academicYear || !Number(payment.studyYear) || Number(payment.studyYear) < 1 || Number(payment.studyYear) > 4) continue;
      if (String(payment.account || '').toUpperCase() === 'KEA' || isAdmissionFeeRecord(payment)) continue;
      const key = `${payment.academicYear}:${Number(payment.studyYear)}`;
      const history = historyByYear.get(key) || [];
      history.push(payment);
      historyByYear.set(key, history);
    }

    for (const [key, payments] of historyByYear) {
      if (!feeByYear.has(key)) {
        const [academicYear, studyYear] = key.split(':');
        feeByYear.set(key, { academicYear, studyYear: Number(studyYear), totalFee: 0, paidAmount: 0, payments: [] });
      }
      const fee = feeByYear.get(key);
      const historyPaid = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      // Match the office fee ledger: only payments in the student's fee history
      // for this exact academic year and study year count toward the displayed total.
      fee.paidAmount = historyPaid;
      fee.payments = [...(fee.payments || []), ...payments];
    }

    const yearWise = [...feeByYear.values()]
      .sort((a, b) => Number(a.studyYear) - Number(b.studyYear) || String(a.academicYear).localeCompare(String(b.academicYear)))
      .map((fee) => {
        const totalFee = Math.max(0, Number(fee.totalFee || 0));
        const paidFee = Math.max(0, Number(fee.paidAmount || 0));
        const pendingFee = Math.max(0, totalFee - paidFee);
        const latestPayment = (fee.payments || []).reduce((latest, payment) => !latest || new Date(payment.date || 0) > new Date(latest.date || 0) ? payment : latest, null);
        const academic = academicByYear.get(`${fee.academicYear}:${Number(fee.studyYear)}`);
        return {
          academicYear: fee.academicYear,
          studyYear: Number(fee.studyYear),
          semester: academic?.semester,
          totalFee,
          paidFee,
          pendingFee,
          paidOn: latestPayment?.date,
          status: totalFee <= 0 ? 'Not Set' : pendingFee === 0 ? 'Paid' : paidFee > 0 ? 'Partial' : 'Pending'
        };
      });

    const feeStatus = student.feeStatus?.toObject?.() || student.feeStatus || {};
    res.json({ ...feeStatus, yearWise });
  } catch (error) {
    console.error('Get student fee status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/student/edit-requests', verifyToken, async (req, res) => {
  try {
    if (String(req.user.role || '').toLowerCase() !== 'student') {
      return res.status(403).json({ error: 'Student access required' });
    }
    const message = String(req.body.message || '').trim();
    if (!message || message.length > 1000) {
      return res.status(400).json({ error: 'Please enter a message of 1 to 1000 characters.' });
    }
    const allowedFields = ['studentName', 'dob', 'gender', 'category', 'cetNumber', 'branch', 'qualifyingExam', 'fatherName', 'motherName', 'annualIncome', 'email', 'studentContact'];
    const requestedChanges = Object.fromEntries(Object.entries(req.body.requestedChanges || {})
      .filter(([key, value]) => allowedFields.includes(key) && value !== undefined && value !== null));
    const student = req.user.studentType === 'lateral'
      ? await LateralEntryStudent.findById(req.user.id)
      : await Student.findById(req.user.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const request = await Request.create({
      studentName: student.personalDetails?.studentName || student.studentName || 'Student',
      studentId: student.studentId || student.admissionNumber || student.personalDetails?.cetNumber || 'N/A',
      branch: student.academicDetails?.branch || student.branch || 'Unknown',
      type: 'Student Detail Edit',
      reason: message,
      studentRef: student._id,
      studentType: req.user.studentType === 'lateral' ? 'lateral' : 'regular',
      requestedChanges,
      officeDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    res.status(201).json(request);
  } catch (error) {
    console.error('Student edit request creation failed:', error);
    res.status(500).json({ error: 'Unable to send edit request.' });
  }
});

app.get('/api/student/edit-requests', verifyToken, async (req, res) => {
  try {
    if (String(req.user.role || '').toLowerCase() !== 'student') {
      return res.status(403).json({ error: 'Student access required' });
    }
    const ownership = [{ studentRef: req.user.id }];
    if (req.user.studentId) ownership.push({ studentId: req.user.studentId });
    const requests = await Request.find({ type: 'Student Detail Edit', $or: ownership })
      .sort({ createdAt: -1 }).limit(20).lean();
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Unable to load edit requests.' });
  }
});

app.get('/api/office/student-edit-requests', verifyToken, async (req, res) => {
  try {
    if (!isOfficeReader(req.user.role)) return res.status(403).json({ error: 'Office access required' });
    const requests = await Request.find({ type: 'Student Detail Edit' }).sort({ createdAt: -1 }).lean();
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Unable to load student edit requests.' });
  }
});

app.put('/api/office/student-edit-requests/:id', verifyToken, async (req, res) => {
  try {
    if (!isOfficeAdmin(req.user.role)) return res.status(403).json({ error: 'Office access required' });
    const { status, officeReply = '' } = req.body;
    if (!['Approved', 'Rejected'].includes(status)) return res.status(400).json({ error: 'Invalid request status' });
    const pendingRequest = await Request.findOne({ _id: req.params.id, type: 'Student Detail Edit', status: 'Pending' });
    if (!pendingRequest) return res.status(404).json({ error: 'Pending edit request not found' });

    if (status === 'Approved' && pendingRequest.studentRef) {
      const changes = pendingRequest.requestedChanges || {};
      if (pendingRequest.studentType === 'lateral') {
        const lateralStudent = await LateralEntryStudent.findById(pendingRequest.studentRef);
        if (!lateralStudent) return res.status(404).json({ error: 'Student record not found.' });
        const lateralMappings = { studentName: 'studentName', branch: 'branch', qualifyingExam: 'previousQualification', email: 'email', studentContact: 'phone' };
        for (const [key, path] of Object.entries(lateralMappings)) {
          if (Object.prototype.hasOwnProperty.call(changes, key)) lateralStudent.set(path, changes[key]);
        }
        await lateralStudent.save();
      } else {
        const student = await Student.findById(pendingRequest.studentRef);
        if (!student) return res.status(404).json({ error: 'Student record not found.' });
        const mappings = {
          studentName: 'personalDetails.studentName', dob: 'personalDetails.dob',
          gender: 'personalDetails.gender', category: 'personalDetails.category',
          cetNumber: 'personalDetails.cetNumber', branch: 'academicDetails.branch',
          qualifyingExam: 'academicDetails.qualifyingExam', fatherName: 'familyDetails.fatherName',
          motherName: 'familyDetails.motherName', annualIncome: 'familyDetails.annualIncome',
          email: 'contactDetails.email', studentContact: 'contactDetails.studentContact'
        };
        for (const [key, path] of Object.entries(mappings)) {
          if (Object.prototype.hasOwnProperty.call(changes, key)) {
            student.set(path, key === 'dob' ? new Date(changes[key]) : key === 'annualIncome' ? Number(changes[key]) : changes[key]);
          }
        }
        await student.save();
      }
    }

    pendingRequest.status = status;
    pendingRequest.officeReply = String(officeReply).trim().slice(0, 1000);
    pendingRequest.reviewedAt = new Date();
    const request = await pendingRequest.save();
    if (!request) return res.status(404).json({ error: 'Edit request not found' });
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: 'Unable to update edit request.' });
  }
});

app.get('/api/student/pdf', verifyToken, async (req, res) => {
  try {
    const studentRecord = req.user.studentType === 'lateral'
      ? await LateralEntryStudent.findById(req.user.id)
      : await Student.findById(req.user.id);

    if (!studentRecord) return res.status(404).json({ error: 'Student not found' });

    const personal = studentRecord.personalDetails || {};
    const academic = studentRecord.academicDetails || {};
    const contact = studentRecord.contactDetails || {};
    const name = personal.studentName || studentRecord.studentName || 'N/A';
    const cetNumber = personal.cetNumber || studentRecord.studentId || 'N/A';
    const branch = academic.branch || studentRecord.branch || 'N/A';
    const feePaid = Number(academic.feeCollected ?? studentRecord.feeDetails?.paidFee ?? studentRecord.paidFee ?? 0);
    const email = contact.email || studentRecord.email || 'N/A';
    const phone = contact.studentContact || studentRecord.phone || 'N/A';
    const dob = personal.dob ? new Date(personal.dob).toLocaleDateString() : 'N/A';

    const doc = new PDFDocument({ margins: { top: 82, bottom: 58, left: 52, right: 52 }, bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Admission_Details_${String(cetNumber).replace(/\s+/g, '_')}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).fillColor('#0f172a').text('GECM Admission Details', { align: 'center' });
    doc.moveDown(1.5);

    const addSection = (title, items) => {
      doc.fontSize(16).fillColor('#333').text(title, { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#555');
      Object.entries(items).forEach(([key, val]) => {
        if (val !== null && val !== undefined && val !== '') {
          doc.text(`${key}: ${String(val)}`);
        }
      });
      doc.moveDown(1.5);
    };

    addSection('Personal Details', {
      'Full Name': name,
      'CET Number': cetNumber,
      'Date of Birth': dob,
      'Gender': personal.gender || 'N/A',
    });

    addSection('Academic Details', {
      'Admitted Branch': branch,
      'Fee Paid': `Rs. ${feePaid.toLocaleString('en-IN')}`,
      'Qualifying Exam': academic.qualifyingExam || 'N/A',
    });

    addSection('Family Details', {
      'Father Name': studentRecord.familyDetails?.fatherName || 'N/A',
      'Mother Name': studentRecord.familyDetails?.motherName || 'N/A',
      'Annual Income': studentRecord.familyDetails?.annualIncome != null ? `Rs. ${Number(studentRecord.familyDetails.annualIncome).toLocaleString('en-IN')}` : 'N/A',
    });

    addSection('Contact Details', {
      'Email': email,
      'Phone': phone,
    });

    const pageRange = doc.bufferedPageRange();
    for (let pageNo = pageRange.start; pageNo < pageRange.start + pageRange.count; pageNo += 1) {
      doc.switchToPage(pageNo);
      doc.save();
      doc.rect(0, 0, doc.page.width, 58).fill('#0f172a');
      doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold')
        .text('Government Engineering College, Mosalehosahalli', 52, 18, { width: doc.page.width - 104, align: 'left', lineBreak: false });
      doc.fillColor('#cbd5e1').fontSize(8).font('Helvetica')
        .text('Student Admission Record', 52, 38, { lineBreak: false });
      doc.moveTo(52, doc.page.height - 42).lineTo(doc.page.width - 52, doc.page.height - 42)
        .lineWidth(0.6).strokeColor('#cbd5e1').stroke();
      doc.fillColor('#64748b').fontSize(8)
        .text(`Generated ${new Date().toLocaleDateString('en-IN')}`, 52, doc.page.height - 32, { lineBreak: false });
      doc.text(`Page ${pageNo - pageRange.start + 1} of ${pageRange.count}`, doc.page.width - 120, doc.page.height - 32, { width: 68, align: 'right', lineBreak: false });
      doc.restore();
    }

    doc.end();
  } catch (error) {
    console.error('PDF generation failed:', error);
    res.status(500).json({ error: 'PDF generation failed' });
  }
});

// --- OFFICE MODULE REST APIS --- //

// Helper to seed default settings if empty
const seedSettings = async () => {
  try {
    const deptSetting = await Setting.findOne({ key: 'departments' });
    if (!deptSetting) {
      await Setting.create({ key: 'departments', value: ['CSE', 'ECE', 'ME', 'Civil'] });
    }
    const courseSetting = await Setting.findOne({ key: 'courses' });
    if (!courseSetting) {
      await Setting.create({ key: 'courses', value: ['B.E.', 'M.Tech'] });
    }
    const yearSetting = await Setting.findOne({ key: 'academicYear' });
    if (!yearSetting) {
      await Setting.create({ key: 'academicYear', value: '2026-2027' });
    }
    
    // Seed Fee Plans if none exist
    const hasPlans = await FeePlan.countDocuments();
    if (hasPlans === 0) {
      await FeePlan.create([
        { batch: 2024, year1: 70000, year2: 62000, year3: 55000, year4: 50000 },
        { batch: 2025, year1: 75000, year2: 67000, year3: 60000, year4: 55000 },
        { batch: 2026, year1: 80000, year2: 72000, year3: 65000, year4: 60000 }
      ]);
      console.log('✅ Seeded default Fee Plans successfully');
    }

    // Seed Users if none exist
    const hasUsers = await User.countDocuments();
    if (hasUsers === 0) {
      await User.create([
        { name: 'Principal Admin', email: 'principal@gecm.edu', password: 'admin123', role: 'Principal' },
        { name: 'System Admin', email: 'admin@gecm.edu', password: 'admin123', role: 'Admin' },
        { name: 'Office Staff', email: 'office@gecm.edu', password: 'office123', role: 'Staff' },
        { name: 'HOD CSE', email: 'hod_cse@gecm.edu', password: 'hod123', role: 'HOD', branch: 'CSE' },
        { name: 'HOD ECE', email: 'hod_ece@gecm.edu', password: 'hod123', role: 'HOD', branch: 'ECE' }
      ]);
      console.log('✅ Seeded default MongoDB Users successfully');
    }
  } catch (err) {
    console.error('Error seeding settings & fee plans:', err);
  }
};
// 1. Office stats
app.get('/api/office/stats', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'Staff' && req.user.role !== 'Office' && req.user.role !== 'Principal') {
      return res.status(403).json({ error: 'Access Denied: Office role required' });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);

    // Run statistical aggregations and counts in parallel for optimal load performance
    const [
      totalStudents,
      pendingVerification,
      todayAdmissions,
      pendingFeePayments,
      feeStats,
      branchStats,
      yearStats,
      yearBranchStats,
      yearSetting,
      recentStudents
    ] = await Promise.all([
      Student.countDocuments({ approvalStatus: 'Approved' }),
      Student.countDocuments({ approvalStatus: 'Pending' }),
      Student.countDocuments({ approvalStatus: 'Approved', createdAt: { $gte: startOfToday } }),
      Student.countDocuments({ approvalStatus: 'Approved', 'feeDetails.pendingFee': { $gt: 0 } }),
      Student.aggregate([
        { $match: { approvalStatus: 'Approved' } },
        { $group: { _id: null, totalCollected: { $sum: '$feeDetails.paidFee' } } }
      ]),
      Student.aggregate([
        { $match: { approvalStatus: 'Approved' } },
        {
          $group: {
            _id: { $ifNull: ['$academicDetails.branch', 'Unassigned'] },
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1, _id: 1 } }
      ]),
      Student.aggregate([
        { $match: { approvalStatus: 'Approved' } },
        {
          $group: {
            _id: { $ifNull: ['$academicDetails.year', '$currentStudyYear'] },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Student.aggregate([
        { $match: { approvalStatus: 'Approved' } },
        {
          $group: {
            _id: {
              year: { $ifNull: ['$academicDetails.year', '$currentStudyYear'] },
              branch: { $ifNull: ['$academicDetails.branch', 'Unassigned'] }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.branch': 1 } }
      ]),
      Setting.findOne({ key: 'academicYear' }).lean(),
      Student.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('personalDetails.studentName academicDetails.branch approvalStatus createdAt')
        .lean()
    ]);

    const totalFeeCollected = feeStats[0]?.totalCollected || 0;
    const academicYear = yearSetting ? yearSetting.value : '2026-2027';

    const recentActivities = recentStudents.map(s => ({
      id: s._id,
      type: 'registration',
      message: `Applicant ${s.personalDetails.studentName} is ${s.approvalStatus}`,
      time: s.createdAt,
      status: s.approvalStatus,
      studentName: s.personalDetails.studentName,
      branch: s.academicDetails.branch
    }));

    res.json({
      totalStudents,
      todayAdmissions,
      pendingVerification,
      pendingFeePayments,
      totalFeeCollected,
      academicYear,
      branchWiseStudents: branchStats.map((branch) => ({
        branch: branch._id,
        count: branch.count
      })),
      yearWiseStudents: yearStats.map((year) => ({
        year: year._id,
        count: year.count
      })),
      yearBranchStudents: yearBranchStats.map((item) => ({
        year: item._id.year,
        branch: item._id.branch,
        count: item.count
      })),
      recentActivities
    });
  } catch (error) {
    console.error('Office Stats Error:', error);
    res.status(500).json({ error: 'Failed to fetch office statistics' });
  }
});

// 2. Fetch all students (with search, filter, pagination)
app.get('/api/office/students', verifyToken, async (req, res) => {
  try {
    if (!isOfficeReader(req.user.role)) {
      return res.status(403).json({ error: 'Access Denied: Office role required' });
    }

    const { search, branch, year, batch, feeStatus } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { 'personalDetails.studentName': { $regex: search, $options: 'i' } },
        { 'personalDetails.cetNumber': { $regex: search, $options: 'i' } },
        { 'personalDetails.aadhaarNumber': { $regex: search, $options: 'i' } },
        { 'contactDetails.studentContact': { $regex: search, $options: 'i' } },
        { 'contactDetails.email': { $regex: search, $options: 'i' } },
        { 'familyDetails.parentContact': { $regex: search, $options: 'i' } },
        { 'academicDetails.branch': { $regex: search, $options: 'i' } },
        { admissionNumber: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } }
      ];

      const numericSearch = Number(search);
      if (!Number.isNaN(numericSearch)) {
        query.$or.push({ 'personalDetails.cetRank': numericSearch });
      }
    }

    if (branch && branch !== 'All') {
      query['academicDetails.branch'] = branch;
    }

    if (year && year !== 'All') {
      query['academicDetails.year'] = Number(year);
    }
    if (batch && batch !== 'All') query.admissionBatch = Number(String(batch).slice(0, 4));

    if (feeStatus && feeStatus !== 'All') {
      if (feeStatus === 'Paid') {
        query['feeStatus.currentYear'] = 'Completed';
      } else {
        query['feeStatus.currentYear'] = 'Pending';
      }
    }

    let list = [];
    try {
      list = await Student.find(query)
        .select('-securityDetails.password -securityDetails.faceEmbedding -securityDetails.faceImageBase64 -securityDetails.faceImages -documents -lateralEntryDetails.documents')
        .lean();
      list = list.map((plainStudent) => {
        plainStudent.faceRegistered = Boolean(plainStudent.faceRegistered);
        return plainStudent;
      });
    } catch (dbErr) {
      console.warn('MongoDB Student query error, using fallback mock list:', dbErr.message);
    }

    if (!list || list.length === 0) {
      list = students.map((s, idx) => ({
        _id: s.id || `mock_${idx + 1}`,
        studentId: s.studentId || `2026CS00${idx + 1}`,
        admissionNumber: `GECM/2026/${(s.course || 'CSE').slice(0, 2).toUpperCase()}/00${idx + 1}`,
        approvalStatus: 'Approved',
        studentStatus: s.status || 'Active',
        admissionBatch: 2026,
        currentStudyYear: s.year || 1,
        personalDetails: {
          studentName: s.name || `Student ${idx + 1}`,
          cetNumber: `CET202600${idx + 1}`,
          dob: '2004-05-15',
          gender: 'Male',
          category: 'General',
          aadhaarNumber: `70000000000${idx + 1}`
        },
        familyDetails: {
          fatherName: `Father of ${s.name || 'Student'}`,
          motherName: `Mother of ${s.name || 'Student'}`,
          parentContact: `987654321${idx}`
        },
        academicDetails: {
          branch: s.course || 'CSE',
          year: s.year || 1,
          feeCollected: s.feePaid ? 50000 : 25000
        },
        contactDetails: {
          studentContact: `987654321${idx}`,
          email: `student${idx + 1}@gecm.edu`
        },
        credentials: {
          username: s.studentId || `2026CS00${idx + 1}`,
          initialPassword: 'student123',
          passwordChangeRequired: true,
          isActive: true
        },
        feeDetails: {
          totalFee: 85000,
          paidFee: s.feePaid ? 85000 : 25000,
          pendingFee: s.feePaid ? 0 : 60000
        },
        feeStatus: {
          currentYear: s.feePaid ? 'Completed' : 'Pending'
        },
        faceRegistered: Boolean(s.faceRegistered)
      }));
    }

    res.json(list);
  } catch (error) {
    console.error('Office Students Query Error:', error);
    res.status(500).json({ error: 'Failed to fetch students list' });
  }
});

// 3. Add student manually
app.post('/api/office/students', verifyToken, async (req, res) => {
  try {
    if (!isOfficeAdmin(req.user.role)) {
      return res.status(403).json({ error: 'Access Denied: Office role required' });
    }

    const { personalDetails, familyDetails, academicDetails, contactDetails, documents } = req.body;
    const customStudentId = String(req.body.studentId || req.body.usn || '').trim();
    const customAdmissionNumber = String(req.body.admissionNumber || '').trim().toUpperCase();
    if (!customStudentId) {
      return res.status(400).json({ error: 'Student ID / USN is required' });
    }
    if (!customAdmissionNumber) {
      return res.status(400).json({ error: 'Admission Number is required' });
    }
    const existing = await Student.findOne({
      $or: [
        { studentId: customStudentId },
        { admissionNumber: customAdmissionNumber },
        { 'personalDetails.cetNumber': personalDetails.cetNumber },
        { 'personalDetails.aadhaarNumber': personalDetails.aadhaarNumber }
      ]
    });

    if (existing) {
      return res.status(400).json({ error: 'A student with this Student ID, Admission Number, CET, or Aadhaar already exists.' });
    }

    // Lookup fee plan based on admissionBatch and year
    const batchNum = Number(req.body.admissionBatch) || new Date().getFullYear();
    if (batchNum < 2000 || batchNum > 2100) return res.status(400).json({ error: 'Invalid admission batch' });
    const currentYearNum = Number(academicDetails.year) || 1;

    let totalFee = 85000; // default
    try {
      const plan = await FeePlan.findOne({ batch: batchNum });
      if (plan) {
        if (currentYearNum === 1) totalFee = plan.year1;
        else if (currentYearNum === 2) totalFee = plan.year2;
        else if (currentYearNum === 3) totalFee = plan.year3;
        else if (currentYearNum === 4) totalFee = plan.year4;
      }
    } catch (err) {
      console.error('Error fetching fee plan during manual addition:', err);
    }

    const feeCollected = Number(academicDetails.feeCollected) || 0;
    const pendingFee = Math.max(0, totalFee - feeCollected);

    const newStudent = new Student({
      personalDetails,
      familyDetails,
      academicDetails,
      contactDetails,
      documents,
      admissionBatch: batchNum,
      currentAcademicYear: `${batchNum}-${batchNum + 1}`,
      currentStudyYear: currentYearNum,
      semester: (currentYearNum * 2) - 1,
      approvalStatus: 'Approved', // Manually added by office is auto-approved
      admissionStatus: { previousYear: 'Inactive', currentYear: 'Active' },
      feeDetails: {
        totalFee,
        paidFee: feeCollected,
        pendingFee
      },
      feeStatus: {
        previousYear: 'Completed',
        currentYear: pendingFee <= 0 ? 'Completed' : 'Pending'
      },
      securityDetails: {
        password: makeInitialPassword(),
        securityQuestion: 'Default Question',
        securityAnswer: 'Default Answer'
      }
    });

    const initialPassword = newStudent.securityDetails.password;
    const duplicateStudentId = await Student.findOne({ studentId: customStudentId }) || await LateralEntryStudent.findOne({ studentId: customStudentId });
    if (duplicateStudentId) return res.status(400).json({ error: 'This USN/Student ID is already in use.' });
    newStudent.studentId = customStudentId;
    newStudent.credentials = { username: newStudent.studentId, initialPassword, passwordChangeRequired: true };

    newStudent.admissionNumber = customAdmissionNumber;

    // If initial fee is collected, record in history
    if (feeCollected > 0) {
      newStudent.feeHistory.push({
        amount: feeCollected,
        transactionId: 'MANUAL-INIT-' + Date.now(),
        receiptNumber: 'REC-' + Date.now(),
        paymentMode: 'Cash',
        remarks: 'Admission initial deposit fee collected'
      });
    }

    await newStudent.save();
    await syncStudentRecords({ student: newStudent });
    await ensureLifecycleForStudent(newStudent, { userId: req.user.id });
    res.status(201).json({ message: 'Student created successfully!', student: newStudent, credentials: { username: newStudent.studentId, password: initialPassword } });
  } catch (error) {
    console.error('Manual Add Student Error:', error);
    res.status(500).json({ error: 'Failed to create student: ' + error.message });
  }
});

// 4. Update Student
app.put('/api/office/students/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'Staff' && req.user.role !== 'Office') {
      return res.status(403).json({ error: 'Access Denied: Office role required' });
    }

    const { personalDetails, familyDetails, academicDetails, contactDetails, documents } = req.body;

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Merge changes
    if (personalDetails) student.personalDetails = { ...student.personalDetails, ...personalDetails };
    if (familyDetails) student.familyDetails = { ...student.familyDetails, ...familyDetails };
    if (academicDetails) student.academicDetails = { ...student.academicDetails, ...academicDetails };
    if (contactDetails) student.contactDetails = { ...student.contactDetails, ...contactDetails };
    if (documents) student.documents = { ...student.documents, ...documents };

    await student.save();
    await syncStudentRecords({ student });
    res.json({ message: 'Student updated successfully!', student });
  } catch (error) {
    console.error('Update Student Error:', error);
    res.status(500).json({ error: 'Failed to update student: ' + error.message });
  }
});

// 5. Delete Student
app.delete('/api/office/students/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'Staff' && req.user.role !== 'Office') {
      return res.status(403).json({ error: 'Access Denied: Office role required' });
    }

    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ message: 'Student removed from system successfully' });
  } catch (error) {
    console.error('Delete Student Error:', error);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

// Office-only credential slip. Initial password is cleared after the student changes it.
app.get('/api/office/students/:id/credentials', verifyToken, async (req, res) => {
  try {
    if (!isOfficeAdmin(req.user.role)) return res.status(403).json({ error: 'Office role required' });
    const student = await Student.findById(req.params.id).select('studentId credentials personalDetails.studentName +credentials.initialPassword');
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json({ studentName: student.personalDetails.studentName, username: student.studentId, password: student.credentials?.initialPassword || null, passwordChangeRequired: student.credentials?.passwordChangeRequired !== false });
  } catch (error) {
    res.status(500).json({ error: 'Unable to retrieve credentials' });
  }
});

app.put('/api/student/change-password', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Student role required' });
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
    const student = req.user.studentType === 'lateral'
      ? await LateralEntryStudent.findById(req.user.id).select('+passwordHash +credentials.initialPassword')
      : await Student.findById(req.user.id).select('+credentials.initialPassword');
    if (!student || !(await student.comparePassword(currentPassword || ''))) return res.status(401).json({ error: 'Current password is incorrect' });
    if (req.user.studentType === 'lateral') student.passwordHash = newPassword;
    else student.securityDetails.password = newPassword;
    student.credentials.initialPassword = undefined;
    student.credentials.passwordChangeRequired = false;
    await student.save();
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Unable to change password' });
  }
});

// Lateral Entry Student Management
app.get('/api/office/lateral-entry-students', verifyToken, async (req, res) => {
  try {
    if (!isOfficeReader(req.user.role)) {
      return res.status(403).json({ error: 'Access Denied: Office role required' });
    }

    const { search, branch, admissionYear, feeStatus } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { studentName: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { admissionNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { previousCollege: { $regex: search, $options: 'i' } }
      ];
    }

    if (branch && branch !== 'All') query.branch = branch;
    if (admissionYear && admissionYear !== 'All') query.admissionYear = Number(admissionYear);
    if (feeStatus && feeStatus !== 'All') query.feeStatus = feeStatus;

    const list = await LateralEntryStudent.find(query).sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    console.error('Lateral Entry List Error:', error);
    res.status(500).json({ error: 'Failed to fetch lateral entry students' });
  }
});

app.get('/api/office/lateral-entry-students/:id', verifyToken, async (req, res) => {
  try {
    if (!isOfficeReader(req.user.role)) {
      return res.status(403).json({ error: 'Access Denied: Office role required' });
    }

    const student = await LateralEntryStudent.findById(req.params.id);
    if (!student) return res.status(404).json({ error: 'Lateral entry student not found' });

    res.json(student);
  } catch (error) {
    console.error('Lateral Entry Fetch Error:', error);
    res.status(500).json({ error: 'Failed to fetch lateral entry profile' });
  }
});

app.post('/api/office/lateral-entry-students', verifyToken, async (req, res) => {
  try {
    if (!isOfficeAdmin(req.user.role)) {
      return res.status(403).json({ error: 'Access Denied: Office Admin role required' });
    }

    const {
      studentName,
      email,
      phone,
      admissionYear,
      academicBatch,
      branch,
      previousQualification,
      previousCollege,
      previousUniversity,
      joiningSemester,
      diplomaPercentage,
      universitySeatNumber,
      feeStatus,
      totalFee,
      paidFee,
      academicProgress,
      documents
    } = req.body;
    const studentId = String(req.body.studentId || req.body.usn || '').trim();

    if (!studentName || !email || !phone || !admissionYear || !branch || !previousQualification || !previousCollege || !studentId) {
      return res.status(400).json({ error: 'Student ID / USN, student, admission, branch, qualification, and college details are required' });
    }
    const batch = academicBatch || getBatchLabel(admissionYear);
    if (!/^\d{4}-\d{2}$/.test(batch) || Number(batch.slice(0, 4)) !== Number(admissionYear)) {
      return res.status(400).json({ error: 'Academic batch must match the admission year (for example, 2024-28)' });
    }

    const existing = await LateralEntryStudent.findOne({ email });
    if (existing) return res.status(400).json({ error: 'A lateral entry student with this email already exists' });

    const count = await LateralEntryStudent.countDocuments({ branch, admissionYear: Number(admissionYear) });
    const serial = String(count + 1).padStart(3, '0');
    const admissionNumber = `LE/${admissionYear}/${branch.toUpperCase()}/${serial}`;

    const initialPassword = makeInitialPassword();
    const duplicateStudentId = await Student.findOne({ studentId }) || await LateralEntryStudent.findOne({ studentId });
    if (duplicateStudentId) return res.status(400).json({ error: 'This USN/Student ID is already in use.' });
    const student = new LateralEntryStudent({
      studentId,
      academicBatch: batch,
      credentials: { username: studentId, initialPassword, passwordChangeRequired: true },
      passwordHash: initialPassword,
      admissionNumber,
      studentName,
      email,
      phone,
      admissionYear: Number(admissionYear),
      branch,
      directAdmissionYear: 2,
      previousQualification,
      previousCollege,
      previousUniversity,
      joiningSemester: Number(joiningSemester) || 3,
      diplomaPercentage: Number(diplomaPercentage) || 0,
      universitySeatNumber,
      feeStatus: feeStatus || 'Pending',
      totalFee: Number(totalFee) || 85000,
      paidFee: Number(paidFee) || 0,
      academicProgress,
      documents: Array.isArray(documents) ? documents : [],
      createdBy: req.user.id
    });

    await student.save();
    await syncStudentRecords({ student, type: 'lateral' });
    res.status(201).json({ message: 'Lateral entry student added successfully', student, credentials: { username: studentId, password: initialPassword } });
  } catch (error) {
    console.error('Lateral Entry Add Error:', error);
    res.status(500).json({ error: 'Failed to add lateral entry student: ' + error.message });
  }
});

app.put('/api/office/lateral-entry-students/:id', verifyToken, async (req, res) => {
  try {
    if (!isOfficeAdmin(req.user.role)) {
      return res.status(403).json({ error: 'Access Denied: Office Admin role required' });
    }

    const student = await LateralEntryStudent.findById(req.params.id);
    if (!student) return res.status(404).json({ error: 'Lateral entry student not found' });

    const allowedFields = [
      'studentName',
      'email',
      'phone',
      // Batch, admission year, department and Student ID establish the permanent
      // identity. They cannot be changed from an update admission request.
      'previousQualification',
      'previousCollege',
      'previousUniversity',
      'joiningSemester',
      'diplomaPercentage',
      'universitySeatNumber',
      'feeStatus',
      'totalFee',
      'paidFee',
      'academicProgress',
      'documents',
      'status'
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) student[field] = req.body[field];
    });
    student.directAdmissionYear = 2;
    student.updatedBy = req.user.id;

    await student.save();
    await syncStudentRecords({ student, type: 'lateral' });
    res.json({ message: 'Lateral entry student updated successfully', student });
  } catch (error) {
    console.error('Lateral Entry Update Error:', error);
    res.status(500).json({ error: 'Failed to update lateral entry student: ' + error.message });
  }
});

// Office staff can activate the student portal only after enrollment checks.
app.patch('/api/office/students/:id/account-status', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'Staff' && req.user.role !== 'Office') return res.status(403).json({ error: 'Office role required' });
    const student = await Student.findById(req.params.id);
    if (!student || !student.studentId) return res.status(404).json({ error: 'Generated Student ID is required before account activation' });
    const isActive = Boolean(req.body.isActive);
    student.credentials = { ...(student.credentials?.toObject?.() || student.credentials || {}), username: student.studentId, isActive, passwordChangeRequired: student.credentials?.passwordChangeRequired !== false };
    student.studentStatus = isActive ? 'Active' : 'On Hold';
    await student.save();
    await StudentCredential.findOneAndUpdate({ studentId: student.studentId }, { isActive }, { upsert: true });
    res.json({ studentId: student.studentId, isActive, studentStatus: student.studentStatus });
  } catch (error) {
    res.status(500).json({ error: 'Unable to update account status' });
  }
});

// Office-only credential slip. Initial password is cleared after the student changes it.
app.get('/api/office/students/:id/credentials', verifyToken, async (req, res) => {
  try {
    if (!isOfficeAdmin(req.user.role)) return res.status(403).json({ error: 'Office role required' });
    const targetId = req.params.id;
    let student = null;
    let username = null;
    let password = null;
    let studentName = null;

    try {
      if (mongoose.Types.ObjectId.isValid(targetId)) {
        student = await Student.findById(targetId).select('studentId credentials personalDetails.studentName securityDetails.password +credentials.initialPassword');
      }
      if (!student) {
        student = await Student.findOne({ studentId: targetId }).select('studentId credentials personalDetails.studentName securityDetails.password +credentials.initialPassword');
      }
    } catch (e) {}

    if (!student) {
      try {
        if (mongoose.Types.ObjectId.isValid(targetId)) {
          student = await LateralEntryStudent.findById(targetId).select('studentName studentId credentials +credentials.initialPassword');
        }
        if (!student) {
          student = await LateralEntryStudent.findOne({ studentId: targetId }).select('studentName studentId credentials +credentials.initialPassword');
        }
      } catch (e) {}
    }

    if (student) {
      studentName = student.personalDetails?.studentName || student.studentName || 'Student';
      username = student.studentId || student.credentials?.username;
      password = student.credentials?.initialPassword || student.securityDetails?.password || 'student123';
    } else {
      const mockStudent = students.find(s => s.id === targetId || s.studentId === targetId || s.id === `s_${targetId}`);
      const mockUser = users.find(u => u.id === targetId || u.username === targetId || u.username === mockStudent?.name || u.role === 'student');
      
      if (mockStudent || mockUser) {
        studentName = mockStudent?.name || mockUser?.username || 'Test Student';
        username = mockStudent?.id || mockUser?.username || targetId;
        password = 'student123';
      }
    }

    return res.json({
      studentName: studentName || 'Student',
      username: username || targetId,
      password: password || 'student123',
      passwordChangeRequired: student?.credentials?.passwordChangeRequired !== false
    });
  } catch (error) {
    console.error('Credentials fetch error:', error);
    res.status(500).json({ error: 'Unable to retrieve credentials' });
  }
});

app.delete('/api/office/lateral-entry-students/:id', verifyToken, async (req, res) => {
  try {
    if (!isOfficeAdmin(req.user.role)) {
      return res.status(403).json({ error: 'Access Denied: Office Admin role required' });
    }

    const student = await LateralEntryStudent.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ error: 'Lateral entry student not found' });

    res.json({ message: 'Lateral entry student deleted successfully' });
  } catch (error) {
    console.error('Lateral Entry Delete Error:', error);
    res.status(500).json({ error: 'Failed to delete lateral entry student' });
  }
});

// Add new application manually by office staff
app.post('/api/office/admissions/new', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'Staff' && req.user.role !== 'Office') {
      return res.status(403).json({ error: 'Access Denied: Office role required' });
    }

    const { personalDetails, familyDetails, academicDetails, contactDetails, admissionType = 'Regular', admissionBatch } = req.body;
    const studentId = String(req.body.studentId || req.body.usn || '').trim().toUpperCase();
    const admissionNumber = String(req.body.admissionNumber || '').trim().toUpperCase();
    if (!studentId) {
      return res.status(400).json({ error: 'Student ID / USN is required' });
    }
    if (!admissionNumber) {
      return res.status(400).json({ error: 'Admission Number is required' });
    }
    
    // Check for existing CET/Aadhar
    const existing = await Student.findOne({ 
      $or: [
        { studentId },
        { admissionNumber },
        { 'personalDetails.cetNumber': personalDetails.cetNumber },
        { 'personalDetails.aadhaarNumber': personalDetails.aadhaarNumber },
        { 'contactDetails.email': contactDetails.email }
      ]
    }) || await LateralEntryStudent.findOne({ studentId });

    if (existing) {
      return res.status(400).json({ error: 'A student with this Student ID, Admission Number, CET Number, Aadhaar, or Email already exists.' });
    }

    const batchYear = Number(admissionBatch) || new Date().getFullYear();
    const initialStudyYear = admissionType === 'Lateral Entry' ? (Number(academicDetails.year) || 2) : 1;
    const newStudent = new Student({
      personalDetails,
      familyDetails,
      academicDetails,
      contactDetails,
      studentId,
      admissionNumber,
      admissionType: admissionType === 'Lateral Entry' ? 'Lateral Entry' : 'Regular',
      admissionBatch: batchYear,
      currentAcademicYear: `${batchYear}-${batchYear + 1}`,
      currentStudyYear: initialStudyYear,
      semester: (initialStudyYear * 2) - 1,
      approvalStatus: 'Pending',
      securityDetails: {
        emailForOtp: contactDetails.email,
        emailOtp: 'VERIFIED',
        password: 'Password@123',
        securityQuestion: 'Default Question',
        securityAnswer: 'Default Answer'
      }
    });

    await newStudent.save();
    res.status(201).json({ message: 'Admission application created successfully!', student: newStudent });
  } catch (error) {
    console.error('Office application creation error:', error);
    res.status(500).json({ error: 'Failed to create application: ' + error.message });
  }
});

// 6. Fetch pending applications
app.get('/api/office/admissions/pending', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'Staff' && req.user.role !== 'Office') {
      return res.status(403).json({ error: 'Access Denied: Office role required' });
    }

    const pending = await Student.find({ approvalStatus: 'Pending' })
      .select('-securityDetails.password -securityDetails.faceEmbedding -securityDetails.faceImageBase64 -securityDetails.faceImages -documents -lateralEntryDetails.documents')
      .lean();
    res.json(pending);
  } catch (error) {
    console.error('Fetch Pending Error:', error);
    res.status(500).json({ error: 'Failed to fetch pending applications' });
  }
});

// 7. Verify / Approve / Reject Admission
app.post('/api/office/admissions/verify/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'Staff' && req.user.role !== 'Office') {
      return res.status(403).json({ error: 'Access Denied: Office role required' });
    }

    const { action, branch, semester, section, comments, rejectionReason } = req.body;
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (action === 'Approve') {
      let generatedCredentials = null;
      student.approvalStatus = 'Approved';
      student.academicDetails.branch = branch || student.academicDetails.branch;
      student.semester = semester || 1;
      student.section = section || 'A';
      
      const batchNum = Number(req.body.admissionBatch) || new Date().getFullYear();
      if (batchNum < 2000 || batchNum > 2100) return res.status(400).json({ error: 'Invalid admission batch' });
      student.admissionBatch = batchNum;
      student.currentAcademicYear = `${batchNum}-${batchNum + 1}`;
      
      const currentYearNum = Number(req.body.year) || 1;
      student.currentStudyYear = currentYearNum;
      student.academicDetails.year = currentYearNum;
      student.semester = Number(semester) || ((currentYearNum * 2) - 1);

      // Lookup FeePlan
      let totalFee = 85000; // default
      try {
        const plan = await FeePlan.findOne({ batch: batchNum });
        if (plan) {
          if (currentYearNum === 1) totalFee = plan.year1;
          else if (currentYearNum === 2) totalFee = plan.year2;
          else if (currentYearNum === 3) totalFee = plan.year3;
          else if (currentYearNum === 4) totalFee = plan.year4;
        }
      } catch (err) {
        console.error('Error fetching fee plan during approval:', err);
      }
      
      // Setup fee details
      const feeByAccount = {
        'IDP A/C': Number(student.academicDetails.feeCollectedIdp || 0),
        'VTU A/C': Number(student.academicDetails.feeCollectedVtu || 0),
        'PD A/C': Number(student.academicDetails.feeCollectedPd || 0)
      };
      const initialFeeCollected = Number(student.academicDetails.feeCollected || 0) + Object.values(feeByAccount).reduce((sum, amount) => sum + amount, 0);
      student.feeDetails = {
        totalFee,
        paidFee: initialFeeCollected,
        pendingFee: Math.max(0, totalFee - initialFeeCollected)
      };
      student.feeStatus.currentYear = student.feeDetails.pendingFee <= 0 ? 'Completed' : 'Pending';

      // Admission numbers are assigned by office staff during admission entry.
      // Never silently replace a missing number with an automatically generated one.
      if (!String(student.admissionNumber || '').trim()) {
        return res.status(400).json({ error: 'An Admission Number must be entered before approval.' });
      }
      if (!student.studentId) {
        return res.status(400).json({ error: 'A Student ID / USN is required before approval.' });
      }

      // Insert fee history if initial fee paid
      if (initialFeeCollected > 0) {
        const keaCollected = Number(student.academicDetails.feeCollected || 0);
        if (keaCollected > 0) student.feeHistory.push({
          amount: keaCollected,
          transactionId: 'INIT-PAY-' + Date.now(),
          receiptNumber: 'REC-' + Date.now(),
          paymentMode: 'Online',
          account: 'KEA',
          remarks: 'Admission initial deposit fee collected'
        });
        for (const [account, amount] of Object.entries(feeByAccount)) {
          if (amount <= 0) continue;
          student.feeHistory.push({
            amount,
            academicYear: student.currentAcademicYear || await getCurrentAcademicYear(),
            studyYear: currentYearNum,
            account,
            transactionId: `ADMISSION-${account.replace(/[^A-Z]/g, '')}-${Date.now()}`,
            receiptNumber: `REC-${Date.now()}`,
            paymentMode: 'Admission record',
            remarks: `Admission fee collected in ${account}`
          });
        }
      }

      await student.save();
      await syncStudentRecords({ student });
      await ensureLifecycleForStudent(student, { userId: req.user.id });

      // Trigger Email Notification (Nodemailer)
      try {
        let transporter;
        if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
          transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
          });
        } else {
          const testAccount = await nodemailer.createTestAccount();
          transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: { user: testAccount.user, pass: testAccount.pass }
          });
        }

        await transporter.sendMail({
          from: '"GECM Admission Office" <admission@gecm.edu>',
          to: student.contactDetails.email,
          subject: "GECM Admission Approved 🎉",
          html: `<h3>Dear ${student.personalDetails.studentName},</h3>
                 <p>Congratulations! Your admission to GECM has been approved.</p>
                 <p><b>Admission Number:</b> ${student.admissionNumber}</p>
                 <p><b>Assigned Branch:</b> ${student.academicDetails.branch}</p>
                 <p><b>Semester / Section:</b> Sem ${student.semester} - Section ${student.section}</p>
                 <p><b>Student login:</b> ${student.studentId}. The office will share your initial password securely.</p>`
        });
      } catch (mailErr) {
        console.log('Verification mail failed to send: ', mailErr.message);
      }

      res.json({ message: 'Admission approved successfully!', student, credentials: generatedCredentials });
    } else if (action === 'Reject') {
      student.approvalStatus = 'Rejected';
      student.rejectionReason = rejectionReason || 'Documents mismatch / verification failed.';
      await student.save();

      // Send rejection mail
      try {
        let transporter;
        if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
          transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
          });
        } else {
          const testAccount = await nodemailer.createTestAccount();
          transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: { user: testAccount.user, pass: testAccount.pass }
          });
        }

        await transporter.sendMail({
          from: '"GECM Admission Office" <admission@gecm.edu>',
          to: student.contactDetails.email,
          subject: "Admission Application Status Update",
          html: `<h3>Dear ${student.personalDetails.studentName},</h3>
                 <p>Your admission application was reviewed by the GECM Office. Unfortunately, it has been rejected due to the following reason:</p>
                 <p style="color:red;font-weight:bold;">${student.rejectionReason}</p>
                 <p>Please contact the college administration office to rectify this issue.</p>`
        });
      } catch (mailErr) {
        console.log('Rejection mail failed to send: ', mailErr.message);
      }

      res.json({ message: 'Admission rejected successfully', student });
    } else {
      res.status(400).json({ error: 'Invalid verification action' });
    }
  } catch (error) {
    console.error('Verify Admission Error:', error);
    res.status(500).json({ error: 'Failed to verify admission' });
  }
});

// Set the manually assigned annual fee for a student's selected study year.
app.get('/api/office/fees/annual/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'Staff' && req.user.role !== 'Office') return res.status(403).json({ error: 'Access Denied: Office role required' });
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    const studyYear = Number(req.query.studyYear);
    if (!Number.isInteger(studyYear) || studyYear < 1 || studyYear > 4) return res.status(400).json({ error: 'Study year must be between 1 and 4' });
    const academicYear = getAcademicYearForStudyYear(student, studyYear) || student.currentAcademicYear || await getCurrentAcademicYear();
    const fee = await FeePayment.findOne({ student: student._id, academicYear, studyYear });
    const hasSavedBreakdown = fee && Number(fee.idpTuitionFee || fee.vtuAdmissionFee || fee.vtuInsuranceFee || fee.pdFee || fee.snqAdjustment) > 0;
    const annualHistory = (student.feeHistory || []).filter((payment) =>
      String(payment.account || '').toUpperCase() !== 'KEA' && !isAdmissionFeeRecord(payment) && (
        (payment.academicYear === academicYear && Number(payment.studyYear) === studyYear) ||
        (studyYear === 1 && !payment.academicYear && !payment.studyYear && /admission.*(initial deposit|fee collected)|initial.*admission/i.test(String(payment.remarks || '')))
      )
    );
    const paidAmount = annualHistory.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const breakdown = hasSavedBreakdown ? {
      idpTuitionFee: fee.idpTuitionFee,
      vtuAdmissionFee: fee.vtuAdmissionFee,
      vtuInsuranceFee: fee.vtuInsuranceFee,
      pdFee: fee.pdFee,
      snqAdjustment: fee.snqAdjustment
    } : null;
    const componentTotal = breakdown
      ? Number(breakdown.idpTuitionFee || 0) + Number(breakdown.vtuAdmissionFee || 0) + Number(breakdown.vtuInsuranceFee || 0) + Number(breakdown.pdFee || 0) - Number(breakdown.snqAdjustment || 0)
      : 0;
    const requestedDefaultTotal = Number(req.query.defaultTotal);
    const totalFee = hasSavedBreakdown
      ? componentTotal
      : Number.isFinite(requestedDefaultTotal) && requestedDefaultTotal > 0
        ? requestedDefaultTotal
        : Number(fee?.totalFee || 0);
    res.json({
      breakdown,
      academicYear,
      totalFee,
      paidAmount,
      outstandingBalance: Math.max(0, totalFee - paidAmount),
      accountReceipts: Object.fromEntries((fee?.accountReceipts || []).map((receipt) => [receipt.account, receipt.receiptFileName || '']))
    });
  } catch (error) {
    console.error('Get annual fee details error:', error);
    res.status(500).json({ error: 'Failed to load annual fee details' });
  }
});

app.put('/api/office/fees/annual/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'Staff' && req.user.role !== 'Office') {
      return res.status(403).json({ error: 'Access Denied: Office role required' });
    }
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const breakdown = req.body.breakdown || {};
    const hasBreakdown = ['idpTuitionFee', 'vtuAdmissionFee', 'vtuInsuranceFee', 'pdFee'].some((key) => breakdown[key] !== undefined);
    const amounts = ['idpTuitionFee', 'vtuAdmissionFee', 'vtuInsuranceFee', 'pdFee'].reduce((result, key) => {
      result[key] = Number(breakdown[key] ?? 0);
      return result;
    }, {});
    const totalFee = hasBreakdown
      ? Object.values(amounts).reduce((sum, value) => sum + value, 0) - Number(breakdown.snqAdjustment || 0)
      : Number(req.body.totalFee);
    const studyYear = Number(req.body.studyYear);
    if (!Number.isFinite(totalFee) || totalFee < 0 || Object.values(amounts).some((value) => !Number.isFinite(value) || value < 0)) return res.status(400).json({ error: 'Enter valid non-negative fee amounts' });
    if (!Number.isInteger(studyYear) || studyYear < 1 || studyYear > 4) return res.status(400).json({ error: 'Study year must be between 1 and 4' });

    const academicYear = getAcademicYearForStudyYear(student, studyYear) || student.currentAcademicYear || await getCurrentAcademicYear();
    const existing = await FeePayment.findOne({ student: student._id, academicYear, studyYear });
    const annualHistory = (student.feeHistory || []).filter((payment) =>
      String(payment.account || '').toUpperCase() !== 'KEA' && !isAdmissionFeeRecord(payment) && (
        (payment.academicYear === academicYear && Number(payment.studyYear) === studyYear) ||
        (studyYear === 1 && !payment.academicYear && !payment.studyYear && /admission.*(initial deposit|fee collected)|initial.*admission/i.test(String(payment.remarks || '')))
      )
    );
    const paidAmount = annualHistory.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const outstandingBalance = Math.max(0, totalFee - paidAmount);
    const fee = await FeePayment.findOneAndUpdate(
      { student: student._id, academicYear, studyYear },
      { $set: {
        studentId: student.studentId,
        tuitionFee: hasBreakdown ? amounts.idpTuitionFee : totalFee,
        universityFee: hasBreakdown ? amounts.vtuAdmissionFee + amounts.vtuInsuranceFee : 0,
        examFee: hasBreakdown ? amounts.pdFee : 0,
        scholarshipAdjustment: Number(breakdown.snqAdjustment || 0),
        ...(hasBreakdown ? amounts : {}),
        ...(hasBreakdown ? { snqAdjustment: Number(breakdown.snqAdjustment || 0) } : {}),
        totalFee,
        paidAmount,
        outstandingBalance,
        paymentVerified: outstandingBalance === 0,
        feeConfirmationStatus: outstandingBalance === 0 ? 'Confirmed' : paidAmount > 0 ? 'Partially Paid' : 'Pending',
        approvingOfficer: toObjectId(req.user.id)
      } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if ((!student.currentAcademicYear || student.currentAcademicYear === academicYear) && getStudyYear(student, academicYear) === studyYear) {
      student.feeDetails = { ...student.feeDetails?.toObject?.(), totalFee, paidFee: paidAmount, pendingFee: outstandingBalance };
      student.feeStatus.currentYear = outstandingBalance === 0 ? 'Completed' : 'Pending';
      await student.save();
    }
    res.json({ message: 'Annual fee saved', academicYear, fee, student });
  } catch (error) {
    console.error('Set annual fee error:', error);
    res.status(500).json({ error: 'Failed to save annual fee' });
  }
});

app.get('/api/office/fees/receipt/:receiptNumber', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'Staff' && req.user.role !== 'Office') return res.status(403).json({ error: 'Office role required' });
    const record = await FeePayment.findOne({ 'payments.receiptNumber': req.params.receiptNumber }).select('payments').lean();
    const payment = record?.payments?.find((item) => item.receiptNumber === req.params.receiptNumber);
    if (!payment?.receiptData) return res.status(404).json({ error: 'No uploaded receipt is attached to this payment.' });
    res.json({ receiptData: payment.receiptData, fileName: payment.receiptFileName, mimeType: payment.receiptMimeType });
  } catch (error) {
    console.error('Get uploaded fee receipt error:', error);
    res.status(500).json({ error: 'Failed to load uploaded receipt' });
  }
});

// Attach a receipt to a previously recorded payment, including fully paid years.
app.put('/api/office/fees/receipt/:receiptNumber', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'Staff' && req.user.role !== 'Office') return res.status(403).json({ error: 'Office role required' });
    const receiptNumber = String(req.params.receiptNumber || '').trim();
    const { receiptData = '', receiptFileName = '', receiptMimeType = '' } = req.body;
    if (!/^data:(application\/pdf|image\/(jpeg|png));base64,/.test(receiptData) || receiptData.length > 6 * 1024 * 1024) {
      return res.status(400).json({ error: 'Receipt must be a PDF, JPG, or PNG under 4.5 MB.' });
    }

    const [feeRecord, student] = await Promise.all([
      FeePayment.findOne({ 'payments.receiptNumber': receiptNumber }),
      Student.findOne({ 'feeHistory.receiptNumber': receiptNumber })
    ]);
    if (!feeRecord || !student) return res.status(404).json({ error: 'Payment record not found for this receipt.' });

    const annualPayment = feeRecord.payments.find((payment) => payment.receiptNumber === receiptNumber);
    const studentPayment = student.feeHistory.find((payment) => payment.receiptNumber === receiptNumber);
    if (!annualPayment || !studentPayment) return res.status(404).json({ error: 'Payment record not found for this receipt.' });

    annualPayment.receiptData = receiptData;
    annualPayment.receiptFileName = String(receiptFileName || 'receipt').slice(0, 255);
    annualPayment.receiptMimeType = receiptMimeType;
    studentPayment.receiptFileName = annualPayment.receiptFileName;
    studentPayment.receiptMimeType = receiptMimeType;
    await Promise.all([feeRecord.save(), student.save()]);
    res.json({ message: 'Receipt uploaded successfully.' });
  } catch (error) {
    console.error('Upload payment receipt error:', error);
    res.status(500).json({ error: 'Failed to upload receipt' });
  }
});

// Store uploaded documents for the annual account-allocation receipt rows.
app.get('/api/office/fees/account-receipt/:studentId/:studyYear/:account', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'Staff' && req.user.role !== 'Office') return res.status(403).json({ error: 'Office role required' });
    const studyYear = Number(req.params.studyYear);
    const account = decodeURIComponent(req.params.account);
    if (!Number.isInteger(studyYear) || studyYear < 1 || studyYear > 4 || !['IDP A/C', 'VTU A/C', 'PD A/C'].includes(account)) {
      return res.status(400).json({ error: 'Invalid study year or fee account.' });
    }
    const fee = await FeePayment.findOne({ student: req.params.studentId, studyYear }).select('accountReceipts').lean();
    const receipt = fee?.accountReceipts?.find((item) => item.account === account);
    if (!receipt) return res.status(404).json({ error: 'No uploaded receipt is attached to this account allocation.' });
    res.json({ receiptData: receipt.receiptData, fileName: receipt.receiptFileName, mimeType: receipt.receiptMimeType });
  } catch (error) {
    console.error('Get account allocation receipt error:', error);
    res.status(500).json({ error: 'Failed to load uploaded receipt' });
  }
});

app.put('/api/office/fees/account-receipt/:studentId/:studyYear/:account', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'Staff' && req.user.role !== 'Office') return res.status(403).json({ error: 'Office role required' });
    const studyYear = Number(req.params.studyYear);
    const account = decodeURIComponent(req.params.account);
    const { receiptData = '', receiptFileName = '', receiptMimeType = '' } = req.body;
    if (!Number.isInteger(studyYear) || studyYear < 1 || studyYear > 4 || !['IDP A/C', 'VTU A/C', 'PD A/C'].includes(account)) {
      return res.status(400).json({ error: 'Invalid study year or fee account.' });
    }
    if (!/^data:(application\/pdf|image\/(jpeg|png));base64,/.test(receiptData) || receiptData.length > 6 * 1024 * 1024) {
      return res.status(400).json({ error: 'Receipt must be a PDF, JPG, or PNG under 4.5 MB.' });
    }
    const fee = await FeePayment.findOne({ student: req.params.studentId, studyYear });
    if (!fee) return res.status(404).json({ error: 'Annual fee record not found.' });
    let receipt = fee.accountReceipts.find((item) => item.account === account);
    if (!receipt) {
      fee.accountReceipts.push({ account });
      receipt = fee.accountReceipts[fee.accountReceipts.length - 1];
    }
    receipt.receiptData = receiptData;
    receipt.receiptFileName = String(receiptFileName || 'receipt').slice(0, 255);
    receipt.receiptMimeType = receiptMimeType;
    await fee.save();
    res.json({ message: 'Receipt uploaded successfully.', fileName: receipt.receiptFileName, mimeType: receipt.receiptMimeType });
  } catch (error) {
    console.error('Upload account allocation receipt error:', error);
    res.status(500).json({ error: 'Failed to upload receipt' });
  }
});

// 8. Record Fee Payment
app.post('/api/office/fees/pay', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'Staff' && req.user.role !== 'Office') {
      return res.status(403).json({ error: 'Access Denied: Office role required' });
    }

    const { studentId, amount, transactionId, paymentMode, remarks, account = 'PD A/C', breakdown = {} } = req.body;
    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const accountName = ['IDP A/C', 'VTU A/C', 'PD A/C'].includes(account) ? account : 'PD A/C';
    const payAmt = Number(amount);
    if (isNaN(payAmt) || payAmt <= 0) {
      return res.status(400).json({ error: 'Invalid payment amount' });
    }

    const studyYear = Number(req.body.studyYear || getStudyYear(student, student.currentAcademicYear));
    if (!Number.isInteger(studyYear) || studyYear < 1 || studyYear > 4) {
      return res.status(400).json({ error: 'Study year must be between 1 and 4' });
    }
    const academicYear = getAcademicYearForStudyYear(student, studyYear) || student.currentAcademicYear || await getCurrentAcademicYear();
    const { receiptData = '', receiptFileName = '', receiptMimeType = '' } = req.body;
    if (receiptData && (!/^data:(application\/pdf|image\/(jpeg|png));base64,/.test(receiptData) || receiptData.length > 6 * 1024 * 1024)) {
      return res.status(400).json({ error: 'Receipt must be a PDF, JPG, or PNG under 4.5 MB.' });
    }
    const annualFeeRecord = await FeePayment.findOne({ student: student._id, academicYear, studyYear });
    const hasAnnualBreakdown = annualFeeRecord && Number(annualFeeRecord.idpTuitionFee || annualFeeRecord.vtuAdmissionFee || annualFeeRecord.vtuInsuranceFee || annualFeeRecord.pdFee || annualFeeRecord.snqAdjustment) > 0;
    const annualBreakdownTotal = hasAnnualBreakdown
      ? Number(annualFeeRecord.idpTuitionFee || 0) + Number(annualFeeRecord.vtuAdmissionFee || 0) + Number(annualFeeRecord.vtuInsuranceFee || 0) + Number(annualFeeRecord.pdFee || 0) - Number(annualFeeRecord.snqAdjustment || 0)
      : 0;
    const annualTotal = hasAnnualBreakdown ? annualBreakdownTotal : Number(req.body.totalFee || annualFeeRecord?.totalFee);
    if (!Number.isFinite(annualTotal) || annualTotal <= 0) {
      return res.status(400).json({ error: 'Save a valid annual fee before recording payment.' });
    }
    const annualHistory = (student.feeHistory || []).filter((payment) =>
      String(payment.account || '').toUpperCase() !== 'KEA' && !isAdmissionFeeRecord(payment) &&
      payment.academicYear === academicYear && Number(payment.studyYear) === studyYear
    );
    const annualPaid = annualHistory.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const annualDue = Math.max(0, annualTotal - annualPaid);
    if (payAmt > annualDue) {
      return res.status(400).json({ error: `Amount exceeds this year's pending fee of Rs. ${annualDue.toLocaleString('en-IN')}.` });
    }

    // Ensure feeDetails is initialized
    if (!student.feeDetails) {
      student.feeDetails = {
        totalFee: 85000,
        paidFee: student.academicDetails.feeCollected || 0,
        pendingFee: 85000 - (student.academicDetails.feeCollected || 0),
        accountBreakdown: { idp: 0, vtu: 0, pd: 0 }
      };
    }

    if (!student.feeDetails.accountBreakdown) {
      student.feeDetails.accountBreakdown = { idp: 0, vtu: 0, pd: 0 };
    }

    const accountKey = accountName === 'IDP A/C' ? 'idp' : accountName === 'VTU A/C' ? 'vtu' : 'pd';
    student.feeDetails.accountBreakdown[accountKey] = Number(student.feeDetails.accountBreakdown[accountKey] || 0) + payAmt;
    student.feeDetails.paidFee = Number(student.feeDetails.paidFee || 0) + payAmt;
    student.feeDetails.pendingFee = Math.max(0, student.feeDetails.totalFee - student.feeDetails.paidFee);
    student.feeStatus.currentYear = student.feeDetails.pendingFee <= 0 ? 'Completed' : 'Pending';

    // Add to history
    student.feeHistory.push({
      amount: payAmt,
      date: new Date(),
      academicYear,
      studyYear,
      transactionId: transactionId || 'UPI-' + Date.now(),
      receiptNumber: 'REC-' + Date.now(),
      paymentMode: paymentMode || 'UPI',
      remarks: remarks || 'Fee installment',
      account: accountName,
      receiptFileName: receiptFileName || undefined,
      receiptMimeType: receiptMimeType || undefined
    });

    await student.save();

    await ensureLifecycleForStudent(student, { userId: req.user.id });
    const lastPayment = student.feeHistory[student.feeHistory.length - 1];
    const updatedAnnualPaid = annualPaid + payAmt;
    const updatedAnnualDue = Math.max(0, annualTotal - updatedAnnualPaid);
    const breakdownAmounts = {
      idpTuitionFee: Number(breakdown.idpTuitionFee || 0),
      vtuAdmissionFee: Number(breakdown.vtuAdmissionFee || 0),
      vtuInsuranceFee: Number(breakdown.vtuInsuranceFee || 0),
      pdFee: Number(breakdown.pdFee || 0),
      snqAdjustment: Number(breakdown.snqAdjustment || 0)
    };
    const feePayment = await FeePayment.findOneAndUpdate(
      { student: student._id, academicYear, studyYear },
      { $set: {
        studentId: student.studentId,
        tuitionFee: breakdownAmounts.idpTuitionFee,
        universityFee: breakdownAmounts.vtuAdmissionFee + breakdownAmounts.vtuInsuranceFee,
        examFee: breakdownAmounts.pdFee,
        ...breakdownAmounts,
        totalFee: annualTotal,
        paidAmount: updatedAnnualPaid,
        outstandingBalance: updatedAnnualDue,
        feeConfirmationStatus: updatedAnnualDue === 0 ? 'Confirmed' : updatedAnnualPaid > 0 ? 'Partially Paid' : 'Pending',
        paymentVerified: updatedAnnualDue === 0,
        ...(updatedAnnualDue === 0 ? { confirmationDate: new Date(), receiptNumber: annualFeeRecord?.receiptNumber || `FEE-${Date.now()}` } : {})
      }, $push: { payments: { ...lastPayment.toObject(), receiptData: receiptData || undefined } } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (getStudyYear(student, academicYear) === studyYear) {
      student.feeDetails.totalFee = annualTotal;
      student.feeDetails.pendingFee = updatedAnnualDue;
      student.feeStatus.currentYear = updatedAnnualDue === 0 ? 'Completed' : 'Pending';
      await student.save();
    }

    const academicYearAdmission = await AdmissionConfirmation.findOne({ student: student._id, academicYear, studyYear });
    await syncAcademicStatus({
      student,
      academicYear,
      studyYear,
      semester: getSemesterForYear(studyYear, student.semester),
      admission: academicYearAdmission,
      fee: feePayment,
      userId: req.user.id,
      remarks: remarks || 'Fee installment recorded'
    });

    res.json({ message: 'Payment recorded successfully!', academicYear, student, annualFee: feePayment });
  } catch (error) {
    console.error('Fee Pay Error:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// 9. Pending Fee List
app.get('/api/office/fees/pending', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'Staff' && req.user.role !== 'Office' && req.user.role !== 'Principal') {
      return res.status(403).json({ error: 'Access Denied: Office role required' });
    }

    const list = await Student.find({
      approvalStatus: 'Approved',
      'feeDetails.pendingFee': { $gt: 0 }
    }).select('personalDetails.studentName admissionNumber academicDetails.branch feeDetails contactDetails.email contactDetails.studentContact');
    
    res.json(list);
  } catch (error) {
    console.error('Pending Fee Error:', error);
    res.status(500).json({ error: 'Failed to fetch pending fee list' });
  }
});

// --- 4-Year Student Lifecycle Management Routes --- //

const canViewLifecycle = (role) => ['Staff', 'Office', 'Principal', 'HOD', 'Admin'].includes(role);
const canManageLifecycle = (role) => ['Staff', 'Office', 'Admin'].includes(role);

const requireLifecycleViewer = (req, res) => {
  if (!canViewLifecycle(req.user.role)) {
    res.status(403).json({ error: 'Access Denied: lifecycle viewer role required' });
    return false;
  }
  return true;
};

const getLifecycleStudent = async (req, res, id) => {
  const student = await Student.findById(id).select('-securityDetails.password');
  if (!student) {
    res.status(404).json({ error: 'Student not found' });
    return null;
  }

  if (req.user.role === 'HOD' && req.user.branch !== 'None' && student.academicDetails?.branch !== req.user.branch) {
    res.status(403).json({ error: 'Access Denied: student is outside your branch' });
    return null;
  }

  return student;
};

const mapStudentsById = (studentsList) => {
  const map = new Map();
  studentsList.forEach((student) => map.set(String(student._id), student));
  return map;
};

app.get('/api/lifecycle/overview', verifyToken, async (req, res) => {
  try {
    if (!requireLifecycleViewer(req, res)) return;

    const currentAcademicYear = await getCurrentAcademicYear();
    const branchFilter = req.user.role === 'HOD' && req.user.branch !== 'None'
      ? { 'academicDetails.branch': req.user.branch }
      : {};

    await ensureLifecycleForApprovedStudents(branchFilter, { academicYear: currentAcademicYear, userId: req.user.id });

    const studentsList = await Student.find({ approvalStatus: 'Approved', ...branchFilter })
      .select('studentId personalDetails.studentName personalDetails.cetNumber academicDetails.branch academicDetails.year currentStudyYear currentAcademicYear studentStatus feeDetails feeStatus admissionStatus admissionNumber')
      .lean();

    const studentObjectIds = studentsList.map((student) => student._id);
    const yearWiseStudents = { 1: 0, 2: 0, 3: 0, 4: 0 };
    const branchWiseStudents = {};

    studentsList.forEach((student) => {
      const studyYear = Number(student.currentStudyYear || student.academicDetails?.year || 1);
      if (yearWiseStudents[studyYear] !== undefined) yearWiseStudents[studyYear] += 1;
      const branch = student.academicDetails?.branch || 'Unassigned';
      branchWiseStudents[branch] = (branchWiseStudents[branch] || 0) + 1;
    });

    const [
      pendingAdmissionConfirmations,
      pendingFeeConfirmations,
      studentsReadyForPromotion,
      studentsWithFeeDue,
      graduatedStudents,
      pendingHodPromotions,
      pendingPrincipalPromotions
    ] = await Promise.all([
      AdmissionConfirmation.countDocuments({
        student: { $in: studentObjectIds },
        academicYear: currentAcademicYear,
        admissionStatus: { $ne: 'Confirmed' }
      }),
      FeePayment.countDocuments({
        student: { $in: studentObjectIds },
        academicYear: currentAcademicYear,
        feeConfirmationStatus: { $in: ['Pending', 'Partially Paid', 'Due'] }
      }),
      AcademicYearStatus.countDocuments({
        student: { $in: studentObjectIds },
        academicYear: currentAcademicYear,
        promotionStatus: 'Eligible'
      }),
      FeePayment.countDocuments({
        student: { $in: studentObjectIds },
        academicYear: currentAcademicYear,
        outstandingBalance: { $gt: 0 }
      }),
      Student.countDocuments({ approvalStatus: 'Approved', studentStatus: 'Graduated', ...branchFilter }),
      PromotionHistory.countDocuments({
        student: { $in: studentObjectIds },
        recommendationStatus: 'Pending HOD'
      }),
      PromotionHistory.countDocuments({
        student: { $in: studentObjectIds },
        recommendationStatus: { $in: ['HOD Approved', 'Pending Principal'] }
      })
    ]);

    res.json({
      academicYear: currentAcademicYear,
      totalStudents: studentsList.length,
      yearWiseStudents,
      branchWiseStudents,
      pendingAdmissionConfirmations,
      pendingFeeConfirmations,
      studentsReadyForPromotion,
      studentsWithFeeDue,
      graduatedStudents,
      pendingHodPromotions,
      pendingPrincipalPromotions
    });
  } catch (error) {
    console.error('Lifecycle Overview Error:', error);
    res.status(500).json({ error: 'Failed to fetch lifecycle overview' });
  }
});

app.get('/api/lifecycle/students', verifyToken, async (req, res) => {
  try {
    if (!requireLifecycleViewer(req, res)) return;

    const currentAcademicYear = await getCurrentAcademicYear();
    const { search, branch, year, status, feeStatus } = req.query;
    const query = { approvalStatus: 'Approved' };

    if (req.user.role === 'HOD' && req.user.branch !== 'None') {
      query['academicDetails.branch'] = req.user.branch;
    } else if (branch && branch !== 'All') {
      query['academicDetails.branch'] = branch;
    }

    if (year && year !== 'All') {
      query.$or = [
        { currentStudyYear: Number(year) },
        { 'academicDetails.year': Number(year) }
      ];
    }

    if (status && status !== 'All') query.studentStatus = status;

    if (search) {
      const searchOr = [
        { studentId: { $regex: search, $options: 'i' } },
        { admissionNumber: { $regex: search, $options: 'i' } },
        { 'personalDetails.studentName': { $regex: search, $options: 'i' } },
        { 'personalDetails.cetNumber': { $regex: search, $options: 'i' } },
        { 'academicDetails.branch': { $regex: search, $options: 'i' } }
      ];
      query.$and = [{ $or: searchOr }];
    }

    const studentsList = await Student.find(query)
      .sort({ 'academicDetails.branch': 1, currentStudyYear: 1, 'personalDetails.studentName': 1 })
      .select('-securityDetails.password -securityDetails.faceEmbedding -securityDetails.faceImageBase64 -securityDetails.faceImages -documents -lateralEntryDetails.documents')
      .lean();

    const studentObjectIds = studentsList.map((student) => student._id);
    const byId = mapStudentsById(studentsList);

    const [academicStatuses, admissions, fees] = await Promise.all([
      AcademicYearStatus.find({ student: { $in: studentObjectIds }, academicYear: currentAcademicYear }).lean(),
      AdmissionConfirmation.find({ student: { $in: studentObjectIds }, academicYear: currentAcademicYear }).lean(),
      FeePayment.find({ student: { $in: studentObjectIds }, academicYear: currentAcademicYear }).lean()
    ]);

    const lifecycleKey = (studentId, studyYear) => `${String(studentId)}:${Number(studyYear)}`;
    const academicByStudent = new Map(academicStatuses.map((item) => [lifecycleKey(item.student, item.studyYear), item]));
    const admissionByStudent = new Map(admissions.map((item) => [lifecycleKey(item.student, item.studyYear), item]));
    const feeByStudent = new Map(fees.map((item) => [lifecycleKey(item.student, item.studyYear), item]));

    let rows = refreshed.map((student) => ({
      ...student,
      lifecycle: {
        academic: academicByStudent.get(lifecycleKey(student._id, student.currentStudyYear || student.academicDetails?.year || 1)),
        admission: admissionByStudent.get(lifecycleKey(student._id, student.currentStudyYear || student.academicDetails?.year || 1)),
        fee: feeByStudent.get(lifecycleKey(student._id, student.currentStudyYear || student.academicDetails?.year || 1))
      }
    }));

    if (feeStatus && feeStatus !== 'All') {
      rows = rows.filter((student) => student.lifecycle.fee?.feeConfirmationStatus === feeStatus);
    }

    rows.sort((left, right) => {
      const leftStudent = byId.get(String(left._id));
      const rightStudent = byId.get(String(right._id));
      return String(leftStudent?.personalDetails?.studentName || '').localeCompare(String(rightStudent?.personalDetails?.studentName || ''));
    });

    res.json(rows);
  } catch (error) {
    console.error('Lifecycle Students Error:', error);
    res.status(500).json({ error: 'Failed to fetch lifecycle students' });
  }
});

app.get('/api/lifecycle/my-profile', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Student role required' });
    }

    const student = await Student.findById(req.user.id).select('-securityDetails.password');
    if (!student) return res.status(404).json({ error: 'Student not found' });

    await ensureLifecycleForStudent(student, { userId: req.user.id });

    const [academicHistory, admissionConfirmations, feePayments, promotions, notifications, documents] = await Promise.all([
      AcademicYearStatus.find({ student: student._id }).sort({ studyYear: 1, academicYear: 1 }).lean(),
      AdmissionConfirmation.find({ student: student._id }).sort({ studyYear: 1, academicYear: 1 }).lean(),
      FeePayment.find({ student: student._id }).sort({ studyYear: 1, academicYear: 1 }).lean(),
      PromotionHistory.find({ student: student._id }).sort({ fromYear: 1, academicYear: 1 }).lean(),
      Notification.find({ student: student._id }).sort({ createdAt: -1 }).limit(10).lean(),
      DocumentRecord.find({ student: student._id }).sort({ documentType: 1 }).lean()
    ]);

    res.json({ student, academicHistory, admissionConfirmations, feePayments, promotions, notifications, documents });
  } catch (error) {
    console.error('Lifecycle Student Profile Error:', error);
    res.status(500).json({ error: 'Failed to fetch lifecycle profile' });
  }
});

app.get('/api/lifecycle/students/:id', verifyToken, async (req, res) => {
  try {
    if (!requireLifecycleViewer(req, res)) return;

    const student = await getLifecycleStudent(req, res, req.params.id);
    if (!student) return;

    await ensureLifecycleForStudent(student, { userId: req.user.id });

    const [academicHistory, admissionConfirmations, feePayments, promotions, notifications, documents] = await Promise.all([
      AcademicYearStatus.find({ student: student._id }).sort({ studyYear: 1, academicYear: 1 }).lean(),
      AdmissionConfirmation.find({ student: student._id }).sort({ studyYear: 1, academicYear: 1 }).lean(),
      FeePayment.find({ student: student._id }).sort({ studyYear: 1, academicYear: 1 }).lean(),
      PromotionHistory.find({ student: student._id }).sort({ fromYear: 1, academicYear: 1 }).lean(),
      Notification.find({ student: student._id }).sort({ createdAt: -1 }).limit(20).lean(),
      DocumentRecord.find({ student: student._id }).sort({ documentType: 1 }).lean()
    ]);

    res.json({ student, academicHistory, admissionConfirmations, feePayments, promotions, notifications, documents });
  } catch (error) {
    console.error('Lifecycle Student Detail Error:', error);
    res.status(500).json({ error: 'Failed to fetch lifecycle student detail' });
  }
});

app.post('/api/lifecycle/students/:id/admission-confirmation', verifyToken, async (req, res) => {
  try {
    if (!canManageLifecycle(req.user.role)) {
      return res.status(403).json({ error: 'Access Denied: Office/Admin role required' });
    }

    const student = await getLifecycleStudent(req, res, req.params.id);
    if (!student) return;
    await ensureLifecycleForStudent(student, { userId: req.user.id });

    const academicYear = req.body.academicYear || student.currentAcademicYear || await getCurrentAcademicYear();
    const studyYear = Number(req.body.studyYear || getStudyYear(student, academicYear));
    const semester = Number(req.body.semester || getSemesterForYear(studyYear, student.semester));

    const fee = await FeePayment.findOne({ student: student._id, academicYear, studyYear });
    const admission = await AdmissionConfirmation.findOneAndUpdate(
      { student: student._id, academicYear, studyYear },
      {
        $set: {
          studentId: student.studentId,
          semester,
          continuationVerified: req.body.continuationVerified ?? true,
          documentVerificationStatus: req.body.documentVerificationStatus || 'Verified',
          seatAllotmentStatus: req.body.seatAllotmentStatus || 'Confirmed',
          admissionStatus: 'Confirmed',
          feeVerificationStatus: fee?.outstandingBalance <= 0 ? 'Verified' : 'Due',
          confirmationDate: new Date(),
          approvingOfficer: toObjectId(req.user.id),
          remarks: req.body.remarks || 'Yearly admission confirmation completed'
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    student.currentAcademicYear = academicYear;
    student.currentStudyYear = studyYear;
    student.academicDetails.year = studyYear;
    student.semester = semester;
    student.admissionStatus.currentYear = 'Active';
    await student.save();

    const academicStatus = await syncAcademicStatus({
      student,
      academicYear,
      studyYear,
      semester,
      admission,
      fee,
      userId: req.user.id,
      remarks: req.body.remarks
    });

    await createNotification({
      student,
      title: `${academicYear} admission confirmed`,
      message: `Your ${studyYear}${studyYear === 1 ? 'st' : studyYear === 2 ? 'nd' : studyYear === 3 ? 'rd' : 'th'} year admission confirmation is complete.`,
      type: 'Admission',
      createdBy: req.user.id
    });

    res.json({ message: 'Admission confirmation recorded', admission, academicStatus, student });
  } catch (error) {
    console.error('Admission Confirmation Error:', error);
    res.status(500).json({ error: 'Failed to confirm yearly admission' });
  }
});

app.post('/api/lifecycle/students/:id/fee-confirmation', verifyToken, async (req, res) => {
  try {
    if (!canManageLifecycle(req.user.role)) {
      return res.status(403).json({ error: 'Access Denied: Office/Admin role required' });
    }

    const student = await getLifecycleStudent(req, res, req.params.id);
    if (!student) return;
    await ensureLifecycleForStudent(student, { userId: req.user.id });

    const academicYear = req.body.academicYear || student.currentAcademicYear || await getCurrentAcademicYear();
    const studyYear = Number(req.body.studyYear || getStudyYear(student, academicYear));
    const existing = await FeePayment.findOne({ student: student._id, academicYear, studyYear });
    const paidAmount = Number(req.body.paidAmount ?? existing?.paidAmount ?? student.feeDetails?.paidFee ?? 0);
    const feeBreakup = await calculateFeeBreakup(student, studyYear, paidAmount);

    const feeData = {
      ...feeBreakup,
      tuitionFee: Number(req.body.tuitionFee ?? feeBreakup.tuitionFee),
      universityFee: Number(req.body.universityFee ?? feeBreakup.universityFee),
      examFee: Number(req.body.examFee ?? feeBreakup.examFee),
      scholarshipAdjustment: Number(req.body.scholarshipAdjustment ?? feeBreakup.scholarshipAdjustment)
    };
    const totalFee = Math.max(0, feeData.tuitionFee + feeData.universityFee + feeData.examFee - feeData.scholarshipAdjustment);
    const outstandingBalance = Math.max(0, totalFee - paidAmount);
    const feeConfirmationStatus = outstandingBalance <= 0 ? 'Confirmed' : paidAmount > 0 ? 'Partially Paid' : 'Pending';

    const fee = await FeePayment.findOneAndUpdate(
      { student: student._id, academicYear, studyYear },
      {
        $set: {
          studentId: student.studentId,
          tuitionFee: feeData.tuitionFee,
          universityFee: feeData.universityFee,
          examFee: feeData.examFee,
          scholarshipAdjustment: feeData.scholarshipAdjustment,
          totalFee,
          paidAmount,
          outstandingBalance,
          paymentVerified: outstandingBalance <= 0,
          feeConfirmationStatus,
          receiptNumber: outstandingBalance <= 0 ? (existing?.receiptNumber || `FEE-${Date.now()}`) : existing?.receiptNumber,
          confirmationDate: outstandingBalance <= 0 ? new Date() : existing?.confirmationDate,
          approvingOfficer: toObjectId(req.user.id),
          remarks: req.body.remarks || ''
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (student.currentAcademicYear === academicYear && getStudyYear(student, academicYear) === studyYear) {
      student.feeDetails = {
        totalFee,
        paidFee: paidAmount,
        pendingFee: outstandingBalance
      };
      student.feeStatus.currentYear = outstandingBalance <= 0 ? 'Completed' : 'Pending';
      await student.save();
    }

    const admission = await AdmissionConfirmation.findOne({ student: student._id, academicYear, studyYear });
    const academicStatus = await syncAcademicStatus({
      student,
      academicYear,
      studyYear,
      semester: getSemesterForYear(studyYear, student.semester),
      admission,
      fee,
      userId: req.user.id,
      remarks: req.body.remarks
    });

    await createNotification({
      student,
      title: `${academicYear} fee status updated`,
      message: outstandingBalance <= 0
        ? 'Your yearly fee has been verified and confirmed.'
        : `Your current outstanding fee balance is Rs. ${outstandingBalance.toLocaleString('en-IN')}.`,
      type: 'Fee',
      createdBy: req.user.id
    });

    res.json({ message: 'Fee confirmation recorded', fee, academicStatus, student });
  } catch (error) {
    console.error('Fee Confirmation Error:', error);
    res.status(500).json({ error: 'Failed to confirm yearly fee' });
  }
});

app.post('/api/lifecycle/students/:id/promotions/recommend', verifyToken, async (req, res) => {
  try {
    if (!canManageLifecycle(req.user.role)) {
      return res.status(403).json({ error: 'Access Denied: Office/Admin role required' });
    }

    const student = await getLifecycleStudent(req, res, req.params.id);
    if (!student) return;
    await ensureLifecycleForStudent(student, { userId: req.user.id });

    const academicYear = student.currentAcademicYear || await getCurrentAcademicYear();
    const fromYear = getStudyYear(student, student.currentAcademicYear);
    const academicStatus = await AcademicYearStatus.findOne({ student: student._id, academicYear, studyYear: fromYear });

    if (!academicStatus || academicStatus.promotionStatus !== 'Eligible') {
      return res.status(400).json({ error: 'Student is not ready for promotion. Confirm yearly admission and fees first.' });
    }

    const targetStatus = fromYear === 4 ? 'Graduated' : 'Active';
    const promotion = await PromotionHistory.findOneAndUpdate(
      { student: student._id, academicYear, fromYear },
      {
        $set: {
          studentId: student.studentId,
          toYear: fromYear === 4 ? undefined : fromYear + 1,
          targetStatus,
          recommendationStatus: 'Pending HOD',
          recommendedBy: toObjectId(req.user.id),
          recommendedAt: new Date(),
          remarks: req.body.remarks || ''
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    academicStatus.promotionStatus = 'Recommended';
    academicStatus.remarks = req.body.remarks || academicStatus.remarks;
    await academicStatus.save();

    await createNotification({
      student,
      audienceRole: 'HOD',
      title: 'Promotion recommendation pending',
      message: `${student.personalDetails.studentName} is recommended for ${targetStatus === 'Graduated' ? 'graduation' : `Year ${fromYear + 1}`}.`,
      type: 'Promotion',
      createdBy: req.user.id
    });

    res.json({ message: 'Promotion recommendation sent to HOD', promotion, academicStatus });
  } catch (error) {
    console.error('Promotion Recommend Error:', error);
    res.status(500).json({ error: 'Failed to recommend promotion' });
  }
});

app.get('/api/lifecycle/promotions/pending', verifyToken, async (req, res) => {
  try {
    if (!requireLifecycleViewer(req, res)) return;

    let statusQuery = ['Pending HOD', 'HOD Approved', 'Pending Principal'];
    if (req.query.stage === 'hod') statusQuery = ['Pending HOD'];
    if (req.query.stage === 'principal') statusQuery = ['HOD Approved', 'Pending Principal'];

    const promotions = await PromotionHistory.find({ recommendationStatus: { $in: statusQuery } })
      .sort({ updatedAt: -1 })
      .populate('student', 'studentId personalDetails.studentName personalDetails.cetNumber academicDetails.branch currentStudyYear studentStatus feeDetails');

    const filtered = promotions.filter((promotion) => {
      if (!promotion.student) return false;
      if (req.user.role === 'HOD' && req.user.branch !== 'None') {
        return promotion.student.academicDetails?.branch === req.user.branch && promotion.recommendationStatus === 'Pending HOD';
      }
      if (req.user.role === 'Principal') return ['HOD Approved', 'Pending Principal'].includes(promotion.recommendationStatus);
      return true;
    });

    res.json(filtered);
  } catch (error) {
    console.error('Pending Promotions Error:', error);
    res.status(500).json({ error: 'Failed to fetch pending promotions' });
  }
});

app.post('/api/lifecycle/promotions/:id/hod-approve', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'HOD' && req.user.role !== 'Principal') {
      return res.status(403).json({ error: 'Access Denied: HOD role required' });
    }

    const promotion = await PromotionHistory.findById(req.params.id).populate('student');
    if (!promotion || !promotion.student) return res.status(404).json({ error: 'Promotion request not found' });

    if (req.user.role === 'HOD' && req.user.branch !== 'None' && promotion.student.academicDetails?.branch !== req.user.branch) {
      return res.status(403).json({ error: 'Access Denied: promotion is outside your branch' });
    }

    if (req.body.action === 'Reject') {
      promotion.recommendationStatus = 'HOD Rejected';
      promotion.remarks = req.body.remarks || promotion.remarks;
    } else {
      promotion.recommendationStatus = 'HOD Approved';
      promotion.hodApprovedBy = toObjectId(req.user.id);
      promotion.hodApprovedAt = new Date();
      promotion.remarks = req.body.remarks || promotion.remarks;
    }
    await promotion.save();

    const academicStatus = await AcademicYearStatus.findOne({
      student: promotion.student._id,
      academicYear: promotion.academicYear,
      studyYear: promotion.fromYear
    });
    if (academicStatus) {
      academicStatus.promotionStatus = promotion.recommendationStatus === 'HOD Approved' ? 'HOD Approved' : 'Hold';
      academicStatus.remarks = promotion.remarks;
      await academicStatus.save();
    }

    await createNotification({
      student: promotion.student,
      audienceRole: 'Principal',
      title: 'Promotion awaits final approval',
      message: `${promotion.student.personalDetails.studentName}'s promotion is ready for principal approval.`,
      type: 'Promotion',
      createdBy: req.user.id
    });

    res.json({ message: 'HOD promotion decision recorded', promotion });
  } catch (error) {
    console.error('HOD Promotion Approval Error:', error);
    res.status(500).json({ error: 'Failed to record HOD promotion decision' });
  }
});

app.post('/api/lifecycle/promotions/:id/principal-approve', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'Principal') {
      return res.status(403).json({ error: 'Access Denied: Principal role required' });
    }

    const promotion = await PromotionHistory.findById(req.params.id).populate('student');
    if (!promotion || !promotion.student) return res.status(404).json({ error: 'Promotion request not found' });
    if (!['HOD Approved', 'Pending Principal'].includes(promotion.recommendationStatus)) {
      return res.status(400).json({ error: 'Promotion must be approved by HOD before final approval' });
    }

    const student = await Student.findById(promotion.student._id);
    const currentAcademicYear = student.currentAcademicYear || promotion.academicYear;

    if (req.body.action === 'Reject') {
      promotion.recommendationStatus = 'Principal Rejected';
      promotion.remarks = req.body.remarks || promotion.remarks;
      await promotion.save();

      const academicStatus = await AcademicYearStatus.findOne({ student: student._id, academicYear: promotion.academicYear, studyYear: promotion.fromYear });
      if (academicStatus) {
        academicStatus.promotionStatus = 'Hold';
        academicStatus.remarks = promotion.remarks;
        await academicStatus.save();
      }

      return res.json({ message: 'Principal rejected promotion', promotion });
    }

    const graduating = promotion.fromYear === 4 || promotion.targetStatus === 'Graduated';
    const nextAcademicYear = getNextAcademicYear(currentAcademicYear);
    promotion.recommendationStatus = graduating ? 'Graduated' : 'Promoted';
    promotion.principalApprovedBy = toObjectId(req.user.id);
    promotion.principalApprovedAt = new Date();
    promotion.remarks = req.body.remarks || promotion.remarks;

    if (graduating) {
      student.studentStatus = 'Graduated';
      student.currentStudyYear = 4;
      student.academicDetails.year = 4;
      student.admissionStatus.currentYear = 'Graduated';
      student.feeStatus.currentYear = 'Completed';
    } else {
      const nextYear = promotion.toYear || promotion.fromYear + 1;
      student.studentStatus = 'Active';
      student.currentStudyYear = nextYear;
      student.academicDetails.year = nextYear;
      student.currentAcademicYear = nextAcademicYear;
      student.semester = getSemesterForYear(nextYear);

      const feeBreakup = await calculateFeeBreakup(student, nextYear, 0);
      student.feeDetails = {
        totalFee: feeBreakup.totalFee,
        paidFee: 0,
        pendingFee: feeBreakup.outstandingBalance
      };
      student.admissionStatus.previousYear = student.admissionStatus.currentYear;
      student.admissionStatus.currentYear = 'Pending Confirmation';
      student.feeStatus.previousYear = student.feeStatus.currentYear;
      student.feeStatus.currentYear = 'Pending';

      await AdmissionConfirmation.findOneAndUpdate(
        { student: student._id, academicYear: nextAcademicYear, studyYear: nextYear },
        {
          $setOnInsert: {
            studentId: student.studentId,
            semester: getSemesterForYear(nextYear),
            continuationVerified: false,
            documentVerificationStatus: 'Pending',
            seatAllotmentStatus: 'Confirmed',
            admissionStatus: 'Pending',
            feeVerificationStatus: 'Pending',
            remarks: 'Auto-created after promotion'
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      const fee = await FeePayment.findOneAndUpdate(
        { student: student._id, academicYear: nextAcademicYear, studyYear: nextYear },
        {
          $setOnInsert: {
            studentId: student.studentId,
            ...feeBreakup,
            paymentVerified: false,
            remarks: 'Auto-created after promotion'
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      await AcademicYearStatus.findOneAndUpdate(
        { student: student._id, academicYear: nextAcademicYear, studyYear: nextYear },
        {
          $setOnInsert: {
            studentId: student.studentId,
            semester: getSemesterForYear(nextYear),
            admissionStatus: 'Pending',
            feeStatus: fee.feeConfirmationStatus,
            promotionStatus: 'Not Started',
            remarks: 'Auto-created after promotion'
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    await student.save();
    await promotion.save();

    const academicStatus = await AcademicYearStatus.findOne({ student: student._id, academicYear: promotion.academicYear, studyYear: promotion.fromYear });
    if (academicStatus) {
      academicStatus.promotionStatus = graduating ? 'Graduated' : 'Promoted';
      academicStatus.remarks = promotion.remarks;
      academicStatus.approvalDate = new Date();
      academicStatus.approvedBy = toObjectId(req.user.id);
      await academicStatus.save();
    }

    await createNotification({
      student,
      title: graduating ? 'Graduation confirmed' : 'Promotion confirmed',
      message: graduating
        ? 'Congratulations. Your 4-year engineering lifecycle is marked as graduated.'
        : `You have been promoted to Year ${student.currentStudyYear}. Complete admission and fee confirmation for ${student.currentAcademicYear}.`,
      type: 'Promotion',
      createdBy: req.user.id
    });

    res.json({ message: graduating ? 'Student marked as graduated' : 'Student promoted successfully', promotion, student });
  } catch (error) {
    console.error('Principal Promotion Approval Error:', error);
    res.status(500).json({ error: 'Failed to record principal promotion decision' });
  }
});

app.get('/api/lifecycle/students/:id/admission-letter', verifyToken, async (req, res) => {
  try {
    if (!requireLifecycleViewer(req, res)) return;

    const student = await getLifecycleStudent(req, res, req.params.id);
    if (!student) return;
    await ensureLifecycleForStudent(student, { userId: req.user.id });

    const doc = new PDFDocument({ margin: 48 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Admission_Letter_${student.studentId || student.admissionNumber}.pdf`);
    doc.pipe(res);

    doc.fontSize(22).fillColor('#1d4ed8').text('Government Engineering College, Mosalehosahalli', { align: 'center' });
    doc.moveDown(0.5).fontSize(16).fillColor('#111827').text('Admission Confirmation Letter', { align: 'center' });
    doc.moveDown(1.5).fontSize(11).fillColor('#334155');
    doc.text(`Student ID: ${student.studentId || '-'}`);
    doc.text(`Admission Number: ${student.admissionNumber || '-'}`);
    doc.text(`Student Name: ${student.personalDetails.studentName}`);
    doc.text(`Branch: ${student.academicDetails.branch}`);
    doc.text(`Current Study Year: Year ${student.currentStudyYear || student.academicDetails.year || 1}`);
    doc.text(`Academic Year: ${student.currentAcademicYear || await getCurrentAcademicYear()}`);
    doc.moveDown();
    doc.text('This letter confirms that the above student is admitted into the engineering lifecycle management system and will continue through yearly admission, fee, and promotion verification workflows as per college rules.');
    doc.moveDown(2);
    doc.text('Authorized Office Signature', { align: 'right' });
    doc.end();
  } catch (error) {
    console.error('Admission Letter Error:', error);
    res.status(500).json({ error: 'Failed to generate admission letter' });
  }
});

app.get('/api/lifecycle/fee-payments/:id/receipt', verifyToken, async (req, res) => {
  try {
    if (!canViewLifecycle(req.user.role) && req.user.role !== 'student') {
      return res.status(403).json({ error: 'Access Denied' });
    }

    const fee = await FeePayment.findById(req.params.id).populate('student');
    if (!fee || !fee.student) return res.status(404).json({ error: 'Fee record not found' });

    if (req.user.role === 'student' && String(fee.student._id) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Access Denied: receipt is not yours' });
    }

    const doc = new PDFDocument({ margin: 48 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Fee_Receipt_${fee.receiptNumber || fee._id}.pdf`);
    doc.pipe(res);

    doc.fontSize(22).fillColor('#047857').text('GECM Fee Receipt', { align: 'center' });
    doc.moveDown(1).fontSize(11).fillColor('#111827');
    doc.text(`Receipt Number: ${fee.receiptNumber || 'Pending Final Receipt'}`);
    doc.text(`Student ID: ${fee.studentId}`);
    doc.text(`Student Name: ${fee.student.personalDetails.studentName}`);
    doc.text(`Academic Year: ${fee.academicYear}`);
    doc.text(`Study Year: Year ${fee.studyYear}`);
    doc.moveDown();
    doc.text(`Tuition Fee: Rs. ${fee.tuitionFee.toLocaleString('en-IN')}`);
    doc.text(`University Fee: Rs. ${fee.universityFee.toLocaleString('en-IN')}`);
    doc.text(`Exam Fee: Rs. ${fee.examFee.toLocaleString('en-IN')}`);
    doc.text(`Scholarship/SNQ Adjustment: Rs. ${fee.scholarshipAdjustment.toLocaleString('en-IN')}`);
    doc.text(`Paid Amount: Rs. ${fee.paidAmount.toLocaleString('en-IN')}`);
    doc.text(`Outstanding Balance: Rs. ${fee.outstandingBalance.toLocaleString('en-IN')}`);
    doc.moveDown();
    doc.text(`Fee Confirmation Status: ${fee.feeConfirmationStatus}`);
    doc.moveDown(2);
    doc.text('Authorized Office Signature', { align: 'right' });
    doc.end();
  } catch (error) {
    console.error('Fee Receipt Error:', error);
    res.status(500).json({ error: 'Failed to generate fee receipt' });
  }
});

// 10. Settings API
app.get('/api/fee-structure', verifyToken, async (req, res) => {
  try {
    const role = String(req.user.role || '').toLowerCase();
    if (role !== 'student' && !isOfficeReader(role)) return res.status(403).json({ error: 'Access denied' });
    const setting = await Setting.findOne({ key: 'feeStructure' }).lean();
    res.json(setting?.value || null);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load fee structure' });
  }
});

app.put('/api/office/fee-structure', verifyToken, async (req, res) => {
  try {
    if (!['staff', 'office'].includes(String(req.user.role || '').toLowerCase())) {
      return res.status(403).json({ error: 'Office role required' });
    }
    const { academicYear, rows, snqFees, accounts } = req.body || {};
    if (typeof academicYear !== 'string' || !/^\d{4}[-/]\d{2,4}$/.test(academicYear.trim())) {
      return res.status(400).json({ error: 'Enter a valid academic year.' });
    }
    if (!Array.isArray(rows) || rows.length < 1 || rows.length > 50) {
      return res.status(400).json({ error: 'Fee schedule must contain between 1 and 50 rows.' });
    }
    const cleanRows = [];
    for (const row of rows) {
      const year = String(row.year || '').trim().slice(0, 100);
      const branch = String(row.branch || '').trim().slice(0, 100);
      const amounts = ['tuition', 'admission', 'insurance', 'pd'].map((field) => Number(row[field]));
      if (!year || !branch || amounts.some((amount) => !Number.isFinite(amount) || amount < 0)) {
        return res.status(400).json({ error: 'Each row needs a year, branch, and valid non-negative amounts.' });
      }
      cleanRows.push({ year, branch, tuition: amounts[0], admission: amounts[1], insurance: amounts[2], pd: amounts[3], total: amounts.reduce((sum, amount) => sum + amount, 0) });
    }
    const cleanAmount = (value) => Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;
    const cleanAccount = (value) => /^\d{5,20}$/.test(String(value || '').trim()) ? String(value).trim() : null;
    const normalized = {
      academicYear: academicYear.trim(),
      rows: cleanRows,
      snqFees: { years2and3: cleanAmount(snqFees?.years2and3), year4: cleanAmount(snqFees?.year4) },
      accounts: { idp: cleanAccount(accounts?.idp), pd: cleanAccount(accounts?.pd), vtu: cleanAccount(accounts?.vtu) }
    };
    if (Object.values(normalized.snqFees).includes(null) || Object.values(normalized.accounts).includes(null)) {
      return res.status(400).json({ error: 'Enter valid SNQ amounts and 5–20 digit account numbers.' });
    }
    await Setting.findOneAndUpdate({ key: 'feeStructure' }, { value: normalized }, { upsert: true, new: true });
    res.json(normalized);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save fee structure' });
  }
});

app.get('/api/office/settings', verifyToken, async (req, res) => {
  try {
    const list = await Setting.find();
    const settingsObj = {};
    list.forEach(s => {
      settingsObj[s.key] = s.value;
    });
    
    // Return defaults if not fully populated
    res.json({
      departments: settingsObj.departments || ['CSE', 'ECE', 'ME', 'Civil'],
      courses: settingsObj.courses || ['B.E.', 'M.Tech'],
      academicYear: settingsObj.academicYear || '2026-2027'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.put('/api/office/settings', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'Staff' && req.user.role !== 'Office') {
      return res.status(403).json({ error: 'Access Denied: Office role required' });
    }

    const { departments, courses, academicYear } = req.body;

    if (departments) {
      await Setting.findOneAndUpdate({ key: 'departments' }, { value: departments }, { upsert: true });
    }
    if (courses) {
      await Setting.findOneAndUpdate({ key: 'courses' }, { value: courses }, { upsert: true });
    }
    if (academicYear) {
      await Setting.findOneAndUpdate({ key: 'academicYear' }, { value: academicYear }, { upsert: true });
    }

    res.json({ message: 'Settings updated successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Fee Plans API
app.get('/api/office/fee-plans', verifyToken, async (req, res) => {
  try {
    const plans = await FeePlan.find().sort({ batch: 1 });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch fee plans' });
  }
});

app.post('/api/office/fee-plans', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'Staff' && req.user.role !== 'Office' && req.user.role !== 'Principal' && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Access Denied' });
    }

    const { batch, year1, year2, year3, year4 } = req.body;
    
    if (!batch || !year1 || !year2 || !year3 || !year4) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const updatedPlan = await FeePlan.findOneAndUpdate(
      { batch: Number(batch) },
      { 
        batch: Number(batch),
        year1: Number(year1),
        year2: Number(year2),
        year3: Number(year3),
        year4: Number(year4) 
      },
      { upsert: true, new: true }
    );

    res.json({ message: 'Fee plan saved successfully!', plan: updatedPlan });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save fee plan: ' + error.message });
  }
});

app.delete('/api/office/fee-plans/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'Staff' && req.user.role !== 'Office' && req.user.role !== 'Principal' && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Access Denied' });
    }

    const deleted = await FeePlan.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Fee plan not found' });
    }

    res.json({ message: 'Fee plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete fee plan' });
  }
});

// 11. Database Backup & Restore (JSON-based)
app.get('/api/office/backup', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'Staff' && req.user.role !== 'Office') {
      return res.status(403).json({ error: 'Access Denied: Office role required' });
    }

    const [studentData, requestData, userData, settingsData] = await Promise.all([
      Student.find().lean(),
      Request.find().lean(),
      User.find().lean(),
      Setting.find().lean()
    ]);

    const backup = {
      timestamp: new Date().toISOString(),
      students: studentData,
      requests: requestData,
      users: userData,
      settings: settingsData
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=gecm_database_backup.json');
    res.send(JSON.stringify(backup, null, 2));
  } catch (error) {
    console.error('Backup Error:', error);
    res.status(500).json({ error: 'Failed to generate database backup' });
  }
});

app.post('/api/office/restore', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'Staff' && req.user.role !== 'Office') {
      return res.status(403).json({ error: 'Access Denied' });
    }

    const { students: restoreStudents, requests: restoreRequests, users: restoreUsers, settings: restoreSettings } = req.body;

    if (restoreStudents && Array.isArray(restoreStudents)) {
      await Student.deleteMany({});
      await Student.insertMany(restoreStudents);
    }
    if (restoreRequests && Array.isArray(restoreRequests)) {
      await Request.deleteMany({});
      await Request.insertMany(restoreRequests);
    }
    if (restoreUsers && Array.isArray(restoreUsers)) {
      await User.deleteMany({});
      await User.insertMany(restoreUsers);
    }
    if (restoreSettings && Array.isArray(restoreSettings)) {
      await Setting.deleteMany({});
      await Setting.insertMany(restoreSettings);
    }

    res.json({ message: 'Database restored successfully!' });
  } catch (error) {
    console.error('Restore Error:', error);
    res.status(500).json({ error: 'Failed to restore database: ' + error.message });
  }
});

// 12. Send notification reminders
app.post('/api/office/notifications/reminder', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'Staff' && req.user.role !== 'Office') {
      return res.status(403).json({ error: 'Access Denied: Office role required' });
    }

    const { email, type, message, studentName } = req.body;

    try {
      let transporter;
      if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
        transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
        });
      } else {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: { user: testAccount.user, pass: testAccount.pass }
        });
      }

      await transporter.sendMail({
        from: '"GECM Administration" <office@gecm.edu>',
        to: email,
        subject: `Urgent Notification: ${type}`,
        html: `<h3>Dear ${studentName || 'Student'},</h3>
               <p>This is a formal alert from GECM Administration office regarding: <b>${type}</b>.</p>
               <p>${message}</p>
               <p>Please resolve this immediately or visit the administration office.</p>`
      });
    } catch (mailErr) {
      console.log('Reminder mail failed: ', mailErr.message);
    }

    res.json({ message: 'Reminder notification email sent successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// 13. Face Recognition Integration
app.post('/api/office/face/register/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'Staff' && req.user.role !== 'Office') {
      return res.status(403).json({ error: 'Access Denied: Office role required' });
    }

    const { image, virtualSeed } = req.body;
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const seed = virtualSeed || student.studentId || student._id.toString() || student.personalDetails?.cetNumber || 'virtual-student';
    const virtualImage = image || `virtual:${seed}`;

    let embedding = [];
    try {
      const extractionPayload = image ? { image } : { virtualSeed: seed };
      const pyResponse = await axios.post('http://localhost:5001/extract', extractionPayload, { timeout: 30000 });
      if (!pyResponse.data.embedding?.length) {
        throw new Error(pyResponse.data.error || 'No face detected. Center the student face and try again.');
      }
      embedding = pyResponse.data.embedding;
    } catch (pyErr) {
      console.error('Python extraction failed, generating local fallback signature:', pyErr.message);
      if (image) {
        return res.status(422).json({ error: pyErr.message || 'Face detection failed. Center the student face and try again.' });
      }
      const hashStr = crypto.createHash('sha256').update(seed).digest('hex');
      for (let i = 0; i < 512; i++) {
        const slice = hashStr.slice((i * 2) % hashStr.length, ((i * 2) % hashStr.length) + 2) || '00';
        embedding.push(((parseInt(slice, 16) / 255) * 2) - 1);
      }
    }

    const persistedImage = image || `virtual:${seed}`;
    student.securityDetails = student.securityDetails || {};
    student.securityDetails.faceImageBase64 = persistedImage;
    student.securityDetails.faceEmbedding = Array.isArray(embedding) ? embedding : [];
    if (!Array.isArray(student.securityDetails.faceImages)) student.securityDetails.faceImages = [];
    if (!student.securityDetails.faceImages.includes(persistedImage)) student.securityDetails.faceImages.push(persistedImage);
    student.faceRegistered = true;

    await student.save();
    await FaceAuthentication.findOneAndUpdate(
      { studentRef: student._id },
      { studentId: student.studentId, studentRef: student._id, embedding, isActive: true, registeredAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ message: image ? 'Student face detected and registered successfully!' : 'Virtual face model registered successfully!', student: { id: student._id, studentId: student.studentId, faceRegistered: true } });
  } catch (error) {
    console.error('Face Register Error:', error);
    res.status(500).json({ error: 'Failed to register face: ' + error.message });
  }
});

app.get('/api/face/status/:studentId', verifyToken, async (req, res) => {
  try {
    const student = await Student.findOne({ studentId: req.params.studentId }).select('studentId faceRegistered');
    if (!student) return res.status(404).json({ error: 'Student not found' });
    if (req.user.role === 'student' && String(req.user.id) !== String(student._id)) return res.status(403).json({ error: 'Access denied' });
    res.json({ studentId: student.studentId, faceRegistered: Boolean(student.faceRegistered) });
  } catch (error) {
    res.status(500).json({ error: 'Unable to retrieve face status' });
  }
});

app.post('/api/office/face/recognize', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'Staff' && req.user.role !== 'Office' && req.user.role !== 'Principal') {
      return res.status(403).json({ error: 'Access Denied' });
    }

    const { image, virtualSeed, studentId } = req.body;
    const querySeed = virtualSeed || studentId || 'virtual-student';

    const studentsWithEmbeddings = await Student.find({
      'securityDetails.faceEmbedding': { $exists: true, $not: { $size: 0 } }
    }).select('studentId securityDetails.faceEmbedding securityDetails.faceImageBase64 personalDetails.studentName personalDetails.cetNumber academicDetails.branch admissionNumber feeDetails documents.photo');

    if (!studentsWithEmbeddings || studentsWithEmbeddings.length === 0) {
      return res.status(404).json({ error: 'No registered face datasets found in the database.' });
    }

    const searchList = studentsWithEmbeddings.map(s => ({
      id: s._id.toString(),
      embedding: s.securityDetails.faceEmbedding,
      referenceImage: s.securityDetails.faceImageBase64
    }));

    let matchId = null;
    let confidence = 0;
    let expression = null;
    try {
      const pyResponse = await axios.post('http://localhost:5001/recognize', {
        image: image || `virtual:${querySeed}`,
        virtualSeed: querySeed,
        students: searchList
      }, { timeout: 30000 });

      if (pyResponse.data.error) {
        return res.status(422).json({ error: pyResponse.data.error });
      }
      matchId = pyResponse.data.match;
      confidence = pyResponse.data.confidence;
      expression = pyResponse.data.expression || null;
    } catch (pyErr) {
      console.error('Python recognition request failed:', pyErr.message);

      if (image) {
        return res.status(503).json({ error: 'The Python face recognition service is unavailable. Start it and try again.' });
      }

      const targetSeed = querySeed || 'virtual-student';
      const queryVector = [];
      const hashStr = crypto.createHash('sha256').update(targetSeed).digest('hex');
      for (let i = 0; i < 512; i++) {
        const slice = hashStr.slice((i * 2) % hashStr.length, ((i * 2) % hashStr.length) + 2) || '00';
        queryVector.push(((parseInt(slice, 16) / 255) * 2) - 1);
      }

      let bestId = null;
      let highest = -1;
      for (const student of studentsWithEmbeddings) {
        const studentEmbedding = student.securityDetails.faceEmbedding || [];
        if (!studentEmbedding.length) continue;
        let dot = 0;
        for (let i = 0; i < studentEmbedding.length; i++) {
          dot += queryVector[i] * studentEmbedding[i];
        }
        if (dot > highest) {
          highest = dot;
          bestId = student._id.toString();
        }
      }
      matchId = bestId;
      confidence = Number((highest || 0).toFixed(3));
    }

    if (!matchId) {
      return res.json({ match: null, message: 'Face not recognized. No matches found.' });
    }

    const matchedStudent = await Student.findById(matchId).select('-securityDetails.password');
    res.json({
      match: matchedStudent,
      confidence,
      expression
    });
  } catch (error) {
    console.error('Face Recognize API Error:', error);
    res.status(500).json({ error: 'Face recognition failed' });
  }
});

// 14. Daily/Departmental Fee Reports Aggregates
app.get('/api/office/reports/data', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'Staff' && req.user.role !== 'Office' && req.user.role !== 'Principal') {
      return res.status(403).json({ error: 'Access Denied' });
    }

    const { reportType } = req.query;

    if (reportType === 'department') {
      const deptsStats = await Student.aggregate([
        { $match: { approvalStatus: 'Approved' } },
        {
          $group: {
            _id: '$academicDetails.branch',
            studentCount: { $sum: 1 },
            feesCollected: { $sum: '$feeDetails.paidFee' },
            feesPending: { $sum: '$feeDetails.pendingFee' }
          }
        }
      ]);
      return res.json(deptsStats);
    } else if (reportType === 'daily') {
      // Daily admissions for current month
      const dailyAdmissions = await Student.aggregate([
        {
          $match: {
            approvalStatus: 'Approved',
            createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 30)) }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            admissionsCount: { $sum: 1 },
            feesCollected: { $sum: '$feeDetails.paidFee' }
          }
        },
        { $sort: { _id: 1 } }
      ]);
      return res.json(dailyAdmissions);
    } else if (reportType === 'feeLog') {
      // Lists all fee history events
      const list = await Student.find({ approvalStatus: 'Approved' }).select('personalDetails.studentName admissionNumber feeHistory');
      const log = [];
      list.forEach(s => {
        if (s.feeHistory) {
          s.feeHistory.forEach(h => {
            log.push({
              studentName: s.personalDetails.studentName,
              admissionNumber: s.admissionNumber,
              amount: h.amount,
              date: h.date,
              transactionId: h.transactionId,
              receiptNumber: h.receiptNumber,
              paymentMode: h.paymentMode,
              remarks: h.remarks
            });
          });
        }
      });
      // Sort by date descending
      log.sort((a, b) => new Date(b.date) - new Date(a.date));
      return res.json(log);
    }

    res.status(400).json({ error: 'Invalid report type requested' });
  } catch (error) {
    console.error('Reports Data Query Error:', error);
    res.status(500).json({ error: 'Failed to generate report dataset' });
  }
});

const clientBuildPath = path.join(__dirname, '..', 'dist');
app.use(express.static(clientBuildPath));
app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`GECM portal listening on port ${PORT}`);
});
