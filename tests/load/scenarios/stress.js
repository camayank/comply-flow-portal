/**
 * Stress Test
 *
 * Pushes the system beyond normal capacity to find breaking points
 * Simulates traffic spikes and extreme load conditions
 *
 * Run: k6 run tests/load/scenarios/stress.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import {
  BASE_URL,
  ENDPOINTS,
  TEST_USERS,
  baseHeaders,
  authHeaders,
  STRESS_STAGES,
} from '../config.js';

// Custom metrics
const requestsPerSecond = new Trend('requests_per_second');
const errorsByStage = new Counter('errors_by_stage');
const responseTimeByEndpoint = new Trend('response_time_by_endpoint');

export const options = {
  stages: STRESS_STAGES,
  thresholds: {
    // More lenient thresholds for stress test
    http_req_duration: ['p(95)<2000'], // 95% under 2s
    http_req_failed: ['rate<0.10'], // Less than 10% error rate
  },
};

// Session cache to avoid login for every iteration
let sessionToken = null;
let loginAttempts = 0;
const MAX_LOGIN_ATTEMPTS = 3;

function ensureSession() {
  if (sessionToken) return sessionToken;

  if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
    return null;
  }

  loginAttempts++;

  const res = http.post(
    `${BASE_URL}${ENDPOINTS.staffLogin}`,
    JSON.stringify({
      username: TEST_USERS.admin.username,
      password: TEST_USERS.admin.password,
    }),
    { headers: baseHeaders() }
  );

  if (res.status === 200) {
    const cookies = res.cookies;
    sessionToken = cookies.session ? cookies.session[0].value : null;
    loginAttempts = 0;
  }

  return sessionToken;
}

export default function () {
  const startTime = Date.now();

  group('Health Checks', function () {
    const res = http.get(`${BASE_URL}${ENDPOINTS.health}`);
    check(res, {
      'health check ok': (r) => r.status === 200,
    });

    if (res.status !== 200) errorsByStage.add(1);
    responseTimeByEndpoint.add(res.timings.duration, { endpoint: 'health' });
  });

  group('Public Endpoints', function () {
    // Services catalog - high traffic endpoint
    const servicesRes = http.get(`${BASE_URL}${ENDPOINTS.services}`, {
      headers: baseHeaders(),
    });

    check(servicesRes, {
      'services catalog available': (r) => r.status === 200,
    });

    if (servicesRes.status !== 200) errorsByStage.add(1);
    responseTimeByEndpoint.add(servicesRes.timings.duration, { endpoint: 'services' });

    sleep(0.5);
  });

  group('Authenticated Endpoints', function () {
    const token = ensureSession();
    if (!token) {
      errorsByStage.add(1);
      return;
    }

    // Dashboard - most common authenticated endpoint
    const dashRes = http.get(`${BASE_URL}${ENDPOINTS.clientDashboard}`, {
      headers: authHeaders(token),
    });

    check(dashRes, {
      'dashboard responds': (r) => r.status === 200 || r.status === 401,
    });

    if (dashRes.status === 401) {
      sessionToken = null; // Clear invalid session
    }
    if (dashRes.status >= 500) errorsByStage.add(1);

    responseTimeByEndpoint.add(dashRes.timings.duration, { endpoint: 'dashboard' });

    sleep(0.5);

    // Service requests
    const srRes = http.get(`${BASE_URL}${ENDPOINTS.serviceRequests}`, {
      headers: authHeaders(token),
    });

    check(srRes, {
      'service requests responds': (r) => r.status === 200 || r.status === 401,
    });

    if (srRes.status >= 500) errorsByStage.add(1);
    responseTimeByEndpoint.add(srRes.timings.duration, { endpoint: 'service_requests' });
  });

  // Calculate requests per second
  const elapsed = (Date.now() - startTime) / 1000;
  if (elapsed > 0) {
    requestsPerSecond.add(4 / elapsed); // 4 requests per iteration
  }

  // Small pause between iterations
  sleep(Math.random() * 0.5);
}

export function handleSummary(data) {
  const httpReqs = data.metrics.http_reqs;
  const duration = data.metrics.http_req_duration;
  const failed = data.metrics.http_req_failed;
  const errors = data.metrics.errors_by_stage;

  // Analyze at what point the system started degrading
  const p50 = duration?.values['p(50)'] || 0;
  const p95 = duration?.values['p(95)'] || 0;
  const p99 = duration?.values['p(99)'] || 0;
  const errorRate = (failed?.values?.rate || 0) * 100;

  let analysis = '';
  if (p95 < 500 && errorRate < 1) {
    analysis = 'System handled stress well - no degradation observed';
  } else if (p95 < 1000 && errorRate < 5) {
    analysis = 'System showed mild degradation under stress';
  } else if (p95 < 2000 && errorRate < 10) {
    analysis = 'System degraded significantly under stress';
  } else {
    analysis = 'System reached breaking point - significant failures';
  }

  const summary = `
================================================================================
STRESS TEST SUMMARY
================================================================================
Peak Virtual Users: ${STRESS_STAGES.reduce((max, s) => Math.max(max, s.target), 0)}
Total Requests:     ${httpReqs?.values?.count || 0}
Request Rate:       ${httpReqs?.values?.rate?.toFixed(2) || 0}/s
Error Rate:         ${errorRate.toFixed(2)}%

Response Times:
  - p(50):          ${p50.toFixed(2)}ms
  - p(95):          ${p95.toFixed(2)}ms
  - p(99):          ${p99.toFixed(2)}ms
  - Max:            ${duration?.values?.max?.toFixed(2) || 0}ms

Errors:             ${errors?.values?.count || 0}

ANALYSIS: ${analysis}

================================================================================
RECOMMENDATIONS:
${p95 > 1000 ? '- Consider adding caching for high-latency endpoints\n' : ''}${errorRate > 5 ? '- Investigate error sources and add retry logic\n' : ''}${p99 > 2000 ? '- Review database queries for optimization\n' : ''}${errorRate < 1 && p95 < 500 ? '- System is well-optimized for current load levels\n' : ''}================================================================================
`;

  return {
    stdout: summary,
    'tests/load/results/stress-summary.json': JSON.stringify(data),
  };
}
