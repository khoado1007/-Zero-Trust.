/**
 * Domain Entity: Immutable Device representation
 * Encapsulates core business state & validation
 */
class Device {
  constructor({
    id,
    deviceId,
    originalName,
    department = 'SALES',
    status = 'SAFE',
    isRemoteAllowed = false,
    warningCount = 0,
    jitHours = null,
    requestStatus = null,
    requestTimestamp = null,
    lastKnownIp = null,
    lastSeen = null,
    userId = null
  }) {
    this.id = id;
    this.deviceId = deviceId; // Unique identifier (MAC/UUID)
    this.originalName = originalName;
    this.department = ['SALES', 'SOCIAL'].includes(department) ? department : 'SALES';
    this.status = ['SAFE', 'LOCKED'].includes(status) ? status : 'SAFE';
    this.isRemoteAllowed = Boolean(isRemoteAllowed);
    this.warningCount = Math.max(0, Number(warningCount));
    this.jitHours = Number(jitHours) || null;
    this.requestStatus = requestStatus;
    this.requestTimestamp = requestTimestamp ? new Date(requestTimestamp) : null;
    this.lastKnownIp = lastKnownIp;
    this.lastSeen = lastSeen ? new Date(lastSeen) : new Date();
    this.userId = userId;

    this.validate();
  }

  validate() {
    if (!this.deviceId || typeof this.deviceId !== 'string') {
      throw new Error('Device ID is required');
    }
    if (!this.originalName || typeof this.originalName !== 'string') {
      throw new Error('Device name is required');
    }
  }

  // Business Methods
  isJitExpired() {
    if (!this.jitHours || !this.requestTimestamp || this.requestStatus !== 'APPROVED') {
      return false;
    }
    const expiration = new Date(this.requestTimestamp);
    expiration.setHours(expiration.getHours() + this.jitHours);
    return Date.now() > expiration.getTime();
  }

  getToleranceLimit() {
    return this.department === 'SOCIAL' ? 3 : 1;
  }

  incrementWarning() {
    return new Device({
      ...this,
      warningCount: this.warningCount + 1
    });
  }

  resetWarnings() {
    return new Device({ ...this, warningCount: 0 });
  }

  lock() {
    return new Device({ ...this, status: 'LOCKED', requestStatus: 'EXPIRED' });
  }

  // Immutable updates
  withStatus(status) {
    return new Device({ ...this, status });
  }

  withJitApproval(jitHours, timestamp) {
    return new Device({
      ...this,
      status: 'SAFE',
      requestStatus: 'APPROVED',
      jitHours,
      requestTimestamp: timestamp
    });
  }

  updateLastSeen(ip) {
    return new Device({
      ...this,
      lastKnownIp: ip,
      lastSeen: new Date()
    });
  }
}

module.exports = Device;

