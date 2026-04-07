/**
 * Use Case: Device registration business logic
 */
const Device = require('../entities/Device');

class DeviceRegistrationUseCase {
  constructor(deviceRepo, logger) {
    this.deviceRepo = deviceRepo;
    this.logger = logger;
  }

  async execute(deviceId, originalName, department, currentIp) {
    const existing = await this.deviceRepo.findByDeviceId(deviceId);
    
    const deviceData = existing ? {
      ...existing,
      originalName,
      department,
      lastKnownIp: currentIp,
      lastSeen: new Date()
    } : {
      deviceId,
      originalName,
      department,
      lastKnownIp: currentIp,
      lastSeen: new Date(),
      status: 'SAFE'
    };

    const device = new Device(deviceData);
    const saved = await this.deviceRepo.save(device);
    
    const msg = existing ? 'updated' : 'registered';
    await this.logger.safe(deviceId, currentIp || 'setup', `Device ${msg}`);
    
    return saved;
  }
}

module.exports = DeviceRegistrationUseCase;

