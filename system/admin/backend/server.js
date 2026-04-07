const ServerConfig = require('./src/config/ServerConfig');
const AppServer = require('./src/core/AppServer');
const DeviceController = require('./src/controllers/DeviceController');
const NetworkRulesController = require('./src/controllers/NetworkRulesController');
const LogController = require('./src/controllers/LogController');

// Initialize OOP structure
const config = new ServerConfig();
const appServer = new AppServer(config);
const deviceController = new DeviceController(appServer, config);
const networkRulesController = new NetworkRulesController(config);
const logController = new LogController(config);

// Mount routes
appServer.useRouter('/api/v1/devices', deviceController.getRouter());
appServer.useRouter('/api/v1/network-rules', networkRulesController.getRouter());
appServer.useRouter('/api/v1/logs', logController.getRouter());

// Start server
const PORT = process.env.PORT || 3000;
appServer.listen(PORT);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await config.disconnect();
  appServer.close();
  process.exit(0);
});

