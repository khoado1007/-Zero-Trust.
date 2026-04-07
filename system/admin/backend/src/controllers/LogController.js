const express = require('express');
const SecurityLog = require('../models/nosql/SecurityLog');

class LogController {
  constructor(container) {
    this.SecurityLog = require('../models/nosql/SecurityLog');
    this.router = express.Router();
    this._setupRoutes();
  }

  _setupRoutes() {
    this.router.get('/', this.getLogs.bind(this));
  }

  async getLogs(req, res) {
    try {
      const logs = await SecurityLog.find().sort({ timestamp: -1 }).limit(100);
      res.status(200).json(logs);
    } catch (error) {
      console.error('Logs error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  getRouter() {
    return this.router;
  }
}

module.exports = LogController;
