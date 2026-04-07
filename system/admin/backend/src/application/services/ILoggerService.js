/**
 * Port/Interface: Cross-cutting logging (console + DB + socket)
 */
class ILoggerService {
  async safe(deviceId, ip, message, action = 'Allowed') {
    throw new Error('Must implement safe');
  }

  async critical(deviceId, ip, message, action = 'Blocked') {
    throw new Error('Must implement critical');
  }

  async warn(deviceId, ip, message) {
    throw new Error('Must implement warn');
  }
}

module.exports = ILoggerService;

