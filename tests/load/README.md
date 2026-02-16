# Load Testing with k6

Performance testing suite for DigiComply platform.

## Installation

```bash
# macOS
brew install k6

# Windows (chocolatey)
choco install k6

# Docker
docker pull grafana/k6
```

## Running Tests

### Smoke Test (Quick Sanity Check)
```bash
k6 run tests/load/scenarios/smoke.js
```

### Load Test (Normal to High Load)
```bash
k6 run tests/load/scenarios/load.js
```

### Stress Test (Find Breaking Points)
```bash
k6 run tests/load/scenarios/stress.js
```

### With Custom Base URL
```bash
BASE_URL=https://staging.example.com k6 run tests/load/scenarios/load.js
```

## Test Scenarios

| Test | VUs | Duration | Purpose |
|------|-----|----------|---------|
| Smoke | 1 | 30s | Quick sanity check |
| Load | 10→100 | 16min | Normal capacity test |
| Stress | 50→400 | 12min | Find breaking points |

## Thresholds

Default pass/fail criteria:
- 95% of requests under 500ms
- 99% of requests under 1000ms
- Error rate below 1%
- 95% login success rate

## Scaling Targets

For 5000 clients/year:
- ~15 concurrent users (average)
- ~50 concurrent users (peak)
- ~100 concurrent users (stress)

## Output

Results are saved to `tests/load/results/`:
- `smoke-summary.json`
- `load-summary.json`
- `stress-summary.json`

## CI/CD Integration

```yaml
# GitHub Actions example
- name: Run Load Tests
  run: |
    k6 run tests/load/scenarios/smoke.js --out json=results.json
    # Fail if thresholds not met
```

## Monitoring

For real-time monitoring, use k6 cloud or InfluxDB + Grafana:
```bash
k6 run --out influxdb=http://localhost:8086/k6 tests/load/scenarios/load.js
```
