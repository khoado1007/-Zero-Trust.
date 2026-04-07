const { PrismaClient } = require('@prisma/client');
// const IDeviceRepository = require('../../../../application/repositories/IDeviceRepository');
// const Device = require('../../../../domain/entities/Device');

class PrismaDeviceRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async findById(id) {
    const data = await this.prisma.device.findUnique({ where: { id }, include: { user: true } });
    return data ? new Device(data) : null;
  }

  async findByDeviceId(deviceId) {
    const data = await this.prisma.device.findUnique({ where: { deviceId }, include: { user: true } });
    return data ? new Device(data) : null;
  }

  async findAll() {
    const data = await this.prisma.device.findMany({ include: { user: true } });
    return data.map(d => new Device(d));
  }

  async save(device) {
    const data = device;
    if (data.id) {
      return this.prisma.device.update({ where: { id: data.id }, data, include: { user: true } });
    }
    return this.prisma.device.create({ data, include: { user: true } });
  }

  async delete(id) {
    return this.prisma.device.delete({ where: { id } });
  }

  async update(id, data) {
    return this.prisma.device.update({ where: { id }, data, include: { user: true } });
  }
}

module.exports = PrismaDeviceRepository;

