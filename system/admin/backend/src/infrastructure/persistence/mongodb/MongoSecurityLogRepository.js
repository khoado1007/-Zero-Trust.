const SecurityLog = require('../../../models/nosql/SecurityLog');
const ISecurityLogRepository = require('../../../application/repositories/ISecurityLogRepository');

/**
 * MongoDB Security Log Repository
 */
class MongoSecurityLogRepository extends ISecurityLogRepository {
  async create(logData) {
    return SecurityLog.create({
      ...logData,
      timestamp: new Date()
    });
  }

  async findRecent(limit = 100) {
    return SecurityLog.find().sort({ timestamp: -1 }).limit(limit);
  }
}

module.exports = MongoSecurityLogRepository;

