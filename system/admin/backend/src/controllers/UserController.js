const express = require('express');

// const UserUseCase = require('../../domain/usecases/UserUseCase');

class UserController {
  constructor(appServer, container) {
    this.appServer = appServer;
    this.prisma = container.getPrisma();
    this.router = express.Router();
    this._setupRoutes();
  }

  _setupRoutes() {
    this.router.post('/', this.createUser.bind(this));
    this.router.get('/', this.getUsers.bind(this));
  }

  async createUser(req, res) {
    try {
      const { employeeId, fullName, email, department = 'SALES' } = req.body;
      if (!employeeId || !fullName) {
        return res.status(400).json({ error: 'employeeId and fullName required' });
      }

      // Generate email if not provided to avoid unique constraint
      const finalEmail = email || `${employeeId.toLowerCase()}@zerotrust.local`;

      const user = await this.prisma.user.create({
        data: {
          employeeId,
          fullName,
          email: finalEmail,
          department,
          role: 'EMPLOYEE' // default
        }
      });

      res.status(201).json({ message: 'User created successfully', user });
    } catch (error) {
      console.error('Create user error:', error);
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'employeeId or email already exists' });
      }
      res.status(500).json({ error: 'Failed to create user' });
    }
  }

  async getUsers(req, res) {
    try {
      const users = await this.prisma.user.findMany({
        select: { id: true, employeeId: true, fullName: true, email: true, department: true, role: true }
      });
      res.status(200).json(users);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  getRouter() {
    return this.router;
  }
}

module.exports = UserController;

