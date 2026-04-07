/**
 * Use Case: Device access evaluation orchestration (extracted from DeviceController)
 */
const Device = require('../entities/Device');
const { getPolicyForDepartment } = require('../policies/AccessPolicy');

class DeviceAccessUseCase {
  constructor(deviceRepo, ruleRepo, logRepo, logger) {
    this.deviceRepo = deviceRepo;
    this.ruleRepo = ruleRepo;
    this.logRepo = logRepo;
    this.logger = logger;
  }

  async evaluate(deviceId, currentIp) {
    // Fetch & hydrate domain model
    const deviceData = await this.deviceRepo.findByDeviceId(deviceId);
    if (!deviceData) {
      this.logger.warn(deviceId, currentIp, 'Device not registered');
      return { status: 'LOCKED', reason: 'Unknown device' };
    }
    let device = new Device(deviceData);

    // Business rules orchestration
    if (device.status === 'LOCKED') return { status: 'LOCKED', command: 'LOCK_DEVICE' };

    if (device.isJitExpired()) {
      device = device.lock();
      await this.deviceRepo.save(device);
      await this.logger.critical(deviceId, currentIp, 'JIT expired');
      return { status: 'LOCKED', command: 'LOCK_DEVICE' };
    }

    if (device.isRemoteAllowed) {
      device = device.resetWarnings().updateLastSeen(currentIp);
      await this.deviceRepo.save(device);
      await this.logger.safe(deviceId, currentIp, 'VIP access');
      return { status: 'SAFE' };
    }

    const rules = await this.ruleRepo.findActive();
    if (rules.some(r => r.matches(currentIp))) {
      device = device.resetWarnings().updateLastSeen(currentIp);
      await this.deviceRepo.save(device);
      await this.logger.safe(deviceId, currentIp, 'Whitelist match');
      return { status: 'SAFE' };
    }

    // Policy-based warning
    const policy = getPolicyForDepartment(device.department);
    if (device.warningCount >= policy.getToleranceLimit()) {
      device = device.lock();
      await this.deviceRepo.save(device);
      await this.logger.critical(deviceId, currentIp, 'Tolerance exceeded');
      return { status: 'LOCKED' };
    }

    device = device.incrementWarning().updateLastSeen(currentIp);
    await this.deviceRepo.save(device);
    await this.logger.warn(deviceId, currentIp, `Warning ${device.warningCount}/${policy.getToleranceLimit()}`);
    
    return { status: 'SAFE', warning: true };
  }
}

module.exports = DeviceAccessUseCase;

