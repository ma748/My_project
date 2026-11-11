const mongoose = require('mongoose');

const studentCredentialSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true, index: true },
  studentRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', index: true },
  lateralRef: { type: mongoose.Schema.Types.ObjectId, ref: 'LateralEntryStudent', sparse: true },
  username: { type: String, required: true, unique: true },
  initialPassword: { type: String, select: false },
  passwordChangeRequired: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  lastLoginAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('StudentCredential', studentCredentialSchema);
