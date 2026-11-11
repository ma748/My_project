const mongoose = require('mongoose');

const academicYearStatusSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  studentId: { type: String, required: true, index: true },
  academicYear: { type: String, required: true, index: true },
  studyYear: { type: Number, required: true, min: 1, max: 4, index: true },
  semester: { type: Number, required: true, min: 1, max: 8 },
  admissionStatus: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Rejected', 'Graduated'],
    default: 'Pending',
    index: true
  },
  feeStatus: {
    type: String,
    enum: ['Pending', 'Partially Paid', 'Confirmed', 'Due', 'Waived'],
    default: 'Pending',
    index: true
  },
  promotionStatus: {
    type: String,
    enum: ['Not Started', 'Eligible', 'Recommended', 'HOD Approved', 'Principal Approved', 'Promoted', 'Graduated', 'Hold'],
    default: 'Not Started',
    index: true
  },
  remarks: { type: String, default: '' },
  approvalDate: { type: Date },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

academicYearStatusSchema.index({ student: 1, academicYear: 1, studyYear: 1 }, { unique: true });

module.exports = mongoose.model('AcademicYearStatus', academicYearStatusSchema);
