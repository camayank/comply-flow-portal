# API Migration Guide: V1 → V2

## Overview

DigiComply is migrating from **V1 scattered APIs** to **V2 unified Lifecycle APIs**. This guide helps you migrate your integrations smoothly.

**Timeline**: 
- **Deprecation Date**: January 22, 2026
- **Sunset Date**: June 1, 2026
- **Migration Window**: 19 weeks

---

## Quick Start

### 1. Check Deprecation Headers

V1 API responses now include deprecation headers:

```http
GET /api/v1/client/dashboard HTTP/1.1

HTTP/1.1 200 OK
X-API-Deprecated: true
X-Deprecation-Date: 2026-01-22
X-Sunset-Date: 2026-06-01
X-API-Replacement: /api/v2/lifecycle/dashboard
X-Deprecation-Message: Use the new Lifecycle Dashboard API for enhanced features
Link: </api/v2/lifecycle/dashboard>; rel="successor-version"
```

### 2. Update Your API Calls

**Before (V1)**:
```javascript
const response = await fetch('/api/v1/client/dashboard');
```

**After (V2)**:
```javascript
const response = await fetch('/api/v2/lifecycle/dashboard?userId=dev-user-123');
```

---

## Migration Mapping

### Client Dashboard

**V1 Endpoint**: `GET /api/v1/client/dashboard`  
**V2 Endpoint**: `GET /api/v2/lifecycle/dashboard?userId={userId}`

**Response Changes**:

<details>
<summary>Click to expand comparison</summary>

**V1 Response** (old):
```json
{
  "services": [...],
  "documents": [...],
  "tasks": [...]
}
```

**V2 Response** (new):
```json
{
  "company": {
    "stage": "growth",
    "age": "2 years, 7 months",
    "transition": {
      "nextStage": "scaling",
      "readiness": 65
    }
  },
  "compliance": {
    "status": "GREEN",
    "daysSafe": 14,
    "checkpoints": {
      "completed": 8,
      "total": 10
    }
  },
  "fundingReadiness": {
    "score": 40,
    "breakdown": {
      "compliance": 100,
      "documentation": 0,
      "governance": 0
    }
  },
  "quickActions": [
    {
      "id": "upload_audited_financials",
      "title": "Upload Audited Financials",
      "urgency": "high",
      "impact": 30
    }
  ]
}
```

**New Features in V2**:
- ✨ 8-stage lifecycle tracking
- ✨ Funding readiness score
- ✨ Smart quick actions
- ✨ Stage transition roadmap

</details>

---

### Compliance View

**V1 Endpoint**: `GET /api/v1/client/compliance-calendar`  
**V2 Endpoint**: `GET /api/v2/lifecycle/compliance-detail?userId={userId}`

**Key Improvements**:
- Risk-based scoring (0-100)
- Gap analysis with priorities
- Real-time checkpoint tracking
- Regulatory calendar integration

<details>
<summary>Response comparison</summary>

**V1 Response**:
```json
{
  "upcoming": [...],
  "overdue": [...]
}
```

**V2 Response**:
```json
{
  "summary": {
    "overallStatus": "GREEN",
    "riskScore": 15,
    "totalCheckpoints": 2,
    "completedCheckpoints": 2
  },
  "checkpoints": [
    {
      "id": "inc_tax_current",
      "name": "Income Tax Filings Current",
      "status": "green",
      "lastChecked": "2026-01-20T00:00:00.000Z"
    }
  ],
  "gaps": [
    {
      "id": 1,
      "area": "gst_compliance",
      "severity": "medium",
      "priority": 2
    }
  ],
  "actions": [
    {
      "id": 1,
      "type": "file_return",
      "title": "File GST Returns",
      "deadline": "2026-02-20"
    }
  ]
}
```

</details>

---

### Documents

**V1 Endpoint**: `GET /api/v1/client/documents`  
**V2 Endpoint**: `GET /api/v2/lifecycle/documents-detail?userId={userId}`

**Key Improvements**:
- 7 document categories (identity, tax, financial, legal, operational, statutory, registration)
- Critical documents by lifecycle stage
- Expiry tracking fixed
- Smart upload instructions

<details>
<summary>Response comparison</summary>

**V2 Response**:
```json
{
  "summary": {
    "totalRequired": 6,
    "uploaded": 0,
    "verified": 0,
    "expiringSoon": 0,
    "rejected": 0
  },
  "byCategory": [
    {
      "category": "identity",
      "count": 0,
      "verified": 0,
      "documents": []
    }
  ],
  "criticalDocuments": [
    {
      "documentKey": "audited_financials",
      "status": "missing",
      "uploaded": false,
      "verified": false
    }
  ],
  "expiringDocuments": [],
  "missingCritical": [
    {
      "documentKey": "audited_financials",
      "importance": "Required for compliance and funding readiness"
    }
  ]
}
```

</details>

---

### Services

**V1 Endpoint**: `GET /api/v1/client/services`  
**V2 Endpoint**: `GET /api/v2/lifecycle/services-detail?userId={userId}`

**Key Improvements**:
- 96-service catalog (vs ~20 in V1)
- Lifecycle-aware recommendations
- SLA tracking
- Subscription management

