const path = require('path');

const env = process.env.NODE_ENV || 'development';

module.exports = {
  env,
  port: parseInt(process.env.PORT || '5000', 10),
  dbPath: process.env.DB_PATH || (
    env === 'test'
      ? path.resolve(__dirname, '../../data/test.sqlite')
      : path.resolve(__dirname, '../../data/adlasb.sqlite')
  ),
  defaultRole: process.env.DEFAULT_ROLE || 'B1_DLAO_OFFICER',
  corsOrigin: process.env.CORS_ORIGIN || '*'
};
