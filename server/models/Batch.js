const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  startYear: { type: Number, required: true, unique: true, index: true },
  endYear: { type: Number, required: true },
  label: { type: String, required: true, unique: true, index: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Batch', batchSchema);
