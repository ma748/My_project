const mongoose = require('mongoose');

const promotionHistorySchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  studentId: { type: String, required: true, index: true },
  academicYear: { type: String, required: true, index: true },
  fromYear: { type: Number, required: true, min: 1, max: 4 },
  toYear: { type: Number, min: 2, max: 4 },
  targetStatus: { type: String, enum: ['Active', 'Graduated'], default: 'Active' },
  recommendationStatus: {
    type: String,
    enum: ['Pending HOD', 'HOD Approved', 'HOD Rejected', 'Pending Principal', 'Principal Approved', 'Principal Rejected', 'Promoted', 'Graduated', 'Cancelled'],
    default: 'Pending HOD',
    index: true
  },
  recommendedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recommendedAt: { type: Date, default: Date.now },
  hodApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  hodApprovedAt: { type: Date },
  principalApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  principalApprovedAt: { type: Date },
  remarks: { type: String, default: '' }
}, { timestamps: true });

promotionHistorySchema.index({ student: 1, academicYear: 1, fromYear: 1 }, { unique: true });

module.exports = mongoose.model('PromotionHistory', promotionHistorySchema);
