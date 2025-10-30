const knex = require('knex');
const knexConfig = require('../../knexfile');
const logger = require('../utils/logger');

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];

if (!config) {
  throw new Error(`No database configuration found for environment: ${environment}`);
}

// Create Knex instance
const db = knex(config);

// Test database connection
db.raw('SELECT 1')
  .then(() => {
    logger.info('Database connection established successfully', {
      environment,
      host: config.connection?.host || 'from_url',
      database: config.connection?.database || 'from_url'
    });
  })
  .catch((err) => {
    logger.error('Database connection failed', {
      error: err.message,
      environment,
      config: {
        host: config.connection?.host || 'from_url',
        database: config.connection?.database || 'from_url'
      }
    });
    process.exit(1);
  });

// Handle connection errors
db.on('error', (err) => {
  logger.error('Database error', {
    error: err.message,
    stack: err.stack
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Closing database connection...');
  await db.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Closing database connection...');
  await db.destroy();
  process.exit(0);
});

module.exports = db;