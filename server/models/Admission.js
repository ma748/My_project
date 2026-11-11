const mongoose = require('mongoose');

const admissionSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true, index: true },
  studentRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', index: true },
  lateralRef: { type: mongoose.Schema.Types.ObjectId, ref: 'LateralEntryStudent', sparse: true },
  admissionNumber: { type: String, unique: true, sparse: true },
  admissionType: {
    type: String,
    enum: ['Regular', 'Lateral Entry'],
    default: 'Regular'
  },
  batch: { type: String, required: true, index: true },
  batchYear: { type: Number, required: true, index: true },
  department: { type: String, required: true, index: true },
  admissionYear: { type: Number, required: true },
  joiningSemester: { type: Number, default: 1 },
  approvalStatus: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
    index: true
  },
  admissionStatus: {
    previousYear: { type: String, default: 'Inactive' },
    currentYear: { type: String, default: 'Active' }
  },
  previousInstitution: { type: String },
  previousUniversity: { type: String }
}, { timestamps: true });

admissionSchema.index({ batch: 1, department: 1 });
admissionSchema.index({ studentId: 'text', admissionNumber: 'text' });

module.exports = mongoose.model('Admission', admissionSchema);
