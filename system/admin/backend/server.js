const { PrismaClient } = require('@prisma/client');
const AppServer = require('./src/core/AppServer');
const Container = require('./src/infrastructure/di/Container');

// Global Prisma instance (singleton pattern)
const ServerConfig = require('./src/config/ServerConfig');
const config = new ServerConfig();
const prisma = config.getPrisma();
const appServer = new AppServer(config);
const container = new Container(appServer, config);

// Wire controllers with DI
const DeviceController = require('./src/controllers/DeviceController');
const NetworkRulesController = require('./src/controllers/NetworkRulesController');
const LogController = require('./src/controllers/LogController');
const UserController = require('./src/controllers/UserController');

const deviceController = new DeviceController(appServer, container);
const networkRulesController = new NetworkRulesController(container);
const logController = new LogController(container);
const userController = new UserController(appServer, container);

// Mount routes
appServer.useRouter('/api/v1/devices', deviceController.getRouter());
appServer.useRouter('/api/v1/network-rules', networkRulesController.getRouter());
appServer.useRouter('/api/v1/logs', logController.getRouter());
appServer.useRouter('/api/v1/users', userController.getRouter());

// Start server
const PORT = process.env.PORT || 3000;
appServer.listen(PORT);

console.log('🚀 ZeroTrust Backend - Clean Architecture + SOLID ✅');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  appServer.close();
  process.exit(0);
});

