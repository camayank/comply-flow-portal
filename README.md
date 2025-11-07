# 🚀 Comply Flow Portal

**Enterprise-Grade Compliance Management Platform**

![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)
![React](https://img.shields.io/badge/React-18+-blue.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)
![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)

## 📖 Overview

Comply Flow Portal is a Salesforce-level enterprise compliance management platform designed to streamline compliance operations for businesses of all sizes. Built with modern technologies and following industry best practices, it provides comprehensive tools for managing clients, sales, operations, compliance, and administration.

### 🎯 Key Features

- **7 Core Modules**: Client Portal, Sales Portal, Operations, Compliance, Administration, Payments, and Agent/Partner Portal
- **30+ User Stories**: Comprehensive coverage of all compliance workflows
- **100+ API Endpoints**: RESTful API with complete documentation
- **23 Database Tables**: Optimized schema with proper relationships
- **Role-Based Access Control**: 6 user roles with granular permissions
- **Real-time Notifications**: Email, SMS, WhatsApp, and in-app alerts
- **Enterprise Security**: JWT authentication, rate limiting, encryption, audit trails
- **Production-Ready**: Docker deployment, monitoring, logging, and health checks

## 🏗️ Architecture

### Technology Stack

**Backend:**
- Node.js 18+ with Express.js
- PostgreSQL 15+ database
- Sequelize ORM
- JWT for authentication
- Socket.io for real-time features
- Nodemailer, Twilio, WhatsApp Business API

**Frontend:**
- React 18 with Vite
- Redux Toolkit for state management
- Tailwind CSS for styling
- Recharts for analytics
- React Router for navigation

**DevOps:**
- Docker & Docker Compose
- Replit deployment support
- PM2 for process management
- Winston for logging

### 📁 Repository Structure

```
comply-flow-portal/
├── server/                      # Backend application
│   ├── index.js                # Main server entry
│   ├── config/                 # Configuration files
│   ├── middleware/             # Express middleware
│   ├── models/                 # Sequelize models
│   ├── routes/                 # API routes
│   ├── services/               # Business logic
│   └── utils/                  # Helper functions
├── client/                     # Frontend application
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── store/             # Redux store
│   │   ├── services/          # API services
│   │   └── utils/             # Utilities
│   └── package.json
├── database/
│   ├── migrations/            # Database migrations
│   └── seeds/                 # Seed data
├── docs/                      # Documentation
├── docker-compose.yml         # Docker configuration
├── TECHNICAL_SPECIFICATIONS_COMPLETE.md
├── IMPLEMENTATION_ROADMAP.md
└── README.md                  # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18 or higher
- PostgreSQL 15 or higher
- npm or yarn
- Docker (optional, for containerized deployment)

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/camayank/comply-flow-portal.git
cd comply-flow-portal
```

2. **Install dependencies:**
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

3. **Set up environment variables:**
```bash
# Copy example env file
cp .env.example .env

# Edit .env with your configuration
# DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS
# JWT_SECRET, JWT_EXPIRY
# EMAIL_HOST, EMAIL_USER, EMAIL_PASS
# TWILIO_*, WHATSAPP_*
```

4. **Initialize database:**
```bash
# Run migrations
npm run db:migrate

# Seed initial data
npm run db:seed
```

5. **Start the application:**
```bash
# Development mode (runs both frontend and backend)
npm run dev

# Or run separately:
# Backend: npm run dev:server (port 5000)
# Frontend: npm run dev:client (port 3000)
```

6. **Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Documentation: http://localhost:5000/api-docs

### Docker Deployment

```bash
# Build and start containers
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

### Default Login Credentials

- **Admin**: admin@complyflow.com / Admin@123
- **Sales Manager**: sales@complyflow.com / Sales@123
- **Operations Manager**: ops@complyflow.com / Ops@123

## 📋 Core Modules

### 1. Client Portal
- Client registration and profile management
- Document upload and tracking
- Service status monitoring
- Payment history and invoicing
- Support ticket system

### 2. Sales Portal
- Lead management and tracking
- Proposal creation and management
- Pipeline visualization
- Client onboarding
- Sales analytics and reporting

### 3. Operations Portal
- Task and workflow management
- Document processing
- Service delivery tracking
- Team collaboration
- Performance metrics

### 4. Compliance Portal
- Regulatory compliance tracking
- Deadline management
- Compliance reporting
- Audit trail
- Risk assessment

### 5. Administration Portal
- User management
- Role and permission configuration
- System settings
- Email/SMS template management
- Audit logs and monitoring

### 6. Payment System
- Razorpay integration
- Invoice generation
- Payment tracking
- Refund processing
- Financial reporting

### 7. Agent/Partner Portal
- Partner registration
- Lead submission
- Commission tracking
- Performance dashboard
- Payout management

## 🔐 Security Features

- **Authentication**: JWT-based with secure token storage
- **Authorization**: Role-based access control (RBAC)
- **Data Encryption**: At-rest and in-transit encryption
- **Rate Limiting**: API request throttling
- **Audit Logging**: Comprehensive activity tracking
- **OWASP Compliance**: Following security best practices
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Input sanitization and validation

## 📊 API Documentation

### API Endpoints Overview

- **Authentication**: 4 endpoints (login, register, refresh, logout)
- **Clients**: 15+ endpoints (CRUD, documents, payments, tickets)
- **Sales**: 20+ endpoints (leads, proposals, pipeline)
- **Operations**: 15+ endpoints (tasks, workflows, services)
- **Administration**: 20+ endpoints (users, roles, settings, logs)
- **Payments**: 10+ endpoints (invoices, transactions, webhooks)
- **Agents**: 12+ endpoints (registration, leads, commissions)

For complete API documentation, see [TECHNICAL_SPECIFICATIONS_COMPLETE.md](./TECHNICAL_SPECIFICATIONS_COMPLETE.md)

## 📈 Database Schema

23 tables covering:
- User management (users, roles, permissions, user_roles)
- Client management (clients, client_documents, client_services)
- Sales (leads, proposals, opportunities)
- Operations (tasks, workflows, services, deliveries)
- Payments (invoices, transactions, payment_methods)
- Notifications (notifications, email_logs, sms_logs, whatsapp_logs)
- Administration (settings, templates, audit_logs)
- Partners (agents, agent_leads, commissions, payouts)

## 🔄 Development Workflow

### Branch Strategy
- `main`: Production-ready code
- `develop`: Development branch
- `feature/*`: Feature branches
- `bugfix/*`: Bug fix branches

### Code Standards
- ESLint for linting
- Prettier for formatting
- Conventional Commits
- Code review required

### Testing
```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

## 📦 Deployment

### Replit Deployment
1. Fork repository to Replit
2. Configure environment variables
3. Run `npm install`
4. Start application with `npm start`

### Production Deployment
1. Set up PostgreSQL database
2. Configure environment variables
3. Run database migrations
4. Build frontend: `npm run build`
5. Start server: `npm start`
6. Set up reverse proxy (Nginx/Apache)
7. Configure SSL certificates
8. Set up monitoring and logging

### Environment Variables
See `.env.example` for required configuration:
- Database connection
- JWT secrets
- Email service (SMTP)
- SMS service (Twilio)
- WhatsApp Business API
- Razorpay keys
- File upload configuration

## 🎯 Performance

- **API Response Time**: < 200ms (average)
- **Database Queries**: Optimized with indexes
- **Concurrent Users**: Supports 1000+ users
- **File Upload**: Up to 50MB per file
- **Real-time Updates**: Socket.io for instant notifications

## 🛠️ Maintenance

### Database Backups
```bash
# Automated daily backups
npm run db:backup

# Restore from backup
npm run db:restore <backup-file>
```

### Monitoring
- Health check endpoint: `/health`
- Metrics endpoint: `/metrics`
- Log files in `logs/` directory
- Winston logging with daily rotation

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 📞 Support

- **Documentation**: See [TECHNICAL_SPECIFICATIONS_COMPLETE.md](./TECHNICAL_SPECIFICATIONS_COMPLETE.md)
- **Issues**: [GitHub Issues](https://github.com/camayank/comply-flow-portal/issues)
- **Email**: support@complyflow.com

## 🏆 Acknowledgments

Built with modern technologies and best practices:
- Node.js & Express.js
- React & Redux
- PostgreSQL & Sequelize
- Docker & Docker Compose
- And many other open-source projects

---

**Comply Flow Portal** - Enterprise Compliance Made Simple

*Last Updated: 2024*
