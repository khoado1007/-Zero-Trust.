const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

class AppServer {
  constructor(config) {
    this.config = config;
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new Server(this.server, { 
      cors: { origin: "*" } 
    });

    this._setupMiddleware();
    this._setupSocket();
  }

  _setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
  }

  _setupSocket() {
    this.io.on('connection', (socket) => {
      console.log(`[+] Admin Dashboard connected (Socket ID: ${socket.id})`);
    });
  }

  useRouter(path, router) {
    this.app.use(path, router);
  }

  getIO() {
    return this.io;
  }

  getApp() {
    return this.app;
  }

  listen(port = 3000) {
    this.server.listen(port, () => {
      console.log(`=== ZeroTrust Command Center running on port ${port} ===`);
    });
  }

  close() {
    this.server.close();
  }
}

module.exports = AppServer;

