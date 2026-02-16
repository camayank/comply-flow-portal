/**
 * Cache Key Definitions
 *
 * Centralized cache key patterns for consistency and easy invalidation
 */

// TTL constants (in seconds)
export const CacheTTL = {
  SHORT: 60,           // 1 minute - for rapidly changing data
  MEDIUM: 300,         // 5 minutes - default
  LONG: 900,           // 15 minutes - for stable data
  HOUR: 3600,          // 1 hour - for reference data
  DAY: 86400,          // 24 hours - for static data
} as const;

// Cache key prefixes
const PREFIX = {
  USER: 'user',
  SESSION: 'session',
  SERVICE: 'service',
  ENTITY: 'entity',
  COMPLIANCE: 'compliance',
  WORK_QUEUE: 'work_queue',
  DASHBOARD: 'dashboard',
  STATS: 'stats',
} as const;

/**
 * User-related cache keys
 */
export const UserCacheKeys = {
  // User profile by ID
  profile: (userId: number) => `${PREFIX.USER}:profile:${userId}`,

  // User permissions
  permissions: (userId: number) => `${PREFIX.USER}:permissions:${userId}`,

  // User's business entities
  entities: (userId: number) => `${PREFIX.USER}:entities:${userId}`,

  // Pattern to invalidate all user cache
  allUserKeys: (userId: number) => `${PREFIX.USER}:*:${userId}`,
};

/**
 * Session-related cache keys
 */
export const SessionCacheKeys = {
  // Session data by token
  byToken: (token: string) => `${PREFIX.SESSION}:token:${token}`,

  // User's active sessions
  userSessions: (userId: number) => `${PREFIX.SESSION}:user:${userId}`,
};

/**
 * Service catalog cache keys
 */
export const ServiceCacheKeys = {
  // Full service catalog
  catalog: () => `${PREFIX.SERVICE}:catalog`,

  // Service by ID
  byId: (serviceId: string) => `${PREFIX.SERVICE}:${serviceId}`,

  // Services by category
  byCategory: (category: string) => `${PREFIX.SERVICE}:category:${category}`,

  // Service pricing
  pricing: (serviceId: string) => `${PREFIX.SERVICE}:pricing:${serviceId}`,
};

/**
 * Business entity cache keys
 */
export const EntityCacheKeys = {
  // Entity by ID
  byId: (entityId: number) => `${PREFIX.ENTITY}:${entityId}`,

  // Entity compliance state
  complianceState: (entityId: number) => `${PREFIX.ENTITY}:compliance:${entityId}`,

  // Entity service requests
  serviceRequests: (entityId: number) => `${PREFIX.ENTITY}:requests:${entityId}`,
};

/**
 * Compliance cache keys
 */
export const ComplianceCacheKeys = {
  // Compliance rules (rarely change)
  rules: () => `${PREFIX.COMPLIANCE}:rules`,

  // Compliance tracking for entity
  tracking: (entityId: number) => `${PREFIX.COMPLIANCE}:tracking:${entityId}`,

  // Upcoming deadlines (global)
  upcomingDeadlines: () => `${PREFIX.COMPLIANCE}:upcoming`,

  // Entity-specific deadlines
  entityDeadlines: (entityId: number) => `${PREFIX.COMPLIANCE}:deadlines:${entityId}`,
};

/**
 * Work queue cache keys
 */
export const WorkQueueCacheKeys = {
  // Work queue stats
  stats: () => `${PREFIX.WORK_QUEUE}:stats`,

  // At-risk items
  atRisk: () => `${PREFIX.WORK_QUEUE}:at_risk`,

  // Breached items
  breached: () => `${PREFIX.WORK_QUEUE}:breached`,

  // Team workload
  teamWorkload: () => `${PREFIX.WORK_QUEUE}:team_workload`,

  // Assignee workload
  assigneeWorkload: (userId: number) => `${PREFIX.WORK_QUEUE}:assignee:${userId}`,
};

/**
 * Dashboard cache keys
 */
export const DashboardCacheKeys = {
  // Client dashboard
  client: (userId: number) => `${PREFIX.DASHBOARD}:client:${userId}`,

  // Operations dashboard
  operations: () => `${PREFIX.DASHBOARD}:operations`,

  // Admin dashboard
  admin: () => `${PREFIX.DASHBOARD}:admin`,

  // Executive dashboard
  executive: () => `${PREFIX.DASHBOARD}:executive`,
};

/**
 * Statistics cache keys
 */
export const StatsCacheKeys = {
  // Global platform stats
  platform: () => `${PREFIX.STATS}:platform`,

  // Daily stats
  daily: (date: string) => `${PREFIX.STATS}:daily:${date}`,

  // Service performance stats
  servicePerformance: () => `${PREFIX.STATS}:service_performance`,

  // Team performance
  teamPerformance: () => `${PREFIX.STATS}:team_performance`,
};

/**
 * Helper to invalidate related cache keys
 */
export function getInvalidationKeys(event: string, data: Record<string, any>): string[] {
  const keys: string[] = [];

  switch (event) {
    case 'service_request_created':
    case 'service_request_updated':
      if (data.userId) keys.push(UserCacheKeys.entities(data.userId));
      if (data.entityId) {
        keys.push(EntityCacheKeys.serviceRequests(data.entityId));
        keys.push(EntityCacheKeys.complianceState(data.entityId));
      }
      keys.push(WorkQueueCacheKeys.stats());
      break;

    case 'user_updated':
      if (data.userId) {
        keys.push(UserCacheKeys.profile(data.userId));
        keys.push(UserCacheKeys.permissions(data.userId));
      }
      break;

    case 'compliance_updated':
      if (data.entityId) {
        keys.push(EntityCacheKeys.complianceState(data.entityId));
        keys.push(ComplianceCacheKeys.tracking(data.entityId));
        keys.push(ComplianceCacheKeys.entityDeadlines(data.entityId));
      }
      keys.push(ComplianceCacheKeys.upcomingDeadlines());
      break;

    case 'work_item_assigned':
    case 'work_item_status_changed':
      keys.push(WorkQueueCacheKeys.stats());
      keys.push(WorkQueueCacheKeys.atRisk());
      keys.push(WorkQueueCacheKeys.breached());
      if (data.assigneeId) {
        keys.push(WorkQueueCacheKeys.assigneeWorkload(data.assigneeId));
      }
      break;
  }

  return keys;
}
