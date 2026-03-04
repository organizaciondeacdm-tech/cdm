const { ObjectId } = require('mongodb');
const { getDataSource } = require('../../config/typeorm');
const { obfuscateDocument } = require('../../utils/obfuscation');
const { logEntityEvent, logEntityError } = require('../../services/entityLogger');

const isObjectIdLike = (value) => value instanceof ObjectId || (typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value));

const toObjectId = (value) => {
  if (value === undefined) return new ObjectId();
  if (value == null) return value;
  if (value instanceof ObjectId) return value;
  if (typeof value === 'object' && value._id) return toObjectId(value._id);
  if (typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value)) return new ObjectId(value);
  return value;
};

const normalizeValue = (value, key = '') => {
  if (Array.isArray(value)) return value.map((v) => normalizeValue(v, key));
  if (!value || typeof value !== 'object' || value instanceof Date || value instanceof ObjectId) {
    if (isObjectIdLike(value) && (key === '_id' || key.endsWith('Id') || key.endsWith('._id') || key.endsWith('.id'))) {
      return toObjectId(value);
    }
    return value;
  }

  const output = {};
  Object.keys(value).forEach((k) => {
    output[k] = normalizeValue(value[k], k);
  });
  return output;
};

const buildProjection = (select) => {
  if (!select) return undefined;
  if (typeof select === 'string') {
    return select.split(/\s+/).filter(Boolean).reduce((acc, field) => {
      if (field.startsWith('-')) {
        acc[field.slice(1)] = 0;
      } else {
        acc[field] = 1;
      }
      return acc;
    }, {});
  }
  if (Array.isArray(select)) {
    return select.reduce((acc, field) => {
      acc[field] = 1;
      return acc;
    }, {});
  }
  return select;
};

const hasAtomicOperator = (obj = {}) => Object.keys(obj).some((k) => String(k).startsWith('$'));
const toAtomicUpdate = (update = {}) => {
  const normalized = normalizeValue(update || {});
  if (hasAtomicOperator(normalized)) return normalized;
  return { $set: normalized };
};

class QueryBuilder {
  constructor(modelClass, filter = {}, options = {}) {
    this.modelClass = modelClass;
    this.filter = normalizeValue(filter);
    this.options = options;
    this._projection = buildProjection(options.select);
    this._sort = null;
    this._skip = 0;
    this._limit = 0;
    this._populate = [];
    this._lean = false;
    this._single = options.single === true;
  }

  populate(spec, select) {
    if (spec) {
      if (typeof spec === 'string' && select) {
        this._populate.push({ path: spec, select });
      } else {
        this._populate.push(spec);
      }
    }
    return this;
  }

  sort(spec) {
    this._sort = spec || null;
    return this;
  }

  skip(value = 0) {
    this._skip = Math.max(0, Number(value) || 0);
    return this;
  }

  limit(value = 0) {
    this._limit = Math.max(0, Number(value) || 0);
    return this;
  }

  select(selectSpec) {
    this._projection = buildProjection(selectSpec);
    return this;
  }

  lean() {
    this._lean = true;
    return this;
  }

  async countDocuments() {
    const collection = await this.modelClass.getCollection();
    return collection.countDocuments(this.filter);
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }

  async exec() {
    const collection = await this.modelClass.getCollection();
    let result;

    if (this._single) {
      result = await collection.findOne(this.filter, { projection: this._projection });
      if (!result) return null;
      let rows = [result];
      rows = await this.applyPopulate(rows);
      const row = rows[0] || null;
      return this._lean ? row : this.modelClass.hydrate(row);
    }

    const cursor = collection.find(this.filter, { projection: this._projection });
    if (this._sort) cursor.sort(this._sort);
    if (this._skip) cursor.skip(this._skip);
    if (this._limit) cursor.limit(this._limit);

    result = await cursor.toArray();
    result = await this.applyPopulate(result);
    if (this._lean) return result;
    return result.map((row) => this.modelClass.hydrate(row));
  }

  async applyPopulate(rows) {
    if (!this._populate.length || !rows.length) return rows;

    let out = rows;
    for (const spec of this._populate) {
      out = await this.modelClass.applyPopulate(out, spec);
    }
    return out;
  }
}

class BaseMongoDocument {
  constructor(modelClass, payload = {}) {
    Object.assign(this, payload || {});
    Object.defineProperty(this, '__modelClass', {
      enumerable: false,
      configurable: false,
      writable: false,
      value: modelClass
    });
  }

