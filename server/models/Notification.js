const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', index: true },
  studentId: { type: String, index: true },
  audienceRole: {
    type: String,
    enum: ['Student', 'Office', 'HOD', 'Principal', 'All'],
    default: 'Student',
    index: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ['Admission', 'Fee', 'Promotion', 'Academic', 'System'],
    default: 'System'
  },
  read: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
