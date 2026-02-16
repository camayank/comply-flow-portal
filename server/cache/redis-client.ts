/**
 * Redis Client Configuration
 *
 * Provides caching infrastructure for scaling to 5000+ clients/year
 * Falls back gracefully to in-memory cache if Redis is unavailable
 */

import { createClient, RedisClientType } from 'redis';
import { logger } from '../logger';

// Redis client singleton
let redisClient: RedisClientType | null = null;
let isRedisConnected = false;

// In-memory fallback cache
const memoryCache = new Map<string, { value: string; expiry: number }>();

/**
 * Initialize Redis connection
 */
export async function initializeRedis(): Promise<boolean> {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    logger.warn('REDIS_URL not configured - using in-memory cache fallback');
    return false;
  }

  try {
    redisClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis: Max reconnection attempts reached');
            return new Error('Max reconnection attempts reached');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err.message);
      isRedisConnected = false;
    });

    redisClient.on('connect', () => {
      logger.info('Redis: Connected');
      isRedisConnected = true;
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis: Reconnecting...');
    });

    redisClient.on('end', () => {
      logger.info('Redis: Connection closed');
      isRedisConnected = false;
    });

    await redisClient.connect();
    isRedisConnected = true;
    logger.info('Redis cache initialized successfully');
    return true;
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    isRedisConnected = false;
    return false;
  }
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return isRedisConnected && redisClient !== null;
}

/**
 * Get value from cache
 */
export async function cacheGet(key: string): Promise<string | null> {
  try {
    if (isRedisAvailable() && redisClient) {
      return await redisClient.get(key);
    }

    // Fallback to memory cache
    const cached = memoryCache.get(key);
    if (cached) {
      if (Date.now() < cached.expiry) {
        return cached.value;
      }
      memoryCache.delete(key);
    }
    return null;
  } catch (error) {
    logger.error(`Cache GET error for key ${key}:`, error);
    return null;
  }
}

/**
 * Set value in cache with TTL
 */
export async function cacheSet(
  key: string,
  value: string,
  ttlSeconds: number = 300
): Promise<boolean> {
  try {
    if (isRedisAvailable() && redisClient) {
      await redisClient.setEx(key, ttlSeconds, value);
      return true;
    }

    // Fallback to memory cache
    memoryCache.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000,
    });
    return true;
  } catch (error) {
    logger.error(`Cache SET error for key ${key}:`, error);
    return false;
  }
}

/**
 * Delete value from cache
 */
export async function cacheDelete(key: string): Promise<boolean> {
  try {
    if (isRedisAvailable() && redisClient) {
      await redisClient.del(key);
      return true;
    }

    memoryCache.delete(key);
    return true;
  } catch (error) {
    logger.error(`Cache DELETE error for key ${key}:`, error);
    return false;
  }
}

/**
 * Delete multiple keys matching a pattern
 */
export async function cacheDeletePattern(pattern: string): Promise<number> {
  try {
    if (isRedisAvailable() && redisClient) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return keys.length;
    }

    // Fallback: delete matching keys from memory cache
    let deleted = 0;
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    for (const key of memoryCache.keys()) {
      if (regex.test(key)) {
        memoryCache.delete(key);
        deleted++;
      }
    }
    return deleted;
  } catch (error) {
    logger.error(`Cache DELETE PATTERN error for ${pattern}:`, error);
    return 0;
  }
}

/**
 * Get or set cache with factory function
 */
export async function cacheGetOrSet<T>(
  key: string,
  factory: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  const cached = await cacheGet(key);
  if (cached) {
    return JSON.parse(cached) as T;
  }

  const value = await factory();
  await cacheSet(key, JSON.stringify(value), ttlSeconds);
  return value;
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    type: isRedisAvailable() ? 'redis' : 'memory',
    connected: isRedisConnected,
    memoryCacheSize: memoryCache.size,
  };
}

/**
 * Cleanup memory cache (remove expired entries)
 */
export function cleanupMemoryCache(): number {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, value] of memoryCache.entries()) {
    if (now >= value.expiry) {
      memoryCache.delete(key);
      cleaned++;
    }
  }
  return cleaned;
}

// Periodically clean up memory cache (every 5 minutes)
setInterval(() => {
  const cleaned = cleanupMemoryCache();
  if (cleaned > 0) {
    logger.debug(`Memory cache cleanup: removed ${cleaned} expired entries`);
  }
}, 5 * 60 * 1000);

/**
 * Graceful shutdown
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isRedisConnected = false;
    logger.info('Redis connection closed');
  }
}