---

### NEW: Funding Readiness

**V2 Endpoint**: `GET /api/v2/lifecycle/funding-detail?userId={userId}` (NEW)

**Features**:
- Funding readiness score (0-100)
- Score breakdown (compliance, documentation, governance)
- Missing criteria
- Round history tracking

**Response**:
```json
{
  "overallScore": 40,
  "scoreBreakdown": {
    "compliance": 100,
    "documentation": 0,
    "governance": 0
  },
  "missingCriteria": [
    {
      "category": "documentation",
      "items": ["audited_financials", "board_resolutions"],
      "impact": 30
    }
  ],
  "fundingRounds": []
}
```

---

### NEW: Timeline

**V2 Endpoint**: `GET /api/v2/lifecycle/timeline?userId={userId}` (NEW)

**Features**:
- 8-stage lifecycle visualization
- Milestones achieved
- Next stage requirements
- Historical transitions

---

## Breaking Changes

### 1. Authentication

**V1**: Session-based auth  
**V2**: Same (no change)

### 2. Response Format

V2 includes deprecation metadata in V1 responses:

```json
{
  "data": {...},
  "_deprecation": {
    "deprecated": true,
    "sunsetDate": "2026-06-01",
    "replacement": "/api/v2/lifecycle/dashboard"
  }
}
```

### 3. Query Parameters

V2 requires explicit `userId`:

```javascript
// V1 - userId from session
GET /api/v1/client/dashboard

// V2 - userId required (or from auth token)
GET /api/v2/lifecycle/dashboard?userId=dev-user-123
```

---

## Migration Checklist

### Week 1-2: Assessment
- [ ] Audit all API calls in your codebase
- [ ] Identify which V1 endpoints you're using
- [ ] Review V2 documentation
- [ ] Set up development environment with V2

### Week 3-4: Development
- [ ] Update API client library
- [ ] Migrate Dashboard page
- [ ] Migrate Compliance page
- [ ] Migrate Documents page
- [ ] Update error handling

### Week 5-6: Testing
- [ ] Unit tests for V2 integrations
- [ ] Integration tests
- [ ] Performance testing
- [ ] User acceptance testing

### Week 7: Deployment
- [ ] Deploy to staging
- [ ] Monitor deprecation warnings
- [ ] Deploy to production
- [ ] Monitor error rates

### Week 8+: Cleanup
- [ ] Remove V1 code
- [ ] Update documentation
- [ ] Archive V1 credentials

---

## Code Examples

### React/TypeScript

```typescript
// V1 (old)
const Dashboard = () => {
  const { data } = useSWR('/api/v1/client/dashboard');
  return <div>{data?.services?.length} services</div>;
};

// V2 (new)
const LifecycleDashboard = () => {
  const userId = useAuth().user.id;
  const { data } = useSWR(`/api/v2/lifecycle/dashboard?userId=${userId}`);
  
  return (
    <div>
      <StageIndicator stage={data?.company?.stage} />
      <ComplianceStatus status={data?.compliance?.status} />
      <FundingScore score={data?.fundingReadiness?.score} />
    </div>
  );
};
```

### Node.js/JavaScript

```javascript
// V1 (old)
const response = await axios.get('/api/v1/client/dashboard');

// V2 (new)
const response = await axios.get('/api/v2/lifecycle/dashboard', {
  params: { userId: 'dev-user-123' }
});

// Check for deprecation warnings
if (response.headers['x-api-deprecated']) {
  console.warn('API Deprecated:', {
    replacement: response.headers['x-api-replacement'],
    sunsetDate: response.headers['x-sunset-date']
  });
}
```

### Python

```python
# V1 (old)
response = requests.get('https://api.digicomply.io/api/v1/client/dashboard')

# V2 (new)
response = requests.get(
    'https://api.digicomply.io/api/v2/lifecycle/dashboard',
    params={'userId': 'dev-user-123'}
)

# Check deprecation
if response.headers.get('X-API-Deprecated'):
    warnings.warn(f"Migrate to: {response.headers.get('X-API-Replacement')}")
```

---

## Support

### Documentation
- **V2 API Docs**: https://docs.digicomply.io/api/v2
- **Migration Guide**: https://docs.digicomply.io/migration/v1-to-v2

### Help
- **Email**: engineering@digicomply.io
- **Slack**: #api-migration
- **Office Hours**: Tuesdays 2-4 PM IST

### Monitoring
- **Deprecation Dashboard**: https://admin.digicomply.io/deprecation-stats
- **API Status**: https://status.digicomply.io

---

## FAQ

### Q: What happens after June 1, 2026?
**A**: V1 endpoints will return `410 Gone` status with migration instructions.

### Q: Can I use both V1 and V2 during migration?
**A**: Yes! Both versions will coexist until the sunset date.

### Q: Will my V1 authentication tokens work with V2?
**A**: Yes, authentication is backward compatible.

### Q: Are there any rate limit changes?
**A**: No, rate limits remain the same.

### Q: What if I need more time to migrate?
**A**: Contact us at engineering@digicomply.io for extension requests.

---

*Last Updated: 2026-01-22*  
*Version: 1.0*
