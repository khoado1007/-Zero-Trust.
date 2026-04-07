require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const connectMongo = require('./db');

class ServerConfig {
  constructor() {
    this.prisma = new PrismaClient();
    this.COMPANY_IP = process.env.COMPANY_IP || '192.168.1.100';
    connectMongo(); // Init MongoDB
  }

  getPrisma() {
    return this.prisma;
  }

  getCompanyIP() {
    return this.COMPANY_IP;
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }
}

module.exports = ServerConfig;

