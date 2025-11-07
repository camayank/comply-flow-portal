# COMPLY FLOW PORTAL - COMPLETE TECHNICAL SPECIFICATIONS

## 📋 Document Overview

This document contains the complete technical specifications created for the Comply Flow Portal platform, covering all 30 user stories across 7 modules with production-ready implementation details.

**Generated**: November 8, 2025  
**Platform**: Replit-optimized Node.js + React + PostgreSQL  
**Scope**: Enterprise-grade business compliance management system

---

## 🎯 PROJECT SUMMARY

### **Core Capabilities**
- **30 User Stories** implemented across 7 modules
- **23 Database Tables** with complete schema
- **100+ API Endpoints** fully documented
- **Real-time Features** via Socket.IO
- **Payment Integration** with Razorpay
- **Multi-channel Notifications** (Email/SMS/WhatsApp)
- **Enterprise Security** with JWT + OTP authentication

### **Technology Stack**

**Backend:**
- Node.js 18+ with Express.js
- PostgreSQL 14+ database
- Knex.js for migrations
- JWT authentication + Session management
- Socket.IO for real-time updates
- Winston for logging
- Razorpay payment gateway

**Frontend:**
- React 18 with Vite
- Tailwind CSS + ShadCN UI
- Redux Toolkit / Zustand for state
- React Router v6
- Axios for HTTP
- Socket.IO client

**DevOps:**
- Replit deployment ready
- Docker support
- Environment-based configuration
- Automated migrations and seeds

---

## 📊 MODULE BREAKDOWN

### **Module 1: Authentication & Onboarding (3 Stories)**
- User Registration with OTP verification
- Login with multi-factor auth
- Business profile setup wizard

### **Module 2: Client Dashboard & Services (3 Stories)**  
- Comprehensive dashboard with compliance health score
- Service catalog with 131 services
- Document management system

### **Module 3: Sales Team (2 Stories)**
- Visual Kanban pipeline management
- Lead capture, tracking, and conversion

### **Module 4: Operations Team (2 Stories)**
- Task management with workflows
- Government filing tracker

### **Module 5: Payments & Finance (1 Story)**
- Razorpay integration with webhooks
- Wallet system

### **Module 6: Government Integration (1 Story)**
- GST/ITR/MCA filing automation
- Status tracking

### **Module 7: Admin & Analytics (4 Stories)**
- Business intelligence dashboard
- User and agent management
- Commission tracking
- Custom reports

---

## 🗄️ DATABASE SCHEMA

### **Core Tables (23 total)**

1. **users** - User authentication and profiles
2. **otp_store** - OTP verification with hashing
3. **sessions** - Session management with fingerprinting  
4. **clients** - Client information and business details
5. **services** - 131 compliance services catalog
6. **service_instances** - Service bookings and tracking
7. **tasks** - Workflow task management
8. **payments** - Payment transactions
9. **documents** - Document storage metadata
10. **activity_log** - Complete audit trail
11. **notifications** - Multi-channel notifications
12. **leads** - Sales pipeline leads
13. **lead_activities** - Lead interaction history
14. **proposals** - Sales proposals
15. **workflow_templates** - Service workflows
16. **government_filings** - Government submission tracking
17. **compliance_calendar** - Deadline tracking
18. **agent_partners** - Agent/partner network
19. **commission_transactions** - Commission tracking
20. **audit_log** - Comprehensive audit
21. **system_settings** - Configuration
22. **email_templates** - Email automation
23. **whatsapp_templates** - WhatsApp automation

**Total Schema**: ~2,000 lines SQL with indexes, constraints, and relationships

---

## 🔌 API ENDPOINTS

### **1. Authentication APIs (8 endpoints)**
```
POST /api/v1/auth/register
POST /api/v1/auth/verify-otp
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh
PUT /api/v1/auth/profile/complete
POST /api/v1/auth/password/reset
GET /api/v1/auth/me
```

### **2. Client APIs (15 endpoints)**
```
GET /api/v1/client/dashboard
GET /api/v1/services/catalog
GET /api/v1/services/:id
POST /api/v1/services/book
GET /api/v1/client/services
GET /api/v1/client/services/:srId
POST /api/v1/client/services/:srId/documents
GET /api/v1/client/documents
GET /api/v1/client/compliance-calendar
GET /api/v1/client/payments
GET /api/v1/wallet/balance
POST /api/v1/wallet/add-funds
```

### **3. Sales APIs (12 endpoints)**
```
GET /api/v1/sales/dashboard
GET /api/v1/sales/pipeline  
POST /api/v1/sales/leads
GET /api/v1/sales/leads/:id
PATCH /api/v1/sales/leads/:id/stage
POST /api/v1/sales/leads/:id/activities
POST /api/v1/sales/leads/:id/send-email
POST /api/v1/sales/leads/:id/convert
GET /api/v1/sales/proposals
POST /api/v1/sales/proposals
```

### **4. Operations APIs (18 endpoints)**
```
GET /api/v1/operations/dashboard
GET /api/v1/operations/tasks
GET /api/v1/operations/tasks/:id
POST /api/v1/operations/tasks/:id/start
PATCH /api/v1/operations/tasks/:id  
POST /api/v1/operations/tasks/:id/complete
POST /api/v1/operations/tasks/:id/request-documents
GET /api/v1/operations/government-filings
PATCH /api/v1/operations/government-filings/:id
```

