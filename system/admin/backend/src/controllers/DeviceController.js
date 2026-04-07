const express = require('express');
const AccessService = require('../services/accessService');
const SecurityLogger = require('../services/SecurityLogger');
const SecurityLog = require('../models/nosql/SecurityLog');

class DeviceController {
  constructor(appServer, config) {
    this.appServer = appServer;
    this.config = config;
    this.accessService = new AccessService(config);
    this.logger = new SecurityLogger(appServer.getIO());
    this.router = express.Router();
    this._setupRoutes();
  }

  _setupRoutes() {
    // POST /api/v1/devices/register - ADD BEFORE PARAM ROUTES to avoid shadowing
    this.router.post('/register', this.register.bind(this));

    // POST /api/v1/devices/check-access
    this.router.post('/check-access', this.checkAccess.bind(this));

    // GET /api/v1/devices
    this.router.get('/', this.getDevices.bind(this));

    // PUT /api/v1/devices/:id/set-department
    this.router.put('/:id/set-department', this.setDepartment.bind(this));

    // PUT /api/v1/devices/:id/lock
    this.router.put('/:id/lock', this.lockDevice.bind(this));

    // PUT /api/v1/devices/:id/unlock
    this.router.put('/:id/unlock', this.unlockDevice.bind(this));

    // PUT /api/v1/devices/:id/toggle-remote
    this.router.put('/:id/toggle-remote', this.toggleRemoteAccess.bind(this));
    
    // DELETE /api/v1/devices/:id
    this.router.delete('/:id', this.deleteDevice.bind(this));
    
    // POST /api/v1/devices/approve-jit
    this.router.post('/approve-jit', this.approveJIT.bind(this));
  }

  async checkAccess(req, res) {
    try {
      const { device_id, device_name, current_ip } = req.body;
      console.log(`[Agent Ping] Device: ${device_id} | IP: ${current_ip}`);

      const result = await this.accessService.evaluate(device_id, current_ip);

      if (result.status === 'SAFE') {
        await this.logger.safeLog(device_id, current_ip, result.message, 'Allowed', result.allowedIps || []);
        return res.status(200).json({ message: 'Access Granted' });
      } else {
        await this.logger.criticalLog(device_id, current_ip, result.message, 'Blocked', result.allowedIps || []);
        await this.config.getPrisma().device.updateMany({
          where: { deviceId: device_id },
          data: { status: 'LOCKED' }
        });
        return res.status(403).json({ message: 'LOCK_DEVICE_COMMAND' });
      }
    } catch (error) {
      console.error('Check access error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  async getDevices(req, res) {
    try {
      const devices = await this.config.getPrisma().device.findMany({
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

      res.status(200).json({ message: 'Device locked successfully!', device: updatedDevice });
    } catch (error) {
      console.error('Lock device error:', error);
      res.status(500).json({ error: 'Failed to lock device' });
    }
  }

  async unlockDevice(req, res) {
    try {
      const { id } = req.params;
      const updatedDevice = await this.config.getPrisma().device.update({
        where: { id },
        data: { status: 'SAFE' }
      });

      const logMsg = '[ADMIN] Device blockade lifted!';
      await this.logger.safeLog(updatedDevice.deviceId, 'Admin Dashboard', logMsg, 'Manual Unlock');

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
      const { deviceId, hours } = req.body;
      const reason = req.body.device?.accessRequestReason || req.body.reason || 'No reason provided';
      
      const device = await this.config.getPrisma().device.findUnique({
        where: { deviceId }
      });
      
      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }
      
      // Update Prisma
      await this.config.getPrisma().device.update({
        where: { deviceId },
        data: { 
          status: 'SAFE',
          jitHours: parseInt(hours),
          accessRequestReason: null,
          requestStatus: 'APPROVED',
          requestIp: device.lastKnownIp || null,
          requestTimestamp: new Date()
        }
      });
      
      // Log to MongoDB as per task
      await SecurityLog.create({
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        ip: device.lastKnownIp || 'unknown',
        action: 'JIT_APPROVED',
        message: `Đã cấp quyền JIT ${hours}h. Lý do: ${reason}`
      });
      
      const logMsg = `[ADMIN] JIT approved ${hours}h. Lý do: ${reason}`;
      await this.logger.safeLog(deviceId, 'Admin Dashboard', logMsg, 'JIT_APPROVED');
      
      res.status(200).json({ message: 'JIT approved successfully!', device });
    } catch (error) {
      console.error('Approve JIT error:', error);
      res.status(500).json({ error: 'Failed to approve JIT' });
    }
  }

  async deleteDevice(req, res) {
    try {
      const { id } = req.params;
      const prisma = this.config.getPrisma();
      
      // Fetch for logging
      const device = await prisma.device.findUnique({ where: { id } });
      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }
      
      // Delete from Prisma
      await prisma.device.delete({ where: { id } });
      
      // Log to MongoDB + emit Socket
      const logMsg = `[ADMIN] Deleted device ${device.deviceName || 'Unknown'} (${device.deviceId})`;
      await this.logger.safeLog(device.deviceId, 'Admin Dashboard', logMsg, 'DEVICE_DELETED');
      
      // Emit real-time update
      this.appServer.getIO().emit('device_deleted', { id });
      
      res.status(200).json({ message: 'Device deleted successfully!', device });
    } catch (error) {
      console.error('Delete device error:', error);
      res.status(500).json({ error: 'Failed to delete device' });
    }
  }

  getRouter() {
    return this.router;
  }

  async register(req, res) {
    try {
      const { device_id, device_name, current_ip } = req.body;
      if (!device_id || !device_name) {
        return res.status(400).json({ error: 'Missing device_id or device_name' });
      }

      console.log(`[Device Registration] ${device_id} (${device_name}) from IP: ${current_ip}`);

      const device = await this.accessService.registerDevice({ device_id, device_name });
      await this.logger.safeLog(device_id, 'System', 'Thiết bị mới đã được đăng ký tự động', 'System Registration');

      res.status(200).json({ message: 'Device registered successfully', device });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
}


module.exports = DeviceController;

