const { BaseMongoModel } = require('./base/mongoModel');

class SecurityRule extends BaseMongoModel {
  static collectionName = 'security_rules';

  static async getGlobalRules() {
    let rules = await this.findOne({ key: 'global' });
    if (rules) return rules;

    try {
      rules = await this.create({ key: 'global' });
      return rules;
    } catch (error) {
      return this.findOne({ key: 'global' });
    }
  }
}

module.exports = SecurityRule;
