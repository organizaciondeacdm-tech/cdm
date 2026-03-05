const { BaseMongoModel } = require('./base/mongoModel');

class SecurityIpState extends BaseMongoModel {
  static collectionName = 'security_ip_states';
  static sensitiveFields = ['ip'];

  static async getOrCreate(ip) {
    let row = await this.findOne({ ip });
    if (row) return row;

    try {
      row = await this.create({
        ip,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        blockedUntil: null,
        manualBan: false,
        banReason: '',
        banSetAt: null,
        statusCounts: {
          total: 0,
          s2xx: 0,
          s4xx: 0,
          s5xx: 0,
          s429: 0
        }
      });
      return row;
    } catch (error) {
      return this.findOne({ ip });
    }
  }
}

module.exports = SecurityIpState;
