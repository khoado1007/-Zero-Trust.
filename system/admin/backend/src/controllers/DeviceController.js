const express = require('express');
const SecurityLogger = require('../services/SecurityLogger');
const SecurityLog = require('../models/nosql/SecurityLog');

// const DeviceAccessUseCase = require('../../domain/usecases/DeviceAccessUseCase');
 // const DeviceRegistrationUseCase = require('../../domain/usecases/DeviceRegistrationUseCase');
 // const { PrismaDeviceRepository } = require('../../infrastructure/persistence/prisma/PrismaDeviceRepository');
 // const PrismaNetworkRuleRepository = require('../../infrastructure/persistence/prisma/PrismaNetworkRuleRepository');
 // const SocketLoggerAdapter = require('../../infrastructure/logging/SocketLoggerAdapter');

class DeviceController {
  constructor(appServer, container) {
    this.appServer = appServer;
    this.container = container;
    
    // Use container DI
    this.logger = new SecurityLogger(appServer.getIO());
    this.prisma = container.getPrisma();
    
    this.router = express.Router();
    this._setupRoutes();
  }

  _setupRoutes() {
    this.router.post('/register', this.register.bind(this));
    this.router.post('/check-access', this.checkAccess.bind(this));
    this.router.get('/', this.getDevices.bind(this));
    this.router.put('/:id/set-department', this.setDepartment.bind(this));
    this.router.put('/:id/lock', this.lockDevice.bind(this));
    this.router.put('/:id/unlock', this.unlockDevice.bind(this));
    this.router.put('/:id/toggle-remote', this.toggleRemoteAccess.bind(this));
    this.router.delete('/:id', this.deleteDevice.bind(this));
    this.router.post('/approve-jit', this.approveJIT.bind(this));
    this.router.put('/:id/assign-user', this.assignUser.bind(this));
  }

  async checkAccess(req, res) {
    try {
      const { device_id, ip: current_ip } = req.body;
      if (!device_id || !current_ip?.trim()) {
        return res.status(400).json({ error: 'Missing device_id or ip' });
      }
      console.log(`[Agent Ping/Heartbeat] Device: ${device_id} | IP: ${current_ip}`);

      const prisma = this.prisma;
      const device = await prisma.device.findUnique({
        where: { deviceId: device_id }
      });
      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }

      if (device.status === 'LOCKED') {
        return res.status(403).json({ status: "LOCKED", command: "LOCK_DEVICE" });
      }

      // JIT Expiration Check
      console.log(`[JIT DEBUG] Heartbeat ${device.deviceId}: status=${device.status}, requestStatus=${device.requestStatus}, timestamp=${device.requestTimestamp}, jitHours=${device.jitHours}, now=${new Date().toISOString()}`);
      if (device.status === 'SAFE' && device.requestStatus === 'APPROVED' && device.requestTimestamp && device.jitHours) {
        const expirationTime = new Date(device.requestTimestamp).getTime() + (device.jitHours * 60 * 60 * 1000);
        const remainingMs = expirationTime - Date.now();
        console.log(`[JIT DEBUG] ${device.deviceId} expirationTime=${new Date(expirationTime).toISOString()}, remainingMs=${remainingMs}`);
        if (Date.now() > expirationTime) {
          console.log(`[JIT EXPIRED TRIGGERED] Locking ${device.deviceId}`);
          await prisma.device.update({
            where: { deviceId: device_id },
            data: { 
              status: 'LOCKED', 
              requestStatus: 'EXPIRED' 
            }
          });
          const logMsg = "JIT Access Expired. Device Locked.";
          await this.logger.criticalLog(device_id, current_ip, logMsg, 'CRITICAL');
          this.appServer.getIO().emit('security_log', {
            deviceId: device.deviceId,
            deviceName: device.originalName || 'Unknown',
            ip: current_ip,
            action: 'CRITICAL',
            message: logMsg,
            timestamp: new Date().toISOString()
          });
          this.appServer.getIO().emit('device_status_changed', { 
            deviceId: device_id, 
            status: 'LOCKED' 
          });
          return res.status(403).json({ status: "LOCKED", command: "LOCK_DEVICE" });
        } else {
          console.log(`[JIT DEBUG] ${device.deviceId} JIT still valid, remaining: ${Math.floor(remainingMs / 60000)}min`);
        }
      } else {
        console.log(`[JIT DEBUG] ${device.deviceId} JIT condition not met`);
      }


      const networkRules = await prisma.networkRule.findMany({
        where: { isActive: true }
      });

      const isIpAllowed = networkRules.some(rule => rule.allowedIp.trim() === current_ip.trim());
      const isValidAccess = isIpAllowed || device.isRemoteAllowed || device.requestStatus === 'APPROVED';

      await prisma.device.update({
        where: { deviceId: device_id },
        data: { lastKnownIp: current_ip, lastSeen: new Date() }
      });

      if (isValidAccess) {
        if (isIpAllowed) {
          // Natural Safe: Force reset state and clear JIT
          await prisma.device.update({
            where: { deviceId: device_id },
        data: { 
          status: 'SAFE',
          requestStatus: null,
          jitHours: null,
          requestTimestamp: null,
          accessRequestReason: null,
          warningCount: 0
        }

          });
          await this.logger.safeLog(device_id, current_ip, 'Natural Safe IP - Full state reset', 'NATURAL_SAFE');
        } else {
          // JIT or VIP safe: just reset warnings
          await prisma.device.update({
            where: { deviceId: device_id },
            data: { warningCount: 0 }
          });
          await this.logger.safeLog(device_id, current_ip, 'Access validated (JIT/VIP)', 'HEARTBEAT_SAFE');
        }
        return res.status(200).json({ status: 'SAFE' });
      } else {
        const tolerance = device.department === 'SOCIAL' ? 3 : 1;
        const updatedDevice = await prisma.device.update({
          where: { deviceId: device_id },
          data: { warningCount: { increment: 1 } }
        });

        if (updatedDevice.warningCount > tolerance) {
          await prisma.device.update({
            where: { deviceId: device_id },
            data: { status: 'LOCKED' }
          });
          await this.logger.criticalLog(device_id, current_ip, `Device LOCKED after ${updatedDevice.warningCount}/${tolerance} warnings (Unrecognized IP)`, 'CRITICAL');
          return res.status(403).json({ status: 'LOCKED', command: 'LOCK_DEVICE' });
        } else {
          await this.logger.safeLog(device_id, current_ip, `Warning ${updatedDevice.warningCount}/${tolerance}: Unrecognized IP`, 'WARNING');
          return res.status(200).json({ status: 'SAFE', message: 'Warning issued' });
        }
      }
    } catch (error) {
      console.error('Check access error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  async getDevices(req, res) {
    try {
      const devices = await this.container.getPrisma().device.findMany({
        include: { user: true }
      });
      res.status(200).json(devices);
    } catch (error) {
      console.error('Get devices error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  async lockDevice(req, res) {
    try {
      const { id } = req.params;
      const updatedDevice = await this.config.getPrisma().device.update({
        where: { id },
        data: { status: 'LOCKED' }
      });

      const logMsg = '[ADMIN] Emergency device lock activated!';
      await this.logger.criticalLog(updatedDevice.deviceId, 'Admin Dashboard', logMsg, 'Manual Block');
      this.appServer.getIO().emit('security_log', {
        deviceId: updatedDevice.deviceId,
        deviceName: updatedDevice.originalName || 'Unknown',
        ip: 'Admin Dashboard',
        action: 'Manual Block',
        message: logMsg,
        timestamp: new Date().toISOString()
      });

      res.status(200).json({ message: 'Device locked successfully!', device: updatedDevice });
    } catch (error) {
      console.error('Lock device error:', error);
      res.status(500).json({ error: 'Failed to lock device' });
    }
  }

async unlockDevice(req, res) {
    try {
      const { id } = req.params;
      const prisma = this.config.getPrisma();
      const device = await prisma.device.findUnique({
        where: { id },
        include: { user: true }
      });
      if (!device || !device.lastKnownIp) {
        return res.status(400).json({ error: 'Device not found or no IP recorded' });
      }

      const networkRules = await prisma.networkRule.findMany({ where: { isActive: true } });
      const isIpAllowed = networkRules.some(rule => rule.allowedIp.trim() === device.lastKnownIp.trim());

      if (!isIpAllowed) {
        return res.status(400).json({ error: "Không thể mở khóa do IP không an toàn. Vui lòng cấp quyền JIT nếu cần thiết." });
      }

      const updatedDevice = await prisma.device.update({
        where: { id },
        data: { 
          status: 'SAFE',
          requestStatus: null,
          jitHours: null,
          requestTimestamp: null,
          accessRequestReason: null,
          warningCount: 0
        }
      });

      // Fetch full device for socket broadcast (permanent SAFE state)
      const fullDevice = await prisma.device.findUnique({
        where: { id },
        include: { user: true }
      });

      this.appServer.getIO().emit('device_updated', fullDevice);

      const logMsg = '[ADMIN] Safe Unlock - Full JIT Wipe (Permanent SAFE)';
      await this.logger.safeLog(device.deviceId, device.lastKnownIp, logMsg, 'SAFE_UNLOCK');
      res.status(200).json({ message: 'Device unlocked successfully!', device: updatedDevice });
    } catch (error) {
      console.error('Unlock device error:', error);
      res.status(500).json({ error: 'Failed to unlock device' });
    }
  }

  async setDepartment(req, res) {
    try {
      const { id } = req.params;
      const { department } = req.body;
      if (!['SALES', 'SOCIAL'].includes(department)) {
        return res.status(400).json({ error: 'Invalid department. Must be SALES or SOCIAL' });
      }

      const updatedDevice = await this.config.getPrisma().device.update({
        where: { id },
        data: { department }
      });

      const logMsg = `[ADMIN] Changed device department to ${department}`;
      await this.logger.safeLog(updatedDevice.deviceId, 'Admin Dashboard', logMsg, 'Department Update');

      res.status(200).json({ message: `Department set to ${department}`, device: updatedDevice });
    } catch (error) {
      console.error('Set department error:', error);
      res.status(500).json({ error: 'Failed to set department' });
    }
  }

  async toggleRemoteAccess(req, res) {
    try {
      const { id } = req.params;
      const { isRemoteAllowed } = req.body;

      const updatedDevice = await this.config.getPrisma().device.update({
        where: { id },
        data: { isRemoteAllowed }
      });

      const logMsg = "[ADMIN] Đã cấp/rút quyền làm việc từ xa (VIP) cho thiết bị!";
      await this.logger.safeLog(updatedDevice.deviceId, 'Admin Dashboard', logMsg, 'VIP Toggle');

      res.status(200).json({ message: 'Remote access toggled successfully!', device: updatedDevice });
    } catch (error) {
      console.error('Toggle remote access error:', error);
      res.status(500).json({ error: 'Failed to toggle remote access' });
    }
  }

  async approveJIT(req, res) {
    try {
      const { deviceId, jitHours, reason } = req.body;
      if (!deviceId || !jitHours || !reason) {
        return res.status(400).json({ error: 'Missing required fields: deviceId, jitHours, reason' });
      }
      const parsedJitHours = parseInt(jitHours);
      if (isNaN(parsedJitHours) || parsedJitHours <= 0) {
        return res.status(400).json({ error: 'jitHours must be a positive integer' });
      }
      
      const device = await this.config.getPrisma().device.findUnique({
        where: { deviceId }
      });
      
      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }
      
      await this.config.getPrisma().device.update({
        where: { deviceId },
        data: { 
          status: 'SAFE',
          requestStatus: 'APPROVED',
          jitHours: parsedJitHours,
          warningCount: 0,
          accessRequestReason: null,
          requestIp: device.lastKnownIp || null,
          requestTimestamp: new Date()
        }
      });
      
      // Fetch full updated device for socket broadcast
      const updatedDevice = await this.config.getPrisma().device.findUnique({
        where: { deviceId },
        include: { user: true }
      });
      
      // Broadcast to all frontend clients
      this.appServer.getIO().emit('device_updated', updatedDevice);
      
      await SecurityLog.create({
        deviceId: device.deviceId,
        deviceName: device.deviceName,

        ip: device.lastKnownIp || 'unknown',
        action: 'JIT_APPROVED',
        message: `Đã cấp quyền JIT ${parsedJitHours}h. Lý do: ${reason}`
      });
      
      const logMsg = `[ADMIN] JIT approved ${parsedJitHours}h. Lý do: ${reason}`;
      await this.logger.safeLog(deviceId, 'Admin Dashboard', logMsg, 'JIT_APPROVED');
      
      res.status(200).json({ message: 'JIT approved successfully!', device: updatedDevice });
    } catch (error) {
      console.error('Approve JIT error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async deleteDevice(req, res) {
    try {
      const { id } = req.params;
      const prisma = this.config.getPrisma();
      
      const device = await prisma.device.findUnique({ where: { id } });
      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }
      
      await prisma.device.delete({ where: { id } });
      
      const logMsg = `[ADMIN] Deleted device ${device.deviceName || 'Unknown'} (${device.deviceId})`;
      await this.logger.safeLog(device.deviceId, 'Admin Dashboard', logMsg, 'DEVICE_DELETED');
      
      this.appServer.getIO().emit('device_deleted', { id });
      
      res.status(200).json({ message: 'Device deleted successfully!', device });
    } catch (error) {
      console.error('Delete device error:', error);
      res.status(500).json({ error: 'Failed to delete device' });
    }
  }

  async assignUser(req, res) {
    try {
      const { id } = req.params;
      const { fullName, employeeId, department } = req.body;

      if (!employeeId || !fullName || !department) {
        return res.status(400).json({ error: 'Missing required fields: fullName, employeeId, department' });
      }

      if (!['SALES', 'SOCIAL'].includes(department)) {
        return res.status(400).json({ error: 'Department must be SALES or SOCIAL' });
      }

      const prisma = this.config.getPrisma();

      const user = await prisma.user.upsert({
        where: { employeeId },
        update: {
          fullName,
          department,
        },
        create: {
          employeeId,
          fullName,
          email: `${employeeId.toLowerCase()}@local.com`,
          department,
          role: 'EMPLOYEE',
        },
      });

      const updatedDevice = await prisma.device.update({
        where: { id },
        data: {
          userId: user.id,
          department: user.department,
        },
        include: { user: true },
      });

      const logMsg = `[ADMIN] Assigned user ${user.fullName} (${user.employeeId}) to device ${updatedDevice.deviceId}`;
      await this.logger.safeLog(updatedDevice.deviceId, 'Admin Dashboard', logMsg, 'USER_ASSIGN');
      this.appServer.getIO().emit('device_updated', updatedDevice);

      res.status(200).json({ message: 'User assigned successfully!', device: updatedDevice });
    } catch (error) {
      console.error('Assign user error:', error);
      res.status(500).json({ error: 'Failed to assign user' });
    }
  }

  async register(req, res) {
    try {
      const { device_id, originalName, department = 'SALES', ip: current_ip } = req.body;
      if (!device_id || !originalName) {
        return res.status(400).json({ error: 'Missing device_id or originalName' });
      }

      console.log(`[Device Registration] ${device_id} (${originalName}) from IP: ${current_ip}, Dept: ${department}`);

      const prisma = this.prisma;
      const device = await prisma.device.upsert({
        where: { deviceId: device_id },
        update: {
          originalName,
          department,
          lastKnownIp: current_ip,
          lastSeen: new Date(),
        },
        create: {
          deviceId: device_id,
          originalName,
          department,
          lastKnownIp: current_ip,
          lastSeen: new Date(),
          status: 'SAFE',
          warningCount: 0
        }
      });

      res.status(200).json({ message: 'Device registered successfully', device });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }

  getRouter() {
    return this.router;
  }
}

module.exports = DeviceController;
