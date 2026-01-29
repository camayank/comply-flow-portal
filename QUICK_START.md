# Quick Start Guide - Upgraded Platform

## For Developers

### Start Server
```bash
cd /Users/rakeshanita/DigiComply/comply-flow-portal
npm run dev
```

Server runs on: **http://localhost:5000**

### Test V2 APIs
```bash
# Dashboard
curl "http://localhost:5000/api/v2/lifecycle/dashboard?userId=dev-user-123" | jq

# Compliance
curl "http://localhost:5000/api/v2/lifecycle/compliance-detail?userId=dev-user-123" | jq

# Health Check
curl "http://localhost:5000/health" | jq
```

### Check Deprecation
```bash
curl -I "http://localhost:5000/api/v1/client/dashboard?userId=dev-user-123" | grep "X-API"
```

---

## Key Files

### Backend
- `server/robustness-middleware.ts` - Error handling, validation, monitoring
- `server/deprecation-middleware.ts` - V1 deprecation tracking
- `server/routes/lifecycle-api.ts` - 6 V2 endpoints
- `server/services/v2/` - Business logic (5 services)

### Frontend
- `client/src/services/lifecycleService.ts` - V2 API client
- `client/src/pages/LifecycleDashboard.tsx` - Main dashboard UI

### Documentation
- `UPGRADED_PLATFORM_READY.md` - Full summary
- `MIGRATION_GUIDE.md` - V1 → V2 migration
- `DEPRECATION_PLAN.md` - 6-week plan

---

## Architecture

### V2 APIs (Production Ready)
1. `/api/v2/lifecycle/dashboard` - Executive overview
2. `/api/v2/lifecycle/compliance-detail` - Compliance deep dive
3. `/api/v2/lifecycle/services-detail` - 96-service catalog
4. `/api/v2/lifecycle/documents-detail` - Document vault
5. `/api/v2/lifecycle/funding-detail` - Funding readiness
6. `/api/v2/lifecycle/timeline` - Growth journey

### Database (17 Tables)
- 5 compliance tables
- 7 document management tables
- 5 lifecycle tables (including new ones)

### Services Layer
1. ClientService - User & company management
2. ComplianceService - State engine & risk scoring
3. ServiceCatalogService - 96 services
4. DocumentManagementService - 7 categories
5. BusinessLifecycleService - 8 stages

---

## Quick Commands

### Development
```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Run with logs
npm run dev 2>&1 | tee server.log

# Kill server
pkill -9 -f "tsx.*server/index.ts"
```

### Database
```bash
# Connect to DB
psql -d complyflow_dev

# Check tables
\dt

# Query example
SELECT * FROM clients LIMIT 5;
```

### Testing
```bash
# Test all 6 endpoints
for endpoint in dashboard compliance-detail services-detail documents-detail funding-detail timeline; do
  echo "Testing $endpoint..."
  curl -s "http://localhost:5000/api/v2/lifecycle/$endpoint?userId=dev-user-123" | jq '.summary // .company.stage // .'
done
```

---

## Status

✅ **Backend**: Production-ready with US standards  
✅ **V2 APIs**: All 6 working  
✅ **UI/UX**: Carta-style dashboard created  
✅ **Monitoring**: Health checks + metrics  
✅ **Deprecation**: V1 marked for sunset  

**Ready for**: Production deployment, customer onboarding, investor demos

---

## Support

- **Documentation**: See `UPGRADED_PLATFORM_READY.md`
- **Migration**: See `MIGRATION_GUIDE.md`
- **Deprecation**: See `DEPRECATION_PLAN.md`

---

*Last Updated: 2026-01-22*
