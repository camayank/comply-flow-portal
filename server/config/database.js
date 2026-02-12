/**
 * Database Configuration
 * PostgreSQL connection settings and Knex configuration
 */

require('dotenv').config();

// Validate required environment variables in production
const validateEnv = () => {
  const env = process.env.NODE_ENV || 'development';
  if (env === 'production') {
    const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0 && !process.env.DATABASE_URL) {
      throw new Error(`Missing required database environment variables: ${missing.join(', ')}`);
    }
  }
};

validateEnv();

const config = {
  // Development environment
  development: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'complyflow_dev',
      user: process.env.DB_USER || 'postgres',
      // SECURITY: No default password - must be set in environment
      password: process.env.DB_PASSWORD || ''
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: '../database/migrations',
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: '../database/seeds'
    }
  },

  // Test environment
  test: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME_TEST || 'complyflow_test',
      user: process.env.DB_USER || 'postgres',
      // SECURITY: No default password - must be set in environment
      password: process.env.DB_PASSWORD || ''
    },
    pool: {
      min: 1,
      max: 5
    },
    migrations: {
      directory: '../database/migrations',
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: '../database/seeds'
    }
  },

  // Production environment
  production: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL || {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    },
    pool: {
      min: 2,
      max: 20,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
      createTimeoutMillis: 30000
    },
    migrations: {
      directory: '../database/migrations',
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: '../database/seeds'
    },
    // Production-specific settings
    acquireConnectionTimeout: 60000,
    log: {
      warn(message) {
        console.warn('DB Warning:', message);
      },
      error(message) {
        console.error('DB Error:', message);
      }
    }
  }
};

// Get environment from NODE_ENV or default to development
const environment = process.env.NODE_ENV || 'development';

module.exports = config[environment];
module.exports.allConfig = config;
