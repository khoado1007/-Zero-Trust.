const ServerConfig = require('../config/ServerConfig');
const SecurityLog = require('../models/nosql/SecurityLog');

const POLICY_MAP = {
  "SALES": { warn1: '2h', warn2: '10m', lock: '2h', jitMax: 4 },
  "SOCIAL": { warn1: '4h', warn2: '30m', lock: '1h', jitMax: 8 }
};

function parseInterval(intervalStr) {
  const match = intervalStr.match(/(\\d+)(h|m)/);
  if (!match) return 0;
  const [, num, unit] = match;
  return parseInt(num) * (unit === 'h' ? 3600000 : 60000);
}

class AccessService {
  constructor(config) {
    this.config = config;
  }

  async evaluate(deviceId, currentIp) {
    const prisma = this.config.getPrisma();

    try {
      console.log(`[DEBUG] Ping: ID=${deviceId}, IP=${currentIp}`);

      const device = await prisma.device.findUnique({
        where: { deviceId },
        include: { user: true }
      });

      if (!device) {
        console.log('[DEBUG] BLOCK: Device not found in DB.');
        await SecurityLog.create({
          deviceId,
          deviceName: 'Unknown',
          ip: currentIp,
          action: 'LOCKED',
          message: 'Device not registered.'
        });
        return { status: 'LOCKED', message: 'Device not registered.' };
      }

      const dept = device.department || 'SALES';
      const policy = POLICY_MAP[dept];
      console.log(`[DEBUG] Department: ${dept}, Policy:`, policy);

      await prisma.device.update({
        where: { deviceId },
        data: { lastSeen: new Date() }
      });

      if (device.status === 'LOCKED') {
        console.log('[DEBUG] BLOCK: Device status is already LOCKED in DB.');
        await SecurityLog.create({
          deviceId,
          deviceName: device.deviceName || 'Unknown',
          ip: currentIp,
          action: 'LOCKED',
          message: 'Device is LOCKED.'
        });
        return { status: 'LOCKED', message: 'Device is LOCKED.' };
      }

      if (device.isRemoteAllowed) {
        console.log('[DEBUG] PASS: VIP Remote Enabled.');
        await SecurityLog.create({
          deviceId,
          deviceName: device.deviceName || 'Unknown',
          ip: currentIp,
          action: 'SAFE',
          message: 'Remote access allowed (VIP).'
        });
        return {
          status: 'SAFE',
          message: 'Remote access allowed (VIP).',
          deviceInfo: device
        };
      }

      if (currentIp === this.config.getCompanyIP()) {
        console.log('[DEBUG] PASS: Company internal IP.');
        await SecurityLog.create({
          deviceId,
          deviceName: device.deviceName || 'Unknown',
          ip: currentIp,
          action: 'SAFE',
          message: 'Access valid from internal network.'
        });
        return {
          status: 'SAFE',
          message: 'Access valid from internal network.',
          deviceInfo: device
        };
      }

      const networkRules = await prisma.networkRule.findMany({
        where: { isActive: true }
      });
      console.log('[DEBUG] DB Whitelist IPs:', networkRules.map(r => r.allowedIp));

      const ipTrimmed = currentIp.trim();
      const matchedRule = networkRules.find(rule => rule.allowedIp.trim() === ipTrimmed);
      if (matchedRule) {
        console.log(`[DEBUG] PASS: IP Matched Whitelist.`);
        await SecurityLog.create({
          deviceId,
          deviceName: device.deviceName || 'Unknown',
          ip: currentIp,
          action: 'SAFE',
          message: `Access valid from ${matchedRule.locationName}.`
        });
        return {
          status: 'SAFE',
          message: `Access valid from ${matchedRule.locationName}.`,
          deviceInfo: device,
          allowedIps: networkRules.map(r => r.allowedIp)
        };
      }

      // Department-based policy enforcement
      console.log(`[DEBUG] BLOCK: IP ${currentIp} not in Whitelist - Department policy active.`);
      const now = Date.now();
      const nextActionTime = now + parseInterval(policy.warn1);
      await SecurityLog.create({
        deviceId,
        deviceName: device.deviceName || 'Unknown',
        ip: currentIp,
        action: 'WARN1',
        message: `Unauthorized IP - Next action at ${new Date(nextActionTime).toISOString()} (${policy.warn1} policy for ${dept}).`
      });
      return {
        status: 'WARN',
        message: `Unauthorized access from IP ${currentIp}. Next action in ${policy.warn1}`,
        nextActionTime,
        policy: dept,
        deviceInfo: device
      };

    } catch (error) {
      console.error('Access evaluation error:', error);
      await SecurityLog.create({
        deviceId,
        deviceName: 'Unknown',
        ip: currentIp,
        action: 'CRITICAL',
        message: 'System error during evaluation.'
      });
      return { status: 'ERROR', message: 'System error during evaluation.' };
    }
  }

  async registerDevice({ device_id, device_name }) {
    const prisma = this.config.getPrisma();
    const existingDevice = await prisma.device.findUnique({
      where: { deviceId: device_id }
    });
    if (!existingDevice) {
      return await prisma.device.create({
        data: {
          deviceId: device_id,
          deviceName: device_name,
          status: 'SAFE',
          isRemoteAllowed: false,
          department: 'SALES'
        }
      });
    } else {
      return await prisma.device.update({
        where: { deviceId: device_id },
        data: { deviceName: device_name }
      });
    }
  }
}

module.exports = AccessService;

