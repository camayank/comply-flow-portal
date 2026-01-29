# Robust Backend Architecture - US Compliance Best Practices

## Overview

This backend implementation follows best practices from leading US compliance and document management companies:

- **Vanta**: Real-time compliance state calculation with risk-based scoring
- **Drata**: Prioritized action recommendations and automated task management
- **Stripe**: Clean API design with comprehensive audit trails
- **Secureframe**: Document management with integrity checks and encryption

## Architecture

### Database Schema

#### Core Tables

**1. `clients`** - Business entities
- Stores complete business information (GSTIN, PAN, incorporation date)
- Unique constraints on GSTIN and PAN
- Support for multiple business types (pvt_ltd, llp, partnership, proprietorship)

**2. `client_compliance_state`** - Real-time compliance status
- Overall state calculation (GREEN/AMBER/RED)
- Days until critical deadline
- Total penalty exposure
- Compliant vs pending vs overdue items count
- Cached calculation results with metadata

**3. `compliance_actions`** - Tasks/todos for compliance
- Action types: upload, review, pay, confirm
- Priority-based sorting (critical > high > medium > low)
- Penalty amounts and time estimates
- Benefits and step-by-step instructions
- Status tracking with completion timestamps

**4. `client_documents`** - Document vault
- Secure file storage with checksums (SHA-256)
- Verification status workflow (pending → verified/rejected)
- Document expiry tracking
- File integrity verification
- Support for multiple storage providers (local, S3, GCS)

**5. `client_activities`** - Audit trail
- Complete activity log for every action
- Actor tracking (user, system, admin)
- IP address and user agent logging
- Metadata storage for detailed context
- Indexed by client_id and timestamp

### Services Layer

#### 1. Compliance Engine (`compliance-engine.ts`)

**Real-time Compliance Calculation**
```typescript
calculateComplianceState(clientId: number): Promise<ComplianceState>
```
- Analyzes all pending and overdue actions
- Calculates risk-based state (GREEN/AMBER/RED)
- Determines days until next critical deadline
- Aggregates total penalty exposure
- Caches results in `client_compliance_state` table

**Risk-Based Algorithm**:
- **RED**: Any overdue items (immediate action required)
- **AMBER**: < 7 days to deadline OR > 2 pending items (warning state)
- **GREEN**: All good, no immediate concerns

**Prioritized Action Recommendations**
```typescript
getNextPrioritizedAction(clientId: number): Promise<ComplianceAction | null>
```
- Uses priority + deadline sorting algorithm
- Returns most urgent action first
- Includes benefits and step-by-step instructions

**Activity Tracking**
```typescript
logActivity(clientId, activityType, description, actorId, metadata)
```
- Stripe-style audit trail
- Records all user and system actions
- Supports metadata for detailed context

#### 2. Document Service (`document-service.ts`)

**Secure Document Storage**
```typescript
storeDocument(doc: DocumentMetadata): Promise<number>
```
- Calculates SHA-256 checksum for integrity
- Stores metadata in database
- Returns document ID

**Document Integrity Verification**
```typescript
verifyDocumentIntegrity(documentId: number): Promise<boolean>
```
- Recalculates checksum and compares with stored value
- Detects file tampering or corruption

**Expiry Tracking**
```typescript
getExpiringDocuments(clientId, daysThreshold): Promise<Document[]>
```
- Identifies documents expiring soon
- Enables proactive renewal reminders

### API Endpoints

#### V2 Client API (`/api/v2/client/*`)

**GET /status**
- Single aggregated endpoint for entire dashboard
- Returns compliance state, next action, recent activities
- Falls back to mock data if database not configured
- Used by: ClientPortalV2.tsx main dashboard

**POST /actions/complete**
- Complete an action with optional file uploads
- Supports up to 10 files (10MB each)
- Calculates checksums for integrity
- Logs activity and recalculates compliance state
- File types: PDF, Excel, Word, Images

**GET /actions/history**
- Stripe-style activity timeline
- Returns up to 50 most recent activities
- Includes actor info and metadata

**GET /actions/pending**
- All pending actions sorted by priority
- Drata-style prioritization algorithm
- Includes benefits and instructions for each action

**GET /documents**
- Complete document vault listing
- Shows verification status and expiry dates
- Secureframe-style document tracking

**GET /deadlines**
- Upcoming deadlines with risk assessment
- Calculates days until due date
- Risk levels: high (< 7 days), medium (< 30 days), low (> 30 days)

## Running Migrations

### Setup Database

