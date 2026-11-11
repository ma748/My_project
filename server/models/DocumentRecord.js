const mongoose = require('mongoose');

const documentRecordSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  studentId: { type: String, required: true, index: true },
  documentType: {
    type: String,
    enum: ['Aadhaar', 'Marks Card', 'Photo', 'Admission Letter', 'Fee Receipt', 'Other'],
    required: true
  },
  academicYear: { type: String },
  fileData: { type: String },
  verificationStatus: {
    type: String,
    enum: ['Pending', 'Verified', 'Rejected'],
    default: 'Pending'
  },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: { type: Date },
  remarks: { type: String, default: '' }
}, { timestamps: true });

documentRecordSchema.index({ student: 1, documentType: 1, academicYear: 1 });

module.exports = mongoose.model('DocumentRecord', documentRecordSchema);
