/**
 * Load Test
 *
 * Simulates normal to high load on the system
 * Tests system capacity for 5000 clients/year (~15 concurrent)
 *
 * Run: k6 run tests/load/scenarios/load.js
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
  LOAD_STAGES,
  THRESHOLDS,
} from '../config.js';

// Custom metrics
const loginSuccess = new Rate('login_success');
const apiErrors = new Counter('api_errors');
const dashboardLoad = new Trend('dashboard_load_time');

export const options = {
  stages: LOAD_STAGES,
  thresholds: {
    ...THRESHOLDS,
    login_success: ['rate>0.95'], // 95% login success
    dashboard_load_time: ['p(95)<1000'], // Dashboard under 1s
  },
};

// Login and get session token
function login() {
  const res = http.post(
    `${BASE_URL}${ENDPOINTS.staffLogin}`,
    JSON.stringify({
      username: TEST_USERS.admin.username,
      password: TEST_USERS.admin.password,
    }),
    { headers: baseHeaders() }
  );

  const success = res.status === 200;
  loginSuccess.add(success);

  if (!success) {
    apiErrors.add(1);
    return null;
  }

  // Extract session cookie
  const cookies = res.cookies;
  return cookies.session ? cookies.session[0].value : null;
}

export default function () {
  let sessionToken = null;

  // Login flow
  group('Authentication', function () {
    sessionToken = login();
    if (!sessionToken) {
      return; // Skip rest if login failed
    }
    sleep(1);
  });

  if (!sessionToken) return;

  // Client portal flow
  group('Client Portal', function () {
    // Dashboard
    const startTime = Date.now();
    const dashRes = http.get(`${BASE_URL}${ENDPOINTS.clientDashboard}`, {
      headers: authHeaders(sessionToken),
    });
    dashboardLoad.add(Date.now() - startTime);

    check(dashRes, {
      'dashboard loads': (r) => r.status === 200,
    });

    if (dashRes.status !== 200) apiErrors.add(1);
    sleep(2);

    // Service requests
    const srRes = http.get(`${BASE_URL}${ENDPOINTS.serviceRequests}`, {
      headers: authHeaders(sessionToken),
    });
    check(srRes, {
      'service requests load': (r) => r.status === 200,
    });

    if (srRes.status !== 200) apiErrors.add(1);
    sleep(1);

    // Services catalog
    const servicesRes = http.get(`${BASE_URL}${ENDPOINTS.services}`, {
      headers: authHeaders(sessionToken),
    });
    check(servicesRes, {
      'services catalog loads': (r) => r.status === 200,
    });

    if (servicesRes.status !== 200) apiErrors.add(1);
    sleep(1);
  });

  // Operations flow (if user has ops role)
  group('Operations', function () {
    const workQueueRes = http.get(`${BASE_URL}${ENDPOINTS.workQueue}`, {
      headers: authHeaders(sessionToken),
    });

    // May return 403 if not ops user - that's ok
    check(workQueueRes, {
      'work queue responds': (r) => r.status === 200 || r.status === 403,
    });

    sleep(1);
  });

  // Logout
  group('Logout', function () {
    const logoutRes = http.post(`${BASE_URL}${ENDPOINTS.logout}`, null, {
      headers: authHeaders(sessionToken),
    });

    check(logoutRes, {
      'logout succeeds': (r) => r.status === 200,
    });

    sleep(1);
  });
}

export function handleSummary(data) {
  const checks = data.metrics.checks;
  const httpReqs = data.metrics.http_reqs;
  const duration = data.metrics.http_req_duration;
  const loginRate = data.metrics.login_success;
  const errors = data.metrics.api_errors;
  const dashTime = data.metrics.dashboard_load_time;

  const summary = `
================================================================================
LOAD TEST SUMMARY
================================================================================
Virtual Users:      ${LOAD_STAGES[LOAD_STAGES.length - 2]?.target || 'N/A'} peak
Total Requests:     ${httpReqs?.values?.count || 0}
Request Rate:       ${httpReqs?.values?.rate?.toFixed(2) || 0}/s

Response Times:
  - Average:        ${duration?.values?.avg?.toFixed(2) || 0}ms
  - p(95):          ${duration?.values['p(95)']?.toFixed(2) || 0}ms
  - p(99):          ${duration?.values['p(99)']?.toFixed(2) || 0}ms
  - Max:            ${duration?.values?.max?.toFixed(2) || 0}ms

Dashboard Load Time:
  - Average:        ${dashTime?.values?.avg?.toFixed(2) || 0}ms
  - p(95):          ${dashTime?.values['p(95)']?.toFixed(2) || 0}ms

Login Success Rate: ${((loginRate?.values?.rate || 0) * 100).toFixed(2)}%
API Errors:         ${errors?.values?.count || 0}
Check Passes:       ${checks?.values?.passes || 0}
Check Failures:     ${checks?.values?.fails || 0}

Status: ${checks?.values?.fails === 0 && (loginRate?.values?.rate || 0) > 0.95 ? 'PASSED' : 'FAILED'}
================================================================================
`;

  return {
    stdout: summary,
    'tests/load/results/load-summary.json': JSON.stringify(data),
  };
}
