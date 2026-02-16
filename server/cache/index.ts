/**
 * Cache Module
 *
 * Exports all caching utilities for use across the application
 */

export {
  initializeRedis,
  isRedisAvailable,
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheDeletePattern,
  cacheGetOrSet,
  getCacheStats,
  closeRedis,
} from './redis-client';

export {
  CacheTTL,
  UserCacheKeys,
  SessionCacheKeys,
  ServiceCacheKeys,
  EntityCacheKeys,
  ComplianceCacheKeys,
  WorkQueueCacheKeys,
  DashboardCacheKeys,
  StatsCacheKeys,
  getInvalidationKeys,
} from './cache-keys';