1. **Configure database connection** in `.env`:
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/complyflow
```

2. **Run migrations**:
```bash
npm run migrate
```

This will:
- Create all tables with proper indexes
- Set up foreign key constraints
- Create triggers for auto-updating timestamps
- Seed demo client data for development

### Migration Files

- `001_create_client_tables.sql` - Core schema (5 tables + indexes)
- `002_seed_demo_client.sql` - Demo data for development

## Data Flow

### Status Calculation Flow

```
User requests /api/v2/client/status
  ↓
Get client record from database
  ↓
Calculate real-time compliance state
  - Query all actions (pending/overdue/completed)
  - Calculate days until next deadline
  - Sum penalty exposure
  - Determine GREEN/AMBER/RED state
  ↓
Get next prioritized action
  - Priority-based sorting
  - Return action with benefits + instructions
  ↓
Get recent activities (last 10)
  ↓
Return formatted JSON to frontend
```

### Document Upload Flow

```
User uploads document via /actions/complete
  ↓
Multer processes file (validates type, size)
  ↓
Store file on disk with unique filename
  ↓
Calculate SHA-256 checksum
  ↓
Store document metadata in database
  ↓
Update action status to 'completed'
  ↓
Log activity with metadata
  ↓
Recalculate compliance state
  ↓
Return success response
```

## Best Practices Implemented

### 1. Vanta-Style Compliance Calculation
- Real-time state calculation
- Risk-based scoring (not just pass/fail)
- Automatic recalculation on any action
- Cached results for performance

### 2. Drata-Style Task Prioritization
- Multi-factor sorting (priority + deadline)
- Time estimates for planning
- Benefit messaging for motivation
- Social proof for engagement

### 3. Stripe-Style API Design
- RESTful endpoints
- Comprehensive error handling
- Detailed activity logging
- Clean JSON responses

### 4. Secureframe-Style Document Management
- File integrity verification (checksums)
- Verification workflow (pending → verified/rejected)
- Expiry tracking
- Multiple storage provider support

## Development vs Production

### Development Mode
- Falls back to mock data if database not configured
- Uses `dev-user-123` as default user ID
- Returns realistic test data for UI development
- No authentication required

### Production Mode
- Requires database connection
- Uses real user IDs from auth tokens
- Enforces authentication and authorization
- Full audit trail with IP addresses

## Performance Optimizations

1. **Indexed Queries**
   - All foreign keys indexed
   - Timestamp columns indexed for activity queries
   - Status columns indexed for filtering

2. **Calculated State Caching**
   - Compliance state cached in dedicated table
   - Only recalculated when actions change
   - Includes calculation metadata and timestamp

3. **Efficient Activity Queries**
   - Limited to recent items only
   - Indexed by client_id and created_at DESC
   - Supports pagination

## Security Features

1. **File Upload Security**
   - Type validation (whitelist only)
   - Size limits (10MB per file)
   - Unique filenames to prevent collisions
   - SHA-256 checksums for integrity

2. **Audit Trail**
   - Every action logged with actor ID
   - IP address and user agent tracking
   - Immutable activity records

3. **Data Integrity**
   - Foreign key constraints
   - Unique constraints on business identifiers
   - Triggers for automatic timestamp updates

## Extending the System

### Adding New Action Types

1. Insert into `compliance_actions` table with new `action_type`
2. Add handler in API endpoint if special logic needed
3. Update frontend to display new action type

### Adding New Document Types

1. Add to `document_type` enum (application level)
2. Update file upload validation if needed
3. Add document-specific verification logic

### Adding New Compliance Rules

1. Create rules in compliance engine
2. Update `calculateComplianceState()` algorithm
3. Test with various scenarios

## Testing

### Test with Demo Client

```bash
# Get status
curl http://localhost:5000/api/v2/client/status | jq .

# Get pending actions
curl http://localhost:5000/api/v2/client/actions/pending | jq .

# Get activities
curl http://localhost:5000/api/v2/client/actions/history | jq .

# Get documents
curl http://localhost:5000/api/v2/client/documents | jq .

# Get deadlines
curl http://localhost:5000/api/v2/client/deadlines | jq .
```

## Monitoring and Observability

Future enhancements:
- [ ] Prometheus metrics for API performance
- [ ] CloudWatch/Datadog integration
- [ ] Error tracking with Sentry
- [ ] Performance monitoring with New Relic
- [ ] Database query performance tracking

## Compliance Standards

This implementation supports:
- ✅ GST compliance tracking
- ✅ TDS/TCS tracking
- ✅ Income Tax filing deadlines
- ✅ Professional tax management
- ✅ ROC filing deadlines
- ✅ Custom compliance rules

Can be extended for:
- SOC 2 compliance (Vanta-style)
- ISO 27001 compliance
- GDPR compliance
- HIPAA compliance

## License

Proprietary - DigiComply
