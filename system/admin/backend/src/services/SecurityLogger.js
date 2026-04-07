const SecurityLog = require('../models/nosql/SecurityLog');

class SecurityLogger {
  constructor(io) {
    this.io = io;
  }

async log(deviceId, ipAddress, status, message, actionTaken, allowedIps = null, type = 'INFO') {
    try {
      // Create MongoDB log
      const logEntry = await SecurityLog.create({
        deviceId,
        ip: ipAddress,
        action: actionTaken,
        message: `${status}: ${message}`,
        deviceName: 'N/A'  // Optional
      });

      // Emit to frontend via Socket.IO (no allowedIps for radar)
      this.io.emit('security_log', {
        type,
        device_id: deviceId,
        message,
        time: new Date().toLocaleTimeString()
      });

      return logEntry;
    } catch (error) {
      console.error('Logging error:', error);
      throw error;
    }
  }

  async criticalLog(deviceId, ipAddress, message, actionTaken = 'Blocked', allowedIps = null) {
    return this.log(deviceId, ipAddress, 'CRITICAL', message, actionTaken, allowedIps, 'CRITICAL');
  }

  async safeLog(deviceId, ipAddress, message, actionTaken = 'Allowed', allowedIps = null) {
    return this.log(deviceId, ipAddress, 'SAFE', message, actionTaken, allowedIps, 'SAFE');
  }
}

module.exports = SecurityLogger;

