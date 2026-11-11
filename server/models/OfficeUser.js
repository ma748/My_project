const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const officeUserSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  mobile: { type: String, trim: true },
  username: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'hod', 'principal'], required: true, index: true },
  department: { type: String, trim: true },
  branch: { type: String, trim: true },
  accountStatus: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  firstLogin: { type: Boolean, default: true }
}, { timestamps: true });

officeUserSchema.pre('save', async function() {
  if (this.isModified('passwordHash')) this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});
officeUserSchema.methods.comparePassword = function(password) {
  return bcrypt.compare(password, this.passwordHash);
};

module.exports = mongoose.model('OfficeUser', officeUserSchema);
