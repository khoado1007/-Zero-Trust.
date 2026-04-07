const mongoose = require('mongoose');

const securityLogSchema = new mongoose.Schema({
  deviceId: { type: String, required: true },
  deviceName: { type: String },
  ip: { type: String, required: true },
  action: { type: String }, // e.g., 'LOCKED', 'SAFE', 'CRITICAL'
  message: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SecurityLog', securityLogSchema);
