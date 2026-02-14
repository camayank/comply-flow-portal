/**
 * Database Configuration
 * PostgreSQL connection using Drizzle ORM
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { logger } from '../logger';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Validate required environment variables in production
function validateDatabaseConfig(): void {
  const requiredVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];

  if (IS_PRODUCTION) {
    const missing = requiredVars.filter(varName => !process.env[varName]);

    if (missing.length > 0) {
      logger.error('CRITICAL: Missing required database configuration', { missing });
      throw new Error(
        `Missing required database environment variables in production: ${missing.join(', ')}. ` +
        'Please set these environment variables before starting the server.'
      );
    }

    // Warn about insecure defaults
    if (process.env.DB_PASSWORD && process.env.DB_PASSWORD.length < 12) {
      logger.warn('Database password is weak. Consider using a stronger password in production.');
    }
  } else {
    // Development: log warning about using defaults
    const usingDefaults = requiredVars.filter(varName => !process.env[varName]);
    if (usingDefaults.length > 0) {
      logger.warn('Using default database configuration', {
        defaults: usingDefaults,
        note: 'This is acceptable for development only'
      });
    }
  }
}

// Validate config before creating pool
validateDatabaseConfig();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'comply_flow_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  min: parseInt(process.env.DB_POOL_MIN || '2'),
  max: parseInt(process.env.DB_POOL_MAX || '10'),
});

// Handle pool errors
pool.on('error', (err) => {
  logger.error('Unexpected database pool error', { error: err.message, stack: err.stack });
  process.exit(-1);
});

// Create Drizzle instance
export const db = drizzle(pool);

// Export pool for raw queries if needed
export { pool };

// Test database connection
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    logger.info('Database connected successfully', { timestamp: result.rows[0].now });
    return true;
  } catch (error) {
    logger.error('Database connection failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return false;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  await pool.end();
  logger.info('Database pool closed');
}
