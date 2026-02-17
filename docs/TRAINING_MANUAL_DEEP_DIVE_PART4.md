# DigiComply Platform - Deep Dive Training Manual
## Part 4: API Reference & Database Schema

---

## 1. API Overview

### 1.1 Base URLs

| Environment | URL |
|-------------|-----|
| Development | `http://localhost:5000` |
| Production | `https://api.digicomply.in` |

### 1.2 Authentication

**Bearer Token (JWT)**
```
Authorization: Bearer <access_token>
```

**Session Cookie**
```
Cookie: session=<session_id>
```

### 1.3 Standard Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

---

## 2. Authentication API (`/api/v1/auth`)

### 2.1 Register

**POST** `/api/v1/auth/register`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+919876543210"
}
```

**Response:**
```json
{
  "success": true,
  "userId": 123,
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

---

### 2.2 Login

**POST** `/api/v1/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 123,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "roles": ["client"]
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

---

### 2.3 Send OTP

**POST** `/api/v1/auth/send-otp`

**Request:**
```json
{
  "phone": "+919876543210"
}
```
OR
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "expiresAt": "2026-02-18T10:15:00Z"
}
```

---

### 2.4 Verify OTP

**POST** `/api/v1/auth/verify-otp`

**Request:**
```json
{
  "phone": "+919876543210",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true
}
```

**Limits:**
- OTP valid for 10 minutes
- Maximum 5 attempts
- Rate limited: 3 requests/minute

---

### 2.5 Refresh Token

**POST** `/api/v1/auth/refresh`

**Headers:**
```
Authorization: Bearer <refresh_token>
```

**Response:**
```json
{
  "success": true,
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

---

### 2.6 Get Current User

**GET** `/api/v1/auth/me`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+919876543210",
    "isActive": true,
    "emailVerified": true,
    "roles": ["client"]
  }
}
```

---

## 3. Client API (`/api/v1/client`)

### 3.1 Get Dashboard

**GET** `/api/v1/client/dashboard`

**Response:**
```json
{
  "success": true,
  "data": {
    "client": {
      "id": 1,
      "name": "ABC Pvt Ltd",
      "entityType": "pvt_ltd"
    },
    "stats": {
      "activeServices": 3,
      "pendingTasks": 2,
      "documentsUploaded": 15,
      "complianceScore": 85
    },
    "recentInvoices": [...]
  }
}
```

---

### 3.2 Get Services

**GET** `/api/v1/client/services`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "requestId": "SR-2024-001",
      "serviceName": "GST Registration",
      "status": "in_progress",
      "progress": 60,
      "createdAt": "2026-02-10T10:00:00Z",
      "dueDate": "2026-02-20T10:00:00Z"
    }
  ]
}
```

---

### 3.3 Get Service Catalog

**GET** `/api/v1/client/catalog`

**Query Parameters:**
| Param | Type | Default |
|-------|------|---------|
| category | string | all |
| search | string | - |
| page | number | 1 |
| limit | number | 12 |

**Response:**
```json
{
  "success": true,
  "data": {
    "services": [
      {
        "id": 1,
        "name": "GST Registration",
        "category": "compliance",
        "description": "...",
        "basePrice": 4999,
        "timeline": "5-7 days",
        "features": ["Feature 1", "Feature 2"],
        "documents": ["PAN", "Aadhaar"]
      }
    ],
    "pagination": {
      "total": 45,
      "page": 1,
      "limit": 12,
      "pages": 4
    }
  }
}
```

---

### 3.4 Upload Document

**POST** `/api/v1/client/documents`

**Request:**
```json
{
  "documentType": "pan_card",
  "documentName": "PAN_Card.pdf",
  "filePath": "/uploads/user_1/pan_card.pdf",
  "fileSize": 245000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "documentType": "pan_card",
    "documentName": "PAN_Card.pdf",
    "status": "uploaded",
    "uploadedAt": "2026-02-18T10:00:00Z"
  }
}
```

---

### 3.5 Get Compliance Calendar

**GET** `/api/v1/client/compliance-calendar`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "GSTR-1 Filing",
      "dueDate": "2026-02-11",
      "status": "overdue",
      "priority": "critical",
      "complianceType": "GST",
      "entity": "ABC Pvt Ltd",
      "penalty": 50000
    }
  ]
}
```

---

## 4. Operations API (`/api/v1/operations`)

### 4.1 Get Tasks

