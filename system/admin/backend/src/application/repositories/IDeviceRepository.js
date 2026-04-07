/**
 * Port/Interface: Device persistence abstraction (DIP)
 */
class IDeviceRepository {
  // Read operations
  async findById(id) {
    throw new Error('Must implement findById');
  }

  async findByDeviceId(deviceId) {
    throw new Error('Must implement findByDeviceId');
  }

  async findAll() {
    throw new Error('Must implement findAll');
  }

  // Write operations
  async save(device) {
    throw new Error('Must implement save');
  }

  async delete(id) {
    throw new Error('Must implement delete');
  }

  async update(id, updates) {
    throw new Error('Must implement update');
  }
}

module.exports = IDeviceRepository;

