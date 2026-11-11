const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const documentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, default: 'Document' },
  data: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const progressSchema = new mongoose.Schema({
  semester: { type: Number, default: 3 },
  cgpa: { type: Number, default: 0 },
  creditsEarned: { type: Number, default: 0 },
  backlogs: { type: Number, default: 0 },
  mentorRemarks: { type: String, default: '' }
}, { _id: false });

const lateralEntryStudentSchema = new mongoose.Schema({
  studentId: { type: String, unique: true, sparse: true, index: true },
  academicBatch: { type: String, required: true, index: true },
  credentials: {
    username: { type: String, unique: true, sparse: true },
    initialPassword: { type: String, select: false },
    passwordChangeRequired: { type: Boolean, default: true }
  },
  // Kept separate from the office-visible initial password. Only this hash is
  // used to authenticate a lateral-entry student.
  passwordHash: { type: String, required: true, select: false },
  admissionNumber: { type: String, unique: true, sparse: true },
  studentName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true },
  phone: { type: String, required: true, trim: true },
  admissionYear: { type: Number, required: true },
  branch: { type: String, required: true },
  directAdmissionYear: { type: Number, default: 2 },
  previousQualification: { type: String, required: true },
  previousCollege: { type: String, required: true },
  previousUniversity: { type: String, default: '' },
  joiningSemester: { type: Number, default: 3 },
  diplomaPercentage: { type: Number, default: 0 },
  universitySeatNumber: { type: String, trim: true },
  feeStatus: {
    type: String,
    enum: ['Paid', 'Partial', 'Pending'],
    default: 'Pending'
  },
  totalFee: { type: Number, default: 85000 },
  paidFee: { type: Number, default: 0 },
  academicProgress: { type: progressSchema, default: () => ({}) },
  certificates: {
    transferCertificate: { type: String },
    migrationCertificate: { type: String },
    eligibilityCertificate: { type: String }
  },
  documents: { type: [documentSchema], default: [] },
  status: {
    type: String,
    enum: ['Active', 'Graduated', 'On Hold'],
    default: 'Active'
  },
  createdBy: { type: String },
  updatedBy: { type: String }
  ,
  migratedStudentRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', index: true },
  migratedAt: { type: Date }
}, { timestamps: true });

lateralEntryStudentSchema.pre('save', async function() {
  if (!this.isModified('passwordHash')) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
});

lateralEntryStudentSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

lateralEntryStudentSchema.index({
  studentName: 'text',
  admissionNumber: 'text',
  email: 'text',
  phone: 'text',
  previousCollege: 'text'
});

module.exports = mongoose.model('LateralEntryStudent', lateralEntryStudentSchema);