**GET** `/api/v1/operations/tasks`

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| status | string | pending, in_progress, completed |
| priority | string | urgent, high, medium, low |
| page | number | Page number |
| limit | number | Items per page |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "requestId": "SR-2024-001",
      "title": "GST Registration",
      "clientName": "ABC Pvt Ltd",
      "status": "in_progress",
      "priority": "high",
      "dueDate": "2026-02-20",
      "assignedTo": "John Doe"
    }
  ]
}
```

---

### 4.2 Create Task

**POST** `/api/v1/operations/tasks`

**Request:**
```json
{
  "title": "Document Verification",
  "description": "Verify client KYC documents",
  "clientId": 1,
  "assignedTo": 5,
  "priority": "high",
  "dueDate": "2026-02-20"
}
```

---

### 4.3 Update Task

**PATCH** `/api/v1/operations/tasks/:id`

**Request:**
```json
{
  "status": "in_progress",
  "priority": "urgent",
  "notes": "Client provided updated documents"
}
```

---

### 4.4 Reassign Task

**PATCH** `/api/v1/operations/tasks/:id/reassign`

**Request:**
```json
{
  "newAssigneeId": 15,
  "newAssigneeName": "Jane Smith",
  "reason": "Workload balancing",
  "notifyPreviousAssignee": true
}
```

---

### 4.5 Escalate Task

**POST** `/api/v1/operations/tasks/:id/escalate`

**Request:**
```json
{
  "reason": "Client unresponsive",
  "blockerType": "client_unresponsive",
  "urgency": "high"
}
```

---

### 4.6 Get Team Members

**GET** `/api/v1/operations/team-members`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "full_name": "John Doe",
      "email": "john@company.com",
      "active_tasks": 12,
      "utilization": 85,
      "availabilityScore": 0.15
    }
  ]
}
```

---

## 5. HR API (`/api/hr`)

### 5.1 Get Employees

**GET** `/api/hr/employees`

**Query Parameters:**
| Param | Type |
|-------|------|
| department | string |
| status | string |
| search | string |
| page | number |
| limit | number |

---

### 5.2 Get Leave Requests

**GET** `/api/hr/leave/requests`

**Query Parameters:**
| Param | Type |
|-------|------|
| status | string |
| type | string |
| startDate | date |
| endDate | date |

---

### 5.3 Create Leave Request

**POST** `/api/hr/leave/requests`

**Request:**
```json
{
  "employeeId": 1,
  "leaveType": "casual",
  "startDate": "2026-02-20",
  "endDate": "2026-02-22",
  "reason": "Personal work",
  "isEmergency": false
}
```

---

### 5.4 Get HR Analytics

**GET** `/api/hr/analytics/comprehensive`

**Query Parameters:**
| Param | Type |
|-------|------|
| startDate | date |
| endDate | date |
| department | string |

**Response:**
```json
{
  "headcount": {
    "total": 50,
    "active": 48,
    "onLeave": 2
  },
  "attendance": {
    "presentToday": 45,
    "absentToday": 3
  },
  "leave": {
    "pendingRequests": 5,
    "approvedThisMonth": 12
  },
  "training": {
    "activePrograms": 3,
    "completedThisMonth": 8
  },
  "performance": {
    "averageScore": 4.2,
    "reviewsDue": 5
  }
}
```

---

## 6. Government Filing API (`/api/government`)

### 6.1 File GSTR-1

**POST** `/api/government/gst/gstr1`

**Request:**
```json
{
  "clientId": 1,
  "entityId": 5,
  "period": "02-2026",
  "data": {
    "outwardSupplies": [...],
    "b2bInvoices": [...],
    "b2cInvoices": [...]
  },
  "credentials": {
    "username": "gst_user",
    "password": "encrypted_pass"
  }
}
```

---

### 6.2 File ITR

**POST** `/api/government/itr/file`

**Request:**
```json
{
  "clientId": 1,
  "itrType": "ITR-3",
  "assessmentYear": "2026-27",
  "data": {
    "income": {...},
    "deductions": {...},
    "taxPayable": {...}
  }
}
```

---

### 6.3 Get Filing History

**GET** `/api/government/history/:clientId`

**Query Parameters:**
| Param | Type |
|-------|------|
| entityId | number |
| portalType | string |
| filingType | string |
| status | string |
| limit | number |

---

## 7. Payment API (`/api/v1/payments`)

### 7.1 Create Order

**POST** `/api/v1/payments/create-order`

**Request:**
```json
{
  "amount": 1306882,
  "currency": "INR",
  "receipt": "order_123456",
  "notes": {
    "serviceId": 1,
    "entityId": 5
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "order_xyz123",
    "amount": 1306882,
    "currency": "INR"
  }
}
```

---

### 7.2 Verify Payment

**POST** `/api/v1/payments/verify`

**Request:**
```json
{
  "razorpay_order_id": "order_xyz123",
  "razorpay_payment_id": "pay_abc456",
  "razorpay_signature": "signature_hash"
}
```

---

## 8. Database Schema

### 8.1 Users Table

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  phone VARCHAR(20) UNIQUE,
  role VARCHAR(50) NOT NULL DEFAULT 'client',
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 8.2 Business Entities Table

