const mongoose = require('mongoose');

const loginLogSchema = new mongoose.Schema({
  userId: { type: String, index: true },
  userType: { type: String, enum: ['student', 'office'], required: true },
  role: { type: String },
  action: { type: String, enum: ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_CHANGED', 'FACE_AUTH_SUCCESS', 'FACE_AUTH_FAILED'], required: true },
  loginStatus: { type: String, enum: ['success', 'failed'], required: true },
  ipAddress: { type: String }
}, { timestamps: { createdAt: 'timestamp', updatedAt: false } });

module.exports = mongoose.model('LoginLog', loginLogSchema);
