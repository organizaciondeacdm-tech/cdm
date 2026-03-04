const { BaseMongoModel } = require('./base/mongoModel');

class SecurityTrafficEvent extends BaseMongoModel {
  static collectionName = 'security_traffic_events';
  static sensitiveFields = ['ip'];
}

module.exports = SecurityTrafficEvent;
