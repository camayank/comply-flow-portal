# 🚀 MKW Platform - Enterprise CRM Solution

**Complete Salesforce-level CRM platform built for MKW Advisors**

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

## 📋 Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Development](#development)
- [Contributing](#contributing)

## ✨ Features

### 🏢 Account Management
- **Complete customer profiles** with billing/shipping addresses
- **Industry categorization** and account type classification
- **Health scoring** and relationship tracking
- **Hierarchical account structures** (parent-child relationships)
- **360-degree account view** with related opportunities and contacts

### 🎯 Opportunity Management
- **Visual sales pipeline** with drag-and-drop Kanban boards
- **Probability-based forecasting** with weighted pipeline values
- **Stage progression tracking** with automatic date logging
- **Competitor analysis** and deal risk assessment
- **Real-time collaboration** with Socket.IO updates

### 👥 Contact & Lead Management
- **Comprehensive contact profiles** with relationship mapping
- **Lead scoring and qualification** workflows
- **Communication history** tracking across all touchpoints
- **Conversion tracking** from lead to opportunity

### 📊 Business Intelligence
- **Executive dashboard** with KPIs and trends
- **Revenue forecasting** with pipeline analytics
- **Performance metrics** and win/loss analysis
- **Industry insights** and account distribution
- **Real-time reporting** with interactive charts

### 🔐 Enterprise Security
- **JWT authentication** with refresh token support
- **Role-based access control** (Admin, Manager, Sales Rep, User)
- **Rate limiting** and DDoS protection
- **Audit logging** for compliance requirements
- **Data encryption** and secure password hashing

### 📱 Modern Tech Stack
- **React 18** with hooks and modern patterns
- **Node.js/Express** backend with TypeScript support
- **PostgreSQL** with optimized schemas and indexing
- **Socket.IO** for real-time collaboration
- **Docker** containerization for easy deployment
- **Tailwind CSS** for responsive, beautiful UI

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Git
- Docker (optional, recommended)

### Method 1: Docker Deployment (Recommended)

```bash
# Clone repository
git clone https://github.com/camayank/comply-flow-portal.git
cd comply-flow-portal/mkw-platform

# Start all services with Docker
docker-compose up -d

# Check health
curl http://localhost:5000/health
```

### Method 2: Manual Setup

```bash
# Clone and navigate
git clone https://github.com/camayank/comply-flow-portal.git
cd comply-flow-portal/mkw-platform

# Run automated setup
npm run setup

# Create database
createdb mkw_platform
psql -U postgres -d mkw_platform -f backend/src/database/schema.sql

# Start development servers
npm run dev:all
```

### Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health**: http://localhost:5000/health

**Default Login:**
- Email: `admin@mkwadvisors.com`
- Password: `admin123`

## 🏗️ Architecture

### System Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend│    │  Express Backend│    │  PostgreSQL DB  │
│   (Port 3000)   │◄──►│   (Port 5000)   │◄──►│   (Port 5432)   │
│                 │    │                 │    │                 │
│ • Dashboard     │    │ • JWT Auth      │    │ • 12 Core Tables│
│ • Account Mgmt  │    │ • REST APIs     │    │ • Relationships │
│ • Pipeline View │    │ • Socket.IO     │    │ • Indexes       │
│ • Real-time UI  │    │ • Security      │    │ • Audit Trail   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Database Schema
```sql
-- Core CRM Tables
├── users (system users)
├── accounts (companies/organizations)  
├── contacts (people)
├── opportunities (sales deals)
├── leads (potential customers)
├── cases (support tickets)
├── activities (tasks/meetings/calls)
├── campaigns (marketing campaigns)
├── services (service catalog)
├── service_instances (active deliveries)
├── documents (file attachments)
└── audit_logs (system audit trail)
```

### API Endpoints
```
/api/v1/auth/*          Authentication & user management
/api/v1/accounts/*      Account CRUD and relationships
/api/v1/opportunities/* Pipeline management and forecasting
/api/v1/contacts/*      Contact relationship management
/api/v1/leads/*         Lead capture and qualification
/api/v1/cases/*         Support ticket management
/api/v1/activities/*    Task and meeting management
/api/v1/campaigns/*     Marketing campaign tracking
```

## 📚 API Documentation

### Authentication

**POST /api/v1/auth/login**
```json
{
  "email": "admin@mkwadvisors.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": 1, "email": "admin@mkwadvisors.com", "role": "admin" },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": "7d"
    }
  }
}
```

### Accounts

**GET /api/v1/accounts**
- Query params: `page`, `limit`, `search`, `type`, `industry`, `status`
- Returns paginated account list with relationships

**POST /api/v1/accounts**
```json
{
  "name": "Acme Corporation",
  "type": "enterprise",
  "industry": "technology",
  "website": "https://acme.com",
  "phone": "+91-99999-99999",
  "email": "contact@acme.com",
  "billingCity": "Mumbai",
  "billingState": "Maharashtra",
  "annualRevenue": 50000000,
  "numberOfEmployees": 250
}
```

### Opportunities

**GET /api/v1/opportunities/pipeline**
- Returns Kanban pipeline data grouped by stage
- Includes summary statistics and weighted values

**POST /api/v1/opportunities**
```json
{
  "name": "Q4 Software License Deal",
  "accountId": 1,
  "amount": 2500000,
  "probability": 75,
  "closeDate": "2024-12-31",
  "stage": "proposal",
  "description": "Enterprise software licensing opportunity"
}
```

## 🌐 Deployment Options

### AWS Deployment
```bash
# Deploy to AWS with RDS
aws rds create-db-instance \
  --db-instance-identifier mkw-platform \
  --engine postgres \
  --db-instance-class db.t3.micro

# Deploy to EC2
scp -r mkw-platform/ ec2-user@your-server:/home/ec2-user/
ssh ec2-user@your-server
cd mkw-platform
docker-compose --profile production up -d
```

### Digital Ocean
1. Fork this repository
2. Connect to DigitalOcean App Platform
3. Import from GitHub
4. Set environment variables
5. Deploy!

### Railway/Render
```bash
# One-command deployment
railway up
# or
render deploy
```

## 🛠️ Development

### Project Structure
```
mkw-platform/
├── backend/
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── database/        # Database schema & connection
│   │   ├── middleware/      # Express middleware
│   │   └── utils/          # Utility functions
│   ├── Dockerfile          # Backend container
│   └── package.json        # Backend dependencies
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   └── App.jsx        # Main application
│   ├── Dockerfile          # Frontend container
│   └── package.json        # Frontend dependencies
├── docker-compose.yml      # Container orchestration
├── scripts/               # Automation scripts
└── README.md              # This file
```

### Development Workflow

```bash
# Start development environment
npm run dev:all

# Run tests
npm run test:all

# Lint and format code
npm run lint:all

# Build for production
npm run build:all
```

### Adding New Features

1. **Backend**: Add routes in `backend/src/routes/`
2. **Frontend**: Add components in `frontend/src/components/`
3. **Database**: Update `backend/src/database/schema.sql`
4. **API**: Follow existing patterns for consistency

## 📈 Performance

- **Database**: Optimized indexes for all major queries
- **API**: Response caching and pagination
- **Frontend**: Code splitting and lazy loading
- **Real-time**: Efficient Socket.IO event handling
- **Security**: Rate limiting and request validation

## 🔧 Configuration

### Environment Variables

**Backend (.env):**
```env
DB_HOST=localhost
DB_NAME=mkw_platform
DB_USER=mkw_user
DB_PASSWORD=mkw_secure_2024!
JWT_SECRET=your-super-secure-jwt-secret
NODE_ENV=development
PORT=5000
```

**Frontend (.env):**
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
REACT_APP_ENV=development
```

## 📊 Monitoring

- **Health Checks**: `/health` endpoint with database connectivity
- **Logging**: Winston logger with file rotation
- **Error Tracking**: Comprehensive error logging and monitoring
- **Performance**: Request timing and memory usage tracking

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

Proprietary - MKW Advisors. All rights reserved.

## 📞 Support

- **Technical Issues**: Create GitHub issues
- **Business Questions**: Contact MKW Advisors team
- **Documentation**: Check `/docs` folder

---

**Built with ❤️ by MKW Advisors Development Team**

*Transform your business relationships with enterprise-grade CRM technology.*