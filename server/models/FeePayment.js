const mongoose = require('mongoose');

const feePaymentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  studentId: { type: String, required: true, index: true },
  academicYear: { type: String, required: true, index: true },
  studyYear: { type: Number, required: true, min: 1, max: 4, index: true },
  tuitionFee: { type: Number, default: 0 },
  universityFee: { type: Number, default: 0 },
  examFee: { type: Number, default: 0 },
  scholarshipAdjustment: { type: Number, default: 0 },
  idpTuitionFee: { type: Number, default: 0 },
  vtuAdmissionFee: { type: Number, default: 0 },
  vtuInsuranceFee: { type: Number, default: 0 },
  pdFee: { type: Number, default: 0 },
  snqAdjustment: { type: Number, default: 0 },
  totalFee: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  outstandingBalance: { type: Number, default: 0, index: true },
  paymentVerified: { type: Boolean, default: false },
  feeConfirmationStatus: {
    type: String,
    enum: ['Pending', 'Partially Paid', 'Confirmed', 'Due', 'Waived'],
    default: 'Pending',
    index: true
  },
  receiptNumber: { type: String },
  confirmationDate: { type: Date },
  approvingOfficer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  payments: [{
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    academicYear: { type: String },
    studyYear: { type: Number, min: 1, max: 4 },
    account: { type: String, enum: ['IDP A/C', 'VTU A/C', 'PD A/C'], default: 'PD A/C' },
    transactionId: { type: String },
    receiptNumber: { type: String },
    paymentMode: { type: String },
    remarks: { type: String },
    receiptFileName: { type: String },
    receiptMimeType: { type: String },
    receiptData: { type: String }
  }],
  accountReceipts: [{
    account: { type: String, enum: ['IDP A/C', 'VTU A/C', 'PD A/C'], required: true },
    receiptFileName: { type: String },
    receiptMimeType: { type: String },
    receiptData: { type: String }
  }],
  remarks: { type: String, default: '' }
}, { timestamps: true });

feePaymentSchema.index({ student: 1, academicYear: 1, studyYear: 1 }, { unique: true });

module.exports = mongoose.model('FeePayment', feePaymentSchema);
