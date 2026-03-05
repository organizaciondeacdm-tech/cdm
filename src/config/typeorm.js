const { DataSource } = require('typeorm');
const { getMongoUri } = require('../utils/envObfuscator');

let appDataSource = null;

const sanitizeUri = (uri = '') => String(uri).replace(/:[^:@]*@/, ':****@');

const getDataSource = () => {
  if (appDataSource) return appDataSource;

  const mongoUri = getMongoUri();
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is required');
  }

  appDataSource = new DataSource({
    type: 'mongodb',
    url: mongoUri,
    logging: false,
    synchronize: false
  });

  return appDataSource;
};

const initializeDataSource = async (logger = console) => {
  const ds = getDataSource();
  if (ds.isInitialized) return ds;
  logger.info?.(`Connecting to MongoDB with TypeORM: ${sanitizeUri(process.env.MONGODB_URI || '')}`);
  await ds.initialize();
  return ds;
};

module.exports = {
  getDataSource,
  initializeDataSource
};
