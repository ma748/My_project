const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = new mongoose.Schema({
  personalDetails: {
    cetNumber: { type: String, required: true, unique: true },
    cetRank: { type: Number, required: true },
    cetRank: { type: Number, default: 0 },
    studentName: { type: String, required: true },
    dob: { type: Date, required: true },
    gender: { type: String, required: true },
    bloodGroup: { type: String, required: true },
    religion: { type: String, required: true },
    category: { type: String, required: true },
    subCaste: { type: String },
    dob: { type: Date, default: () => new Date('2005-01-01') },
    gender: { type: String, default: 'Male' },
    bloodGroup: { type: String, default: 'O+' },
    religion: { type: String, default: 'Hindu' },
    category: { type: String, default: 'General' },
    subCaste: { type: String, default: '' },
    aadhaarNumber: { type: String, required: true, unique: true },
    physicallyChallenged: { type: String, default: 'No' },
  },
  familyDetails: {
    fatherName: { type: String, required: true },
    motherName: { type: String, required: true },
    parentContact: { type: String, required: true },
    fatherOccupation: { type: String, required: true },
    motherOccupation: { type: String, required: true },
    annualIncome: { type: Number, required: true },
    fatherName: { type: String, default: 'Not Provided' },
    motherName: { type: String, default: 'Not Provided' },
    parentContact: { type: String, default: '9876543210' },
    fatherOccupation: { type: String, default: 'Not Provided' },
    motherOccupation: { type: String, default: 'Not Provided' },
    annualIncome: { type: Number, default: 250000 },
  },
  academicDetails: {
    qualifyingExam: { type: String, required: true },
    board: { type: String, required: true },
    state: { type: String, required: true },
    region: { type: String, required: true },
    allottedCategory: { type: String, required: true },
    branch: { type: String, required: true },
    qualifyingExam: { type: String, default: 'PUC' },
    board: { type: String, default: 'Karnataka State Board' },
    state: { type: String, default: 'Karnataka' },
    region: { type: String, default: 'Urban' },
    allottedCategory: { type: String, default: 'General' },
    branch: { type: String, default: 'CSE' },
    year: { type: Number, default: 1 },
    feeCollected: { type: Number, required: true },
    feeCollected: { type: Number, default: 0 },
    feeCollectedIdp: { type: Number, default: 0, min: 0 },
    feeCollectedVtu: { type: Number, default: 0, min: 0 },
    feeCollectedPd: { type: Number, default: 0, min: 0 },
    percentage: { type: Number },
    diplomaMarks: { type: Number },
    lateralEntry: { type: String, default: 'No' },
    distance: { type: Number },
  },
  contactDetails: {
    studentContact: { type: String, required: true },
    studentContact: { type: String, default: '9876543210' },
    email: { type: String, required: true, unique: true },
    permanentAddress: { type: String, required: true },
    correspondenceAddress: { type: String, required: true },
    sameAsPermanent: { type: Boolean, default: false },
    permanentAddress: { type: String, default: 'Hassan, Karnataka' },
    correspondenceAddress: { type: String, default: 'Hassan, Karnataka' },
    sameAsPermanent: { type: Boolean, default: true },
    defenceQuota: { type: String, default: 'No' },
    sportsQuota: { type: String, default: 'No' },
    snqQuota: { type: String, default: 'No' },
    stayingAtHostel: { type: String, default: 'No' },
    stayingInsideDistrict: { type: String, default: 'No' },
    stayingOutsideDistrict: { type: String, default: 'No' },
    nspReferenceNo: { type: String },
    nspOtrNo: { type: String },
    sspOtrNo: { type: String },
    ntfNumber: { type: String },
  },
  securityDetails: {
    password: { type: String, required: true },
    securityQuestion: { type: String, required: true },
    securityAnswer: { type: String, required: true },
    faceImageBase64: { type: String },
    faceEmbedding: { type: [Number] },
    faceImages: [{ type: String }]
  },
  admissionNumber: { type: String, unique: true, sparse: true },
  studentId: { type: String, unique: true, sparse: true, index: true },
  admissionType: { type: String, enum: ['Regular', 'Lateral Entry'], default: 'Regular', index: true },
  // Lateral-entry specific information belongs to the same permanent student record.
  lateralEntryDetails: {
    dcetNumber: { type: String, sparse: true, index: true },
    dcetRank: { type: Number },
    previousInstitution: { type: String },
    previousUniversity: { type: String },
    joiningSemester: { type: Number, default: 3 },
    diplomaBoard: { type: String },
    diplomaState: { type: String },
    diplomaTotalMarks: { type: Number },
    diplomaPercentage: { type: Number },
    documents: [{ name: String, type: String, data: String, uploadedAt: Date }]
  },
  // Used only to preserve credentials for legacy lateral accounts whose initial
  // password was already changed before migration. It is never returned by APIs.
  legacyPasswordHash: { type: String, select: false },
  faceRegistered: { type: Boolean, default: false, index: true },
  credentials: {
    username: { type: String, unique: true, sparse: true },
    initialPassword: { type: String, select: false },
    passwordChangeRequired: { type: Boolean, default: true }
  },
  currentAcademicYear: { type: String, default: '2026-2027' },
  currentStudyYear: { type: Number, default: 1, min: 1, max: 4 },
  studentStatus: {
    type: String,
    enum: ['Applicant', 'Active', 'On Hold', 'Graduated', 'Rejected'],
    default: 'Applicant',
    index: true
  },
  admissionQuota: {
    type: String,
    enum: ['CET', 'Management', 'SNQ', 'KEA-Regular', 'KEA-SNQ', 'Lateral Entry', 'Other'],
    default: 'CET'
  },
  section: { type: String, default: 'A' },
  semester: { type: Number, default: 1 },
  approvalStatus: { type: String, default: 'Pending', enum: ['Pending', 'Approved', 'Rejected'] },
  rejectionReason: { type: String },
  documents: {
    aadhaar: { type: String },
    marksCard: { type: String },
    photo: { type: String }
  },
  admissionStatus: {
    previousYear: { type: String, default: 'Inactive' },
    currentYear: { type: String, default: 'Active' }
  },
  feeDetails: {
    totalFee: { type: Number, default: 85000 },
    paidFee: { type: Number, default: 0 },
    pendingFee: { type: Number, default: 85000 },
    accountBreakdown: {
      idp: { type: Number, default: 0 },
      vtu: { type: Number, default: 0 },
      pd: { type: Number, default: 0 }
    }
  },
  feeHistory: [{
    amount: { type: Number },
    date: { type: Date, default: Date.now },
    academicYear: { type: String },
    studyYear: { type: Number, min: 1, max: 4 },
    transactionId: { type: String },
    receiptNumber: { type: String },
    paymentMode: { type: String },
    remarks: { type: String },
    receiptFileName: { type: String },
    receiptMimeType: { type: String },
    account: {
      type: String,
      enum: ['KEA', 'IDP A/C', 'VTU A/C', 'PD A/C'],
      default: 'PD A/C'
    }
  }],
  feeStatus: {
    previousYear: { type: String, default: 'Completed' },
    currentYear: { type: String, default: 'Pending' }
  },
  admissionBatch: { type: Number, default: 2026 },
  role: { type: String, default: 'student' },
  createdAt: { type: Date, default: Date.now },
});

// Performance compound indexes for lightning-fast queries & filtering
studentSchema.index({ 'academicDetails.branch': 1, currentStudyYear: 1 });
studentSchema.index({ approvalStatus: 1, admissionType: 1 });
studentSchema.index({ 'personalDetails.studentName': 1 });
studentSchema.index({ 'personalDetails.cetNumber': 1 });
studentSchema.index({ 'feeStatus.currentYear': 1 });
studentSchema.index({ admissionBatch: 1 });
studentSchema.index({ createdAt: -1 });

// Pre-save hook to automatically hash password before saving to DB
studentSchema.pre('save', async function() {
  if (!this.isModified('securityDetails.password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.securityDetails.password = await bcrypt.hash(this.securityDetails.password, salt);
});

// Method to verify password
studentSchema.methods.comparePassword = async function(candidatePassword) {
  if (this.securityDetails?.password && await bcrypt.compare(candidatePassword, this.securityDetails.password)) return true;
  return this.legacyPasswordHash ? bcrypt.compare(candidatePassword, this.legacyPasswordHash) : false;
};

module.exports = mongoose.model('Student', studentSchema);
