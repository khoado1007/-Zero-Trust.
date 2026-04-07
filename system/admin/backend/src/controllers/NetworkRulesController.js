const express = require('express');

class NetworkController {
  constructor(config) {
    this.config = config;
    this.prisma = config.getPrisma();
    this.router = express.Router();
    this._setupRoutes();
  }

  _setupRoutes() {
    this.router.get('/', this.getRules.bind(this));
    this.router.post('/', this.addRule.bind(this));
    this.router.delete('/:id', this.deleteRule.bind(this));
  }

  async getRules(req, res) {
    try {
      const rules = await this.prisma.networkRule.findMany({
        orderBy: { createdAt: 'desc' }
      });
      const transformedRules = rules.map(rule => ({
        id: rule.id,
        ip: rule.allowedIp,
        description: rule.locationName,
        status: rule.isActive ? 'ACTIVE' : 'INACTIVE',
        createdAt: rule.createdAt
      }));
      res.status(200).json(transformedRules);
    } catch (error) {
      console.error('Get network rules error:', error);
      res.status(500).json({ error: 'Failed to fetch network rules' });
    }
  }

  async addRule(req, res) {
    try {
      const { ip, description } = req.body;
      const newRule = await this.prisma.networkRule.create({
        data: { 
          allowedIp: ip,
          locationName: description || 'Whitelist IP',
          isActive: true 
        }
      });
      const transformedRule = {
        id: newRule.id,
        ip: newRule.allowedIp,
        description: newRule.locationName,
        status: newRule.isActive ? 'ACTIVE' : 'INACTIVE',
        createdAt: newRule.createdAt
      };
      res.status(201).json(transformedRule);
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'IP already exists' });
      }
      console.error('Create network rule error:', error);
      res.status(500).json({ error: 'Failed to create network rule' });
    }
  }

  async deleteRule(req, res) {
    try {
      const { id } = req.params;
      await this.prisma.networkRule.delete({ where: { id } });
      res.status(200).json({ message: 'Network rule deleted successfully' });
    } catch (error) {
      console.error('Delete network rule error:', error);
      res.status(500).json({ error: 'Failed to delete network rule' });
    }
  }

  getRouter() {
    return this.router;
  }
}

module.exports = NetworkController;
