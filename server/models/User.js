const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    required: true,
    enum: ['Principal', 'HOD', 'Staff', 'Admin']
  },
  branch: { 
    type: String,
    required: function() { return this.role === 'HOD'; },
    enum: ['CSE', 'ECE', 'ME', 'Civil', 'None'] // 'None' for other roles if needed
  },
  createdAt: { type: Date, default: Date.now },
});

// Pre-save hook to automatically hash password before saving to DB
userSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to verify password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