```sql
CREATE TABLE business_entities (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  pan VARCHAR(10) NOT NULL,
  gstin VARCHAR(15),
  cin VARCHAR(21),
  llpin VARCHAR(8),
  industry VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  pincode VARCHAR(6),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 8.3 Service Requests Table

```sql
CREATE TABLE service_requests (
  id SERIAL PRIMARY KEY,
  request_id VARCHAR(20) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id),
  business_entity_id INTEGER REFERENCES business_entities(id),
  service_id INTEGER NOT NULL,
  service_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'created',
  priority VARCHAR(20) DEFAULT 'medium',
  progress INTEGER DEFAULT 0,
  assigned_to INTEGER REFERENCES users(id),
  amount INTEGER,
  payment_status VARCHAR(20),
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 8.4 Compliance States Table

```sql
CREATE TABLE compliance_states (
  id SERIAL PRIMARY KEY,
  entity_id INTEGER REFERENCES business_entities(id),
  overall_state VARCHAR(10) DEFAULT 'GREEN',
  days_safe INTEGER DEFAULT 0,
  next_critical_deadline TIMESTAMP,
  penalty_exposure INTEGER DEFAULT 0,
  last_calculated TIMESTAMP DEFAULT NOW(),
  calculation_details JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 8.5 Documents Table

```sql
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  business_entity_id INTEGER REFERENCES business_entities(id),
  service_request_id INTEGER REFERENCES service_requests(id),
  document_type VARCHAR(50) NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  status VARCHAR(20) DEFAULT 'uploaded',
  verified_by INTEGER REFERENCES users(id),
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 8.6 Tasks Table

```sql
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  service_request_id INTEGER REFERENCES service_requests(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  priority VARCHAR(20) DEFAULT 'medium',
  assigned_to INTEGER REFERENCES users(id),
  created_by INTEGER REFERENCES users(id),
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 8.7 Payments Table

```sql
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  service_request_id INTEGER REFERENCES service_requests(id),
  razorpay_order_id VARCHAR(50),
  razorpay_payment_id VARCHAR(50),
  amount INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  status VARCHAR(20) DEFAULT 'pending',
  payment_method VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 8.8 Commissions Table

```sql
CREATE TABLE commissions (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER REFERENCES users(id),
  service_request_id INTEGER REFERENCES service_requests(id),
  amount INTEGER NOT NULL,
  percentage DECIMAL(5,2),
  status VARCHAR(20) DEFAULT 'pending',
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 8.9 Audit Logs Table

```sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  old_value JSONB,
  new_value JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 8.10 Leave Requests Table

```sql
CREATE TABLE leave_requests (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES users(id),
  leave_type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  is_emergency BOOLEAN DEFAULT FALSE,
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 9. Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────┐
│     users       │     │business_entities│
├─────────────────┤     ├─────────────────┤
│ id (PK)         │──┐  │ id (PK)         │
│ email           │  │  │ owner_id (FK)───┼──┐
│ role            │  │  │ name            │  │
│ ...             │  │  │ pan, gstin, cin │  │
└─────────────────┘  │  │ ...             │  │
         │           │  └─────────────────┘  │
         │           │           │           │
         │           │           │           │
         ▼           │           ▼           │
┌─────────────────┐  │  ┌─────────────────┐  │
│service_requests │  │  │compliance_states│  │
├─────────────────┤  │  ├─────────────────┤  │
│ id (PK)         │  │  │ id (PK)         │  │
│ user_id (FK)────┼──┘  │ entity_id (FK)──┼──┘
│ entity_id (FK)──┼─────│ overall_state   │
│ status          │     │ days_safe       │
│ ...             │     │ ...             │
└─────────────────┘     └─────────────────┘
         │
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│     tasks       │     │    documents    │
├─────────────────┤     ├─────────────────┤
│ id (PK)         │     │ id (PK)         │
│ request_id (FK) │     │ request_id (FK) │
│ assigned_to(FK) │     │ user_id (FK)    │
│ status          │     │ document_type   │
│ ...             │     │ ...             │
└─────────────────┘     └─────────────────┘
         │
         │
         ▼
┌─────────────────┐
│    payments     │
├─────────────────┤
│ id (PK)         │
│ request_id (FK) │
│ user_id (FK)    │
│ amount          │
│ status          │
│ ...             │
└─────────────────┘
```

---

## 10. Indexes & Performance

### 10.1 Critical Indexes

```sql
-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);

-- Service Requests
CREATE INDEX idx_requests_user ON service_requests(user_id);
CREATE INDEX idx_requests_status ON service_requests(status);
CREATE INDEX idx_requests_entity ON service_requests(business_entity_id);
CREATE INDEX idx_requests_created ON service_requests(created_at);

-- Compliance States
CREATE INDEX idx_compliance_entity ON compliance_states(entity_id);
CREATE INDEX idx_compliance_state ON compliance_states(overall_state);
CREATE INDEX idx_compliance_deadline ON compliance_states(next_critical_deadline);

-- Tasks
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due ON tasks(due_date);

-- Audit Logs
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
```

---

*End of Deep Dive Training Manual*
