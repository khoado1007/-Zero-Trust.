const PrismaDeviceRepository = require('../persistence/prisma/PrismaDeviceRepository');
const PrismaNetworkRuleRepository = require('../persistence/prisma/PrismaNetworkRuleRepository');
const MongoSecurityLogRepository = require('../persistence/mongodb/MongoSecurityLogRepository');
const SocketLoggerAdapter = require('../logging/SocketLoggerAdapter');
const DeviceAccessUseCase = require('../../domain/usecases/DeviceAccessUseCase');
const DeviceRegistrationUseCase = require('../../domain/usecases/DeviceRegistrationUseCase');

/**
 * DI Container - Resolves use cases with proper wiring
 */
class Container {
  constructor(appServer, config) {
    this.appServer = appServer;
    this.prisma = config.getPrisma();
  }

  getLogger() {
    const logRepo = new MongoSecurityLogRepository();
    return new SocketLoggerAdapter(this.appServer.getIO(), logRepo);
  }

  getDeviceRepo() {
    return new PrismaDeviceRepository(this.prisma);
  }

  getPrisma() {
    return this.prisma;
  }
}

module.exports = Container;

