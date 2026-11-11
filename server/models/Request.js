const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  studentName: { type: String, required: true },
  studentId: { type: String, required: true },
  branch: { type: String, required: true },
  type: { 
    type: String, 
    required: true,
    enum: ['Leave', 'Fee Extension', 'Document Approval', 'Student Detail Edit', 'Other']
  },
  reason: { type: String, required: true },
  studentRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', index: true },
  studentType: { type: String, enum: ['regular', 'lateral'], default: 'regular' },
  requestedChanges: { type: mongoose.Schema.Types.Mixed },
  officeDueAt: { type: Date },
  officeReply: { type: String, default: '' },
  reviewedAt: { type: Date },
  status: { 
    type: String, 
    default: 'Pending',
    enum: ['Pending', 'Approved', 'Rejected']
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Request', requestSchema);
