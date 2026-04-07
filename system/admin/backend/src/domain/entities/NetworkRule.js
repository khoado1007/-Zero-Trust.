/**
 * Domain Entity: Whitelist Network Rule
 */
class NetworkRule {
  constructor({
    id,
    allowedIp,
    locationName,
    isActive = true
  }) {
    this.id = id;
    this.allowedIp = allowedIp?.trim();
    this.locationName = locationName || 'Whitelist IP';
    this.isActive = Boolean(isActive);

    this.validate();
  }

  validate() {
    if (!this.allowedIp || typeof this.allowedIp !== 'string' || !this.allowedIp.includes('.')) {
      throw new Error('Valid IP address required');
    }
  }

  matches(ip) {
    return this.isActive && this.allowedIp === ip?.trim();
  }

  deactivate() {
    return new NetworkRule({ ...this, isActive: false });
  }
}

module.exports = NetworkRule;

