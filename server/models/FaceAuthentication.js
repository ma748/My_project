const mongoose = require('mongoose');

// The embedding is deliberately select:false: it is never returned by API reads.
const faceAuthenticationSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true, index: true },
  studentRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, unique: true },
  embedding: { type: [Number], required: true, select: false },
  isActive: { type: Boolean, default: true },
  registeredAt: { type: Date, default: Date.now },
  lastVerifiedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('FaceAuthentication', faceAuthenticationSchema);