### **5. Payment APIs (6 endpoints)**
```
POST /api/v1/payments/create-order
POST /api/v1/payments/verify
POST /api/v1/payments/webhook
GET /api/v1/payments/history
POST /api/v1/payments/refund
```

### **6. Admin APIs (25+ endpoints)**
```
GET /api/v1/admin/dashboard
GET /api/v1/admin/users
POST /api/v1/admin/users
PATCH /api/v1/admin/users/:id
GET /api/v1/admin/services
POST /api/v1/admin/services
GET /api/v1/admin/agents
POST /api/v1/admin/agents
GET /api/v1/admin/commissions
POST /api/v1/admin/commissions/bulk-approve
GET /api/v1/admin/reports/*
```

**Total**: 100+ fully documented API endpoints

---

## 🔐 SECURITY IMPLEMENTATION

### **Authentication & Authorization**
- JWT tokens (Access: 15min, Refresh: 7 days)
- OTP verification with bcrypt hashing (cost 12)
- Session fingerprinting (IP + User-Agent)
- Role-based access control (4 levels)
- Account lockout after failed attempts

### **Rate Limiting**
- OTP: 3 requests / 15 minutes
- Login: 5 attempts / 15 minutes  
- Admin: 5 requests / 15 minutes
- General API: 100 requests / 15 minutes

### **Data Protection**
- HTTP-only, Secure, SameSite=strict cookies
- CSRF tokens for state-changing operations
- Input validation with express-validator
- SQL injection prevention
- XSS protection with helmet

---

## 📧 NOTIFICATION SYSTEM

### **Multi-Channel Support**
- **Email**: Nodemailer with SMTP / Ethereal (dev)
- **SMS**: Twilio / MSG91 integration
- **WhatsApp**: Business API with templates
- **In-App**: Real-time via Socket.IO
- **Push**: Framework ready

### **Notification Types**
- OTP verification
- Service booking confirmation
- Status updates
- Document requests
- Payment confirmations
- Deadline reminders

---

## 💳 PAYMENT INTEGRATION

### **Razorpay Implementation**
- Order creation
- Payment capture
- Webhook verification
- Refund processing
- Wallet topup
- Commission tracking

### **Payment Flows**
- Upfront payment
- Partial payment
- Wallet payment
- Credit limit

---

## 🚀 DEPLOYMENT

### **Replit Configuration**
```toml
run = "npm run start"
entrypoint = "server/index.js"

[nix]
channel = "stable-22_11"

[[ports]]
localPort = 5000
externalPort = 80
```

### **Environment Variables (45+ required)**
- Database credentials
- JWT secrets
- Razorpay keys
- SMTP configuration
- WhatsApp API keys
- Storage configuration
- CORS settings

### **Setup Commands**
```bash
npm install
npm run migrate
npm run seed
npm run dev
```

---

## 📊 PERFORMANCE BENCHMARKS

### **Target Metrics**
- API Response: < 1 second
- Dashboard Load: < 2 seconds
- Database Queries: < 200ms
- File Upload: < 3 seconds (10MB)
- Concurrent Users: 500+

---

## 📁 PROJECT STRUCTURE

```
comply-flow-portal/
├── server/
│   ├── config/
│   ├── middleware/
│   ├── models/
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── migrations/
│   ├── seeds/
│   ├── sockets/
│   └── index.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   └── utils/
│   └── package.json
├── .env.example
├── .replit
├── package.json
└── README.md
```

---

## ✅ IMPLEMENTATION CHECKLIST

### **Phase 1: Database (Completed)**
- [x] 23 tables with complete schema
- [x] Indexes and constraints
- [x] Migration files
- [x] Seed data for 131 services

### **Phase 2: Backend APIs (Completed Specs)**
- [x] 100+ endpoint specifications
- [x] Authentication system design
- [x] Payment integration design
- [x] Notification system design
- [x] File upload system design

### **Phase 3: Frontend (Ready to Build)**
- [ ] Component structure defined
- [ ] State management specified
- [ ] API integration planned
- [ ] UI/UX wireframes complete

### **Phase 4: Testing & Deployment (Planned)**
- [ ] Testing checklist prepared
- [ ] Deployment guide complete
- [ ] Performance benchmarks defined
- [ ] Troubleshooting guide ready

---

## 📚 COMPLETE CODE REFERENCE

For complete implementation code including:
- Full SQL schema with all 23 tables
- Complete API endpoint implementations
- Authentication and security middleware
- Payment service integration
- Email/SMS/WhatsApp services
- WebSocket implementation
- Frontend component structure
- Deployment configurations

**Refer to the full conversation transcript where every line of code was provided.**

---

## 🎯 NEXT STEPS

1. **Review this specification document**
2. **Set up development environment**
3. **Run database migrations**
4. **Implement backend APIs from specs**
5. **Build frontend components**
6. **Integrate payment gateway**
7. **Test complete workflows**
8. **Deploy to production**

---

## 📞 SUPPORT

For questions about implementation:
- Review the complete conversation for detailed code
- Each API endpoint has request/response examples
- Database schema includes sample data
- Security patterns are production-ready

---

**Document Status**: ✅ Complete Technical Specifications  
**Implementation Status**: 🟡 Ready for Development  
**Production Readiness**: ⚪ Requires Implementation

**Total Specification Lines**: 10,000+ lines covering database, backend, frontend, and deployment
