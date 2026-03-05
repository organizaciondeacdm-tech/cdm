const { obfuscateDocument } = require('../../utils/obfuscation');
const { logEntityEvent, logEntityError } = require('../../services/entityLogger');

const mergeTransform = (existingOptions = {}, transform) => ({
  ...existingOptions,
  virtuals: existingOptions.virtuals !== false,
  transform(doc, ret, opts) {
    if (typeof existingOptions.transform === 'function') {
      const transformed = existingOptions.transform(doc, ret, opts);
      if (transformed && typeof transformed === 'object') {
        ret = transformed;
      }
    }
    return transform(doc, ret, opts);
  }
});

const baseEntityPlugin = (schema, options = {}) => {
  const entityName = options.entityName || 'Entity';
  const sensitiveFields = options.sensitiveFields || [];
  const enableObfuscation = options.enableObfuscation !== false;

  const baseFields = {
    entityVersion: { type: Number, default: 1, index: true },
    securityMeta: {
      isObfuscated: { type: Boolean, default: true },
      lastObfuscatedAt: { type: Date, default: Date.now }
    }
  };

  if (!schema.path('createdBy')) {
    baseFields.createdBy = { type: schema.base.Schema.Types.ObjectId, ref: 'User' };
  }
  if (!schema.path('updatedBy')) {
    baseFields.updatedBy = { type: schema.base.Schema.Types.ObjectId, ref: 'User' };
  }

  schema.add(baseFields);

  schema.pre('save', function beforeSave(next) {
    this.$locals = this.$locals || {};
    this.$locals.wasNew = this.isNew;

    if (!this.isNew) {
      this.entityVersion = (this.entityVersion || 1) + 1;
    }

    this.securityMeta = this.securityMeta || {};
    this.securityMeta.isObfuscated = true;
    this.securityMeta.lastObfuscatedAt = new Date();
    next();
  });

  const queryUpdateMethods = ['findOneAndUpdate', 'updateOne', 'updateMany'];
  queryUpdateMethods.forEach((method) => {
    schema.pre(method, function beforeUpdate(next) {
      const update = this.getUpdate() || {};
      update.$inc = { ...(update.$inc || {}), entityVersion: 1 };
      update.$set = {
        ...(update.$set || {}),
        updatedAt: new Date(),
        'securityMeta.isObfuscated': true,
        'securityMeta.lastObfuscatedAt': new Date()
      };
      this.setUpdate(update);
      next();
    });
  });

  schema.post('save', function afterSave(doc) {
    try {
      logEntityEvent({
        entity: entityName,
        operation: doc?.$locals?.wasNew ? 'create' : 'update',
        documentId: doc?._id,
        actorId: doc?.updatedBy || doc?.createdBy
      });
    } catch (error) {
      logEntityError({ entity: entityName, operation: 'save', error });
    }
  });

  queryUpdateMethods.forEach((method) => {
    schema.post(method, function afterUpdate(result) {
      try {
        logEntityEvent({
          entity: entityName,
          operation: 'update_query',
          documentId: result?._id,
          changes: this.getUpdate(),
          metadata: { query: this.getQuery(), method }
        });
      } catch (error) {
        logEntityError({ entity: entityName, operation: 'update_query', error });
      }
    });
  });

  ['findOneAndDelete', 'deleteOne', 'deleteMany'].forEach((method) => {
    schema.post(method, function afterDelete(result) {
      try {
        logEntityEvent({
          entity: entityName,
          operation: 'delete',
          documentId: result?._id,
          metadata: { query: this.getQuery ? this.getQuery() : undefined, method }
        });
      } catch (error) {
        logEntityError({ entity: entityName, operation: 'delete', error });
      }
    });
  });

  const applySecurityTransform = (_doc, ret) => {
    if (!ret || typeof ret !== 'object') return ret;
    delete ret.__v;
    if (enableObfuscation) {
      obfuscateDocument(ret, { sensitiveFields });
    }
    return ret;
  };

  schema.set('toJSON', mergeTransform(schema.get('toJSON') || {}, applySecurityTransform));
  schema.set('toObject', mergeTransform(schema.get('toObject') || {}, applySecurityTransform));
};

module.exports = baseEntityPlugin;
