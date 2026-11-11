const mongoose = require('mongoose');

const feePlanSchema = new mongoose.Schema({
  batch: { type: Number, required: true, unique: true }, // e.g. 2024, 2025
  year1: { type: Number, required: true }, // e.g. 70000
  year2: { type: Number, required: true }, // e.g. 62000
  year3: { type: Number, required: true }, // e.g. 55000
  year4: { type: Number, required: true }, // e.g. 50000
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FeePlan', feePlanSchema);
