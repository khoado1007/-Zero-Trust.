const ILoggerService = require('../../application/services/ILoggerService');
const ISecurityLogRepository = require('../../application/repositories/ISecurityLogRepository');

/**
 * Adapter: Domain Logger -> Socket.IO + Mongo composite
 * Composite pattern for multiple logging concerns
 */
class SocketLoggerAdapter extends ILoggerService {
  constructor(io, logRepo) {
    super();
    this.io = io;
    this.logRepo = logRepo;
  }

  async #log(level, deviceId, ip, message, actionTaken = null, type = 'INFO') {
    // Persist to Mongo
    await this.logRepo.create({
      deviceId,
      ip,
      action: actionTaken || level,
      message: `${level}: ${message}`
    });

    // Emit socket
    this.io.emit('security_log', {
      deviceId,
      deviceName: 'N/A',
      ip,
      action: level,
      message,
      timestamp: new Date().toISOString(),
      type
    });
  }

  async safe(deviceId, ip, message, actionTaken = 'Allowed') {
    await this.#log('SAFE', deviceId, ip, message, actionTaken, 'SAFE');
  }

  async critical(deviceId, ip, message, actionTaken = 'Blocked') {
    await this.#log('CRITICAL', deviceId, ip, message, actionTaken, 'CRITICAL');
  }

  async warn(deviceId, ip, message) {
    await this.#log('WARNING', deviceId, ip, message, 'Warning', 'WARNING');
  }
}

module.exports = SocketLoggerAdapter;

