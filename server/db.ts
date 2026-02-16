import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as baseSchema from "@shared/schema";
import * as enterpriseSchema from "../shared/enterprise-schema";

// Merge base and enterprise schemas
const schema = { ...baseSchema, ...enterpriseSchema };

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

/**
 * Connection Pool Configuration for Scale
 *
 * Tuned for 5000+ clients/year workload:
 * - max: Maximum connections in pool (default 20, configurable via env)
 * - min: Minimum connections to maintain (prevents cold starts)
 * - idleTimeoutMillis: Close idle connections after 30 seconds
 * - connectionTimeoutMillis: Fail fast if can't connect in 10 seconds
 * - maxUses: Close connection after N queries (prevents memory leaks)
 */
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  // Pool size configuration
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  min: parseInt(process.env.DB_POOL_MIN || '5', 10),
  // Timeouts
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000', 10),
  // Connection health
  maxUses: parseInt(process.env.DB_MAX_USES || '7500', 10),
  // SSL for production
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
    : undefined,
};

export const pool = new Pool(poolConfig);

// Pool event handlers for monitoring
pool.on('connect', () => {
  // Connection established - useful for debugging
  if (process.env.DB_DEBUG === 'true') {
    console.log('[DB Pool] New connection established');
  }
});

pool.on('error', (err) => {
  console.error('[DB Pool] Unexpected error on idle client:', err.message);
});

pool.on('remove', () => {
  // Connection removed from pool
  if (process.env.DB_DEBUG === 'true') {
    console.log('[DB Pool] Connection removed');
  }
});

export const db = drizzle({ client: pool, schema });

// Export pool stats for health checks
export function getPoolStats() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    maxConnections: poolConfig.max,
    minConnections: poolConfig.min,
  };
}

// Re-export all schema tables for convenience
export { baseSchema, enterpriseSchema };
