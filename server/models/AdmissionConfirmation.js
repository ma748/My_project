const mongoose = require('mongoose');

const admissionConfirmationSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  studentId: { type: String, required: true, index: true },
  academicYear: { type: String, required: true, index: true },
  studyYear: { type: Number, required: true, min: 1, max: 4, index: true },
  semester: { type: Number, required: true, min: 1, max: 8 },
  continuationVerified: { type: Boolean, default: false },
  documentVerificationStatus: {
    type: String,
    enum: ['Pending', 'Verified', 'Rejected'],
    default: 'Pending'
  },
  seatAllotmentStatus: {
    type: String,
    enum: ['Pending', 'Allotted', 'Confirmed'],
    default: 'Pending'
  },
  admissionStatus: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Rejected'],
    default: 'Pending',
    index: true
  },
  feeVerificationStatus: {
    type: String,
    enum: ['Pending', 'Verified', 'Due'],
    default: 'Pending'
  },
  confirmationDate: { type: Date },
  approvingOfficer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  remarks: { type: String, default: '' }
}, { timestamps: true });

admissionConfirmationSchema.index({ student: 1, academicYear: 1, studyYear: 1 }, { unique: true });

module.exports = mongoose.model('AdmissionConfirmation', admissionConfirmationSchema);
