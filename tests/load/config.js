/**
 * k6 Load Testing Configuration
 *
 * Usage:
 *   k6 run tests/load/scenarios/smoke.js
 *   k6 run tests/load/scenarios/load.js
 *   k6 run tests/load/scenarios/stress.js
 *
 * Install k6: https://k6.io/docs/get-started/installation/
 */

// Base configuration
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

// Test user credentials
export const TEST_USERS = {
  admin: {
    username: 'admin_test',
    password: 'Test@123',
  },
  ops: {
    username: 'ops_exec_test',
    password: 'Test@123',
  },
  client: {
    email: 'test@client.com',
    // Uses OTP-based login
  },
};

// Thresholds for pass/fail criteria
export const THRESHOLDS = {
  // Response time thresholds
  http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% under 500ms, 99% under 1s

  // Error rate threshold
  http_req_failed: ['rate<0.01'], // Less than 1% error rate

  // Iteration duration
  iteration_duration: ['p(95)<2000'], // 95% of iterations under 2s
};

// Scaling stages for load test
export const LOAD_STAGES = [
  { duration: '1m', target: 10 },   // Ramp up to 10 users
  { duration: '3m', target: 50 },   // Ramp up to 50 users
  { duration: '5m', target: 100 },  // Ramp up to 100 users
  { duration: '5m', target: 100 },  // Stay at 100 users
  { duration: '2m', target: 0 },    // Ramp down
];

// Scaling stages for stress test
export const STRESS_STAGES = [
  { duration: '1m', target: 50 },   // Ramp up quickly
  { duration: '2m', target: 100 },  // Normal load
  { duration: '2m', target: 200 },  // Beyond normal
  { duration: '2m', target: 300 },  // Stress point
  { duration: '2m', target: 400 },  // Breaking point?
  { duration: '3m', target: 0 },    // Recovery
];

// API endpoints for testing
export const ENDPOINTS = {
  // Health checks
  health: '/health',
  healthDetailed: '/health/detailed',
  ready: '/ready',

  // Auth
  staffLogin: '/api/auth/staff/login',
  clientOtp: '/api/auth/client/send-otp',
  session: '/api/auth/session',
  logout: '/api/auth/logout',

  // Client portal
  clientDashboard: '/api/client/dashboard',
  serviceRequests: '/api/service-requests',
  services: '/api/services',
  compliance: '/api/compliance-state',

  // Operations
  workQueue: '/api/ops/work-queue',
  opsStats: '/api/ops/stats',

  // Admin
  adminUsers: '/api/admin/users',
  adminServices: '/api/admin/services',
};

// Helper to create headers with auth
export function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'Cookie': `session=${token}`,
  };
}

// Helper to create request headers without auth
export function baseHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };
}
