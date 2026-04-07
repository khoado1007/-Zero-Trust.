// const NetworkRule = require('../../../../domain/entities/NetworkRule');
// const IDeviceRepository = require('../../../../application/repositories/IDeviceRepository'); // Base pattern

class PrismaNetworkRuleRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async findActive() {
    const data = await this.prisma.networkRule.findMany({ where: { isActive: true } });
    return data.map(d => new NetworkRule(d));
  }

  async findAll() {
    return this.prisma.networkRule.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async create(data) {
    return this.prisma.networkRule.create({ data });
  }

  async delete(id) {
    return this.prisma.networkRule.delete({ where: { id } });
  }
}

module.exports = PrismaNetworkRuleRepository;