  async save() {
    return this.__modelClass.saveDocument(this);
  }

  async updateOne(update) {
    return this.__modelClass.updateOne({ _id: this._id }, update);
  }

  toObject() {
    const plain = { ...this };
    return this.__modelClass.applyOutputTransform(plain);
  }

  toJSON() {
    return this.toObject();
  }
}

class BaseMongoModel {
  static collectionName = null;
  static sensitiveFields = [];
  static defaultSort = { createdAt: -1 };
  static references = {};

  constructor(payload = {}) {
    const doc = new BaseMongoDocument(this.constructor, payload);
    Object.setPrototypeOf(doc, this.constructor.documentPrototype || BaseMongoDocument.prototype);
    return doc;
  }

  static entityName() {
    return this.name || this.collectionName || 'Entity';
  }

  static get mongoDb() {
    const ds = getDataSource();
    if (!ds.isInitialized) {
      throw new Error('DataSource is not initialized. Run connectDB first.');
    }
    // In TypeORM >= 0.3 with the MongoDB Node.js driver v4+,
    // driver.queryRunner.databaseConnection is a MongoClient (not a Db).
    // We must call .db(databaseName) to get the native Db instance.
    const client = ds.driver?.queryRunner?.databaseConnection;
    if (!client) {
      throw new Error('MongoDB client not available. Run connectDB first.');
    }
    return client.db(ds.driver.database);
  }

  static async getCollection() {
    return this.mongoDb.collection(this.collectionName);
  }

  static hydrate(raw) {
    if (!raw) return null;
    const doc = new BaseMongoDocument(this, raw);
    Object.setPrototypeOf(doc, this.documentPrototype || BaseMongoDocument.prototype);
    return doc;
  }

  static applyOutputTransform(data) {
    const out = { ...data };
    delete out.__v;
    obfuscateDocument(out, { sensitiveFields: this.sensitiveFields || [] });
    return out;
  }

  static async saveDocument(instance) {
    const collection = await this.getCollection();
    const now = new Date();
    const payload = normalizeValue({ ...instance });

    if (typeof this.preSave === 'function') {
      await this.preSave(payload, instance);
    }

    payload.updatedAt = now;
    if (!payload.createdAt) payload.createdAt = now;

    payload.entityVersion = Number(payload.entityVersion || 1);
    if (payload._id) {
      payload.entityVersion += 1;
    }

    payload.securityMeta = {
      isObfuscated: true,
      lastObfuscatedAt: now,
      ...(payload.securityMeta || {})
    };

    try {
      if (!payload._id) {
        const insertResult = await collection.insertOne({ ...payload });
        payload._id = insertResult.insertedId;
        logEntityEvent({ entity: this.entityName(), operation: 'create', documentId: payload._id, actorId: payload.updatedBy || payload.createdBy });
      } else {
        payload._id = toObjectId(payload._id);
        await collection.replaceOne({ _id: payload._id }, payload, { upsert: false });
        logEntityEvent({ entity: this.entityName(), operation: 'update', documentId: payload._id, actorId: payload.updatedBy || payload.createdBy });
      }
    } catch (error) {
      logEntityError({ entity: this.entityName(), operation: 'save', error });
      throw error;
    }

    Object.keys(instance).forEach((k) => delete instance[k]);
    Object.assign(instance, payload);
    return instance;
  }

  static async create(payload = {}) {
    const doc = this.hydrate(payload);
    await doc.save();
    return doc;
  }

  static find(filter = {}, projection = null) {
    return new QueryBuilder(this, filter, { select: projection, single: false });
  }

  static findOne(filter = {}, projection = null) {
    return new QueryBuilder(this, filter, { select: projection, single: true });
  }

  static findById(id) {
    return this.findOne({ _id: toObjectId(id) });
  }

  static async countDocuments(filter = {}) {
    const collection = await this.getCollection();
    return collection.countDocuments(normalizeValue(filter));
  }

  static async estimatedDocumentCount() {
    const collection = await this.getCollection();
    return collection.estimatedDocumentCount();
  }

  static async aggregate(pipeline = []) {
    const collection = await this.getCollection();
    return collection.aggregate(pipeline).toArray();
  }

  static async deleteOne(filter = {}) {
    const collection = await this.getCollection();
    return collection.deleteOne(normalizeValue(filter));
  }

