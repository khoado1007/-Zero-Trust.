/**
 * Port/Interface: Security logging persistence
 */
class ISecurityLogRepository {
  async create({ deviceId, ip, action, message, deviceName }) {
    throw new Error('Must implement create');
  }

  async findRecent(limit = 100) {
    throw new Error('Must implement findRecent');
  }
}

module.exports = ISecurityLogRepository;

