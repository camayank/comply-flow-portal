# DigiComply Deployment Instructions

## Prerequisites
- Node.js v24+
- PostgreSQL database
- Environment variables configured

## Environment Variables Required
```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Or individual DB vars
DB_HOST=localhost
DB_PORT=5432
DB_NAME=complyflow_dev
DB_USER=your_user
DB_PASSWORD=your_password

# Optional (for production)
NODE_ENV=production
EMAIL_HOST=smtp.example.com
EMAIL_USER=your_email
EMAIL_PASS=your_password
```

## Installation & Build
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Run database migrations (if needed)
npm run db:migrate
```

## Running the Application
```bash
# Development
npm run dev

# Production
NODE_ENV=production node dist/index.js
```

Server runs on **port 5000**

## Test Users
| Role | Username | Password |
|------|----------|----------|
| Admin | `admin_test` | `Test@123` |
| Ops Executive | `ops_exec_test` | `Test@123` |
| Ops Manager | `ops_mgr_test` | `Test@123` |
| Sales Manager | `sales_mgr_test` | `Test@123` |

## Security Notes
- All API endpoints require authentication (except `/health` and public routes)
- CSRF protection enabled - requests need `X-Requested-With: XMLHttpRequest` header
- Rate limiting: 10 auth attempts per 15 minutes
- 126 RBAC tests verify role-based access

## Health Check
```bash
curl http://localhost:5000/health
# Returns: {"status":"ok","timestamp":"...","uptime":...}
```

## Verify Deployment
```bash
# Should return 401 (authentication required)
curl http://localhost:5000/api/admin/services -H "X-Requested-With: XMLHttpRequest"
```