  static async deleteMany(filter = {}) {
    const collection = await this.getCollection();
    return collection.deleteMany(normalizeValue(filter));
  }

  static async updateOne(filter = {}, update = {}, options = {}) {
    const collection = await this.getCollection();
    const normalizedUpdate = toAtomicUpdate(update);
    if (!normalizedUpdate.$set) normalizedUpdate.$set = {};
    normalizedUpdate.$set.updatedAt = new Date();
    if (!normalizedUpdate.$inc) normalizedUpdate.$inc = {};
    normalizedUpdate.$inc.entityVersion = Number(normalizedUpdate.$inc.entityVersion || 1);
    return collection.updateOne(normalizeValue(filter), normalizedUpdate, options);
  }

  static async updateMany(filter = {}, update = {}, options = {}) {
    const collection = await this.getCollection();
    const normalizedUpdate = toAtomicUpdate(update);
    if (!normalizedUpdate.$set) normalizedUpdate.$set = {};
    normalizedUpdate.$set.updatedAt = new Date();
    if (!normalizedUpdate.$inc) normalizedUpdate.$inc = {};
    normalizedUpdate.$inc.entityVersion = Number(normalizedUpdate.$inc.entityVersion || 1);
    return collection.updateMany(normalizeValue(filter), normalizedUpdate, options);
  }

  static async findByIdAndUpdate(id, update = {}, options = {}) {
    const collection = await this.getCollection();
    const normalizedUpdate = toAtomicUpdate(update);
    if (!normalizedUpdate.$set) normalizedUpdate.$set = {};
    normalizedUpdate.$set.updatedAt = new Date();
    if (!normalizedUpdate.$inc) normalizedUpdate.$inc = {};
    normalizedUpdate.$inc.entityVersion = Number(normalizedUpdate.$inc.entityVersion || 1);
    return collection.findOneAndUpdate(
      { _id: toObjectId(id) },
      normalizedUpdate,
      { returnDocument: options.new ? 'after' : 'before' }
    );
  }

  static async applyPopulate(rows, spec) {
    const conf = typeof spec === 'string' ? { path: spec } : (spec || {});
    const path = conf.path;
    if (!path) return rows;

    const ref = this.references?.[path];
    if (!ref) return rows;

    const targetModel = typeof ref.model === 'function' ? ref.model() : ref.model;
    const match = conf.match || {};

    if (ref.foreignField) {
      await Promise.all(rows.map(async (row) => {
        const filter = { ...match, [ref.foreignField]: row._id };
        let query = targetModel.find(filter);
        if (conf.select) query = query.select(conf.select);
        const populated = await query.lean();
        row[path] = populated;
        if (conf.populate) {
          row[path] = await targetModel.applyPopulate(row[path], conf.populate);
        }
      }));
      return rows;
    }

    const ids = [];
    rows.forEach((row) => {
      const value = row[ref.localField || path];
      if (Array.isArray(value)) value.forEach((id) => ids.push(toObjectId(id)));
      else if (value) ids.push(toObjectId(value));
    });

    if (!ids.length) {
      rows.forEach((row) => {
        row[path] = ref.isArray ? [] : null;
      });
      return rows;
    }

    let targetQuery = targetModel.find({ _id: { $in: ids }, ...match });
    if (conf.select) targetQuery = targetQuery.select(conf.select);
    const targetRows = await targetQuery.lean();
    const byId = new Map(targetRows.map((r) => [String(r._id), r]));

    rows.forEach((row) => {
      const sourceValue = row[ref.localField || path];
      if (Array.isArray(sourceValue)) {
        row[path] = sourceValue
          .map((id) => byId.get(String(id)))
          .filter(Boolean);
      } else {
        row[path] = sourceValue ? (byId.get(String(sourceValue)) || null) : null;
      }
    });

    if (conf.populate) {
      await Promise.all(rows.map(async (row) => {
        if (Array.isArray(row[path])) {
          row[path] = await targetModel.applyPopulate(row[path], conf.populate);
        } else if (row[path]) {
          const nested = await targetModel.applyPopulate([row[path]], conf.populate);
          row[path] = nested[0] || null;
        }
      }));
    }

    return rows;
  }
}

module.exports = {
  BaseMongoModel,
  BaseMongoDocument,
  QueryBuilder,
  toObjectId,
  isObjectIdLike,
  normalizeValue,
  buildProjection
};
