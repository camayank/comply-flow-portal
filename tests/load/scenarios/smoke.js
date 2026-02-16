/**
 * Smoke Test
 *
 * Quick sanity check that the system is working
 * Run: k6 run tests/load/scenarios/smoke.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, ENDPOINTS, baseHeaders, THRESHOLDS } from '../config.js';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: THRESHOLDS,
};

export default function () {
  // Health check
  const healthRes = http.get(`${BASE_URL}${ENDPOINTS.health}`);
  check(healthRes, {
    'health check returns 200': (r) => r.status === 200,
    'health check has ok status': (r) => JSON.parse(r.body).status === 'ok',
  });

  sleep(1);

  // Ready check
  const readyRes = http.get(`${BASE_URL}${ENDPOINTS.ready}`);
  check(readyRes, {
    'ready check returns 200': (r) => r.status === 200,
    'ready check is true': (r) => JSON.parse(r.body).ready === true,
  });

  sleep(1);

  // Services catalog (public endpoint)
  const servicesRes = http.get(`${BASE_URL}${ENDPOINTS.services}`, {
    headers: baseHeaders(),
  });
  check(servicesRes, {
    'services returns 200': (r) => r.status === 200,
  });

  sleep(1);

  // Protected endpoint should return 401
  const protectedRes = http.get(`${BASE_URL}${ENDPOINTS.clientDashboard}`, {
    headers: baseHeaders(),
  });
  check(protectedRes, {
    'protected endpoint requires auth': (r) => r.status === 401,
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: '  ', enableColors: true }),
    'tests/load/results/smoke-summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  const checks = data.metrics.checks;
  const httpReqs = data.metrics.http_reqs;
  const duration = data.metrics.http_req_duration;

  return `
================================================================================
SMOKE TEST SUMMARY
================================================================================
Total Requests:     ${httpReqs?.values?.count || 0}
Failed Requests:    ${data.metrics.http_req_failed?.values?.passes || 0}
Check Passes:       ${checks?.values?.passes || 0}
Check Failures:     ${checks?.values?.fails || 0}

Response Times:
  - Average:        ${duration?.values?.avg?.toFixed(2) || 0}ms
  - p(95):          ${duration?.values['p(95)']?.toFixed(2) || 0}ms
  - p(99):          ${duration?.values['p(99)']?.toFixed(2) || 0}ms
  - Max:            ${duration?.values?.max?.toFixed(2) || 0}ms

Status: ${checks?.values?.fails === 0 ? 'PASSED' : 'FAILED'}
================================================================================
`;
}
