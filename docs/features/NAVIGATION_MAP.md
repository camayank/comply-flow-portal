# 🗺️ DigiComply Platform - Navigation & Page Flow

## 📍 Landing Page Structure (Root `/`)

### **Header Navigation**
```
DigiComply Logo → Home (/)
├── Products (scroll to #products)
├── Pricing (scroll to #pricing)  
├── How It Works (scroll to #how-it-works)
├── Login → /login
└── Start Free Trial → /register
```

### **Hero Section CTAs**
```
Main Hero
├── Try Free for 14 Days → /register
└── See AI Products → scroll to #products
```

---

## 🎯 Main Navigation Flow

### **1. User Journey: New Visitor**
```
Landing (/) 
  ↓
Register (/register, /signup, /client-registration)
  ↓
Login (/login, /signin)
  ↓
Client Portal (/portal, /client-portal)
```

### **2. User Journey: Explore Products**
```
Landing (/)
  ↓
AI Products Section (#products)
  ├── AutoComply → /autocomply
  ├── TaxTracker → /taxtracker
  └── DigiScore → /digiscore
```

### **3. User Journey: Access Portals**
```
Landing (/)
  ↓
Choose Portal:
  ├── Admin Portal → /admin, /admin-control
  ├── Client Portal → /portal, /client-portal
  ├── Operations → /operations, /ops
  └── Agent/Partner → /agent, /agents, /agent-portal
```

---

## 🏗️ Complete Page Hierarchy

### **🌐 PUBLIC PAGES**

#### Landing & Marketing
- `/` - Main Landing Page (MobileResponsiveLanding)
- `/landing` - Alternative Landing Page
- `/platform-showcase` - Platform Demo
- `/platform-demo` - Demo Page

#### Authentication & Registration
- `/login` or `/signin` - Login Page
- `/register` or `/signup` or `/client-registration` - Client Registration

---

### **🤖 AI PRODUCTS (3 Available + 7 Coming Soon)**

#### Available Now ✅
1. **AutoComply** - `/autocomply`, `/workflows`, `/automation`
   - AI-powered workflow automation
   - No-code compliance workflows
   
2. **TaxTracker** - `/taxtracker`, `/tax`, `/tax-management`
   - Tax deadline tracking (GST, TDS, ITR)
   - Automated calculations & alerts
   
3. **DigiScore** - `/digiscore`, `/compliance-score`, `/score`
   - Compliance health score (0-100)
   - Risk identification & recommendations

#### Coming Soon 🔜
- RegGPT
- NoticeAI
- FileTrace
- SOPGen
- AuditFlow
- ESGComply
- CaseDock

---

### **👤 CLIENT PORTAL**

**Routes**: `/portal`, `/client-portal`, `/mobile`

**Features Accessible**:
- Dashboard overview
- Service requests tracking
- Document vault
- Compliance calendar
- Payment history
- Referral dashboard

---

### **⚙️ ADMIN PORTAL**

**Routes**: `/admin`, `/admin-control`, `/universal-admin`

**7 Major Tabs**:
1. **Dashboard** - Analytics & metrics
2. **Services** - Service catalog management
3. **Workflows** - Workflow configuration
4. **Analytics** - Business intelligence
5. **Users** - User management (CRUD, roles, permissions)
6. **Config** - System configuration
7. **Roles** - Role-based access control

**Sub-Features**:
- `/admin-config` - Service configuration
- `/admin-service-config` - Advanced service setup

---

### **🔧 OPERATIONS PORTAL**

**Routes**: `/operations`, `/ops`, `/universal-ops`

**Features**:
- Service order management
- Task assignment & tracking
- QC workflows
- Delivery management
- Team coordination

**Related Pages**:
- `/operations-manager`, `/ops-manager` - Operations Manager Dashboard
- `/qc`, `/qc-dashboard`, `/quality-control` - Quality Control
- `/quality-metrics`, `/qc-metrics` - QC Metrics
- `/delivery/:deliveryId` - Delivery Confirmation

---

### **🤝 AGENT/PARTNER PORTAL**

**Routes**: `/agent`, `/agents`, `/agent-portal`, `/partner`

**Features**:
- Lead management
- Commission tracking
- Referral system
- Territory management
- Performance metrics

---

### **📋 CORE FEATURES & TOOLS**

#### Service & Request Management
- `/services`, `/service-selection` - Service Catalog
- `/service-requests`, `/requests`, `/my-requests` - Service Requests
- `/service-flow-dashboard` - Service Flow Tracking

#### Lead & Proposal Management
- `/leads`, `/lead-management` - Lead Management
- `/proposals`, `/proposal-management` - Proposal Management
- `/pre-sales` - Pre-Sales Manager
- `/sales-proposals` - Sales Proposal Manager

#### Document Management
- `/documents` - Document Hub
- `/ai-documents` - AI Documents
- `/document-preparation` - Document Preparation
- `/doc-generator` - Document Generator
- `/document-vault` - Document Vault

#### Task Management
- `/tasks` - Task Dashboard
- `/task-management` - Task Management
- `/my-tasks` - My Tasks

#### Referral & Wallet
- `/referrals`, `/referral-dashboard` - Referral Dashboard
- `/wallet` - Wallet Credits

---

### **📊 ANALYTICS & DASHBOARDS**

#### Business Intelligence
- `/executive-dashboard`, `/analytics` - Executive Dashboard
- `/business-intelligence`, `/bi`, `/insights` - Business Intelligence
- `/financials`, `/financial-management`, `/revenue-analytics` - Financial Management

#### Client & HR Management
- `/client-master`, `/clients`, `/client-management` - Client Master
- `/hr`, `/hr-dashboard`, `/human-resources` - HR Dashboard

#### Mobile Command Center
- `/mobile-dashboard`, `/mobile`, `/command-center` - Mobile Dashboard

---

### **🔄 WORKFLOWS & AUTOMATION**

- `/workflows` - Workflow Dashboard
- `/automation` - Automation Rules
- `/compliance-tracker` - Compliance Tracker
- `/compliance-dashboard` - Compliance Dashboard
- `/10k`, `/compliance-scorecard` - Compliance Scorecard

---

### **📱 ONBOARDING FLOWS**

- `/onboarding` - Main Onboarding
- `/onboarding-flow` - Onboarding Flow
- `/smart-start` - Smart Start
- `/whatsapp-onboarding` - WhatsApp Onboarding
- `/streamlined-onboarding` - Streamlined Onboarding

**Onboarding Steps**:
1. Business Type Selection
2. Industry Classification
3. Service Selection
4. Package Selection
5. Founder Details
6. Document Upload
7. E-Sign Agreements
8. Payment Gateway
9. Confirmation

---

### **💰 PAYMENTS & PRICING**

- `/payment-gateway` - Payment Gateway (Stripe)
- `/package-selection` - Package Selection
- `/retainership-plans` - Retainership Plans

---

### **🎨 UTILITY PAGES**

- `/design-system` - Design System Showcase
- `/blueprint`, `/master-blueprint` - Master Blueprint
- `/sync-dashboard` - Sync Dashboard

---

## 🔗 Footer Navigation

### Products
- AutoComply - `/autocomply`
- TaxTracker - `/taxtracker`
- DigiScore - `/digiscore`
- Pricing - `#pricing`

### Company
- About Us - `/about`
- Contact Sales - `tel:+919876543210`
- Careers - `/careers`
- Blog - `/blog`

### Resources
- Help Center - `/help`
- Privacy Policy - `/privacy`
- Terms of Service - `/terms`
- Security - `/security`

---

## 📞 Contact Information

**Phone**: +91 98765 43210  
**Email**: hello@digicomply.in  
**WhatsApp**: +91 88269 90111

---

## 🎯 KEY USER FLOWS

### Flow 1: New Client Registration
```
/ → /register → /login → /portal
```

### Flow 2: Explore AI Products
```
/ → Scroll to #products → /autocomply or /taxtracker or /digiscore
```

### Flow 3: Admin Access
```
/ → /login → /admin → Access 7 tabs (Dashboard/Services/Workflows/Analytics/Users/Config/Roles)
```

### Flow 4: Service Request
```
/portal → /service-requests → /service-selection → /payment-gateway → /confirmation
```

### Flow 5: Operations Workflow
```
/operations → /service-requests → /qc → /delivery
```

### Flow 6: Agent Referral
```
/agent → /leads → /proposals → /referrals → Commission Tracking
```

---

## ✅ PRODUCTION-READY FEATURES

All routes are fully functional with:
- ✅ Responsive mobile-first design
- ✅ Dark mode support
- ✅ Role-based access control
- ✅ Real-time data updates
- ✅ Complete workflows
- ✅ Database integration
- ✅ API connectivity

**Platform Status**: 🚀 **PRODUCTION READY**
