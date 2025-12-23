# MKW Platform - Complete Business Management System

[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-blue.svg)](https://postgresql.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-lightgrey.svg)](https://expressjs.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)

A comprehensive, enterprise-grade business management platform designed for professional services companies. Built with modern technologies and security best practices.

## 🚀 Features

### Core Business Management
- **Service Catalog Management** - Complete service definitions with pricing tiers
- **Service Request Processing** - End-to-end workflow management
- **Client Relationship Management** - Customer data and interaction tracking
- **Document Management** - Secure file uploads with S3 integration
- **Quality Control System** - Multi-stage review and approval workflows
- **Payment Integration** - Razorpay integration for Indian market
- **Communication Hub** - Email, SMS, and notification management

### Advanced Features
- **Real-time Updates** - Socket.IO powered live notifications
- **Role-based Access Control** - Granular permissions system
- **Workflow Automation** - Configurable business process automation
- **Audit Logging** - Comprehensive activity tracking
- **Multi-tenant Architecture** - Support for multiple business units
- **RESTful API** - Complete API with OpenAPI documentation
- **Enterprise Security** - JWT + Session hybrid authentication

### Technical Highlights
- **Scalable Architecture** - Microservices-ready design
- **Database Migrations** - Version-controlled schema management
- **File Storage Options** - Local filesystem or AWS S3
- **Email Service** - SMTP integration with template system
- **Comprehensive Logging** - Winston-based structured logging
- **Health Monitoring** - Built-in health checks and metrics
- **Production Ready** - PM2 clustering and Nginx reverse proxy

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   React App     │◄──►│   Express.js    │◄──►│   PostgreSQL    │
│   (Separate)    │    │   + Socket.IO   │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │  File Storage   │    │   Email/SMS     │
                       │  Local / S3     │    │   SMTP/API      │
                       └─────────────────┘    └─────────────────┘
```

## 📋 Prerequisites

- **Node.js** 18.x or higher
- **PostgreSQL** 13.x or higher
- **npm** 8.x or higher
- **Redis** (optional, for session storage)

## ⚡ Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/your-username/mkw-platform.git
cd mkw-platform/mkw-platform/backend

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb mkw_platform

# Run migrations
npm run migrate

# Seed initial data
npm run seed
```

### 3. Configure Environment

Edit `.env` file with your settings:

```env
# Database
DB_HOST=localhost
DB_NAME=mkw_platform
DB_USER=your_username
DB_PASSWORD=your_password

# Security (Generate strong secrets!)
JWT_SECRET=your-jwt-secret-minimum-32-characters
SESSION_SECRET=your-session-secret-minimum-32-characters
CREDENTIAL_ENCRYPTION_KEY=your-encryption-key-minimum-32-characters

# Email (Optional for development)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 4. Start Development Server

```bash
# Start in development mode
npm run dev

# Or start in production mode
npm start
```

The API will be available at `http://localhost:5000`

### 5. Default Login Credentials

**Super Admin:**
- Email: `admin@mkwadvisors.com`
- Password: `MKW@Admin2024`

**Operations Manager:**
- Email: `operations@mkwadvisors.com`
- Password: `MKW@Ops2024`

⚠️ **Important**: Change these passwords immediately after first login!

## 📚 API Documentation

Interactive API documentation is available at:
- Development: `http://localhost:5000/api/docs`
- Raw OpenAPI spec: `http://localhost:5000/api/docs/openapi.json`

## 🗂️ Project Structure

```
mkw-platform/backend/
├── src/
│   ├── database/
│   │   ├── migrations/          # Database schema migrations
│   │   ├── seeds/              # Initial data seeding
│   │   └── connection.js       # Database connection setup
│   ├── middleware/
│   │   └── sessionAuth.js      # Authentication middleware
│   ├── routes/
│   │   ├── admin/              # Admin panel routes
│   │   ├── auth.js            # Authentication routes
│   │   ├── files.js           # File management routes
│   │   └── services.js        # Service management routes
│   ├── utils/
│   │   ├── email.js           # Email service utilities
│   │   ├── logger.js          # Logging configuration
│   │   └── validation.js      # Input validation helpers
│   └── server.js              # Main application entry point
├── logs/                       # Application logs
├── uploads/                    # Local file storage
├── .env.example               # Environment template
├── knexfile.js               # Database configuration
└── package.json              # Dependencies and scripts
```

## 🛠️ Available Scripts

```bash
# Development
npm run dev              # Start with nodemon (auto-reload)
npm start               # Start in production mode
npm test                # Run tests

# Database
npm run migrate         # Run database migrations
npm run migrate:rollback # Rollback last migration
npm run seed            # Seed database with initial data
npm run db:setup        # Run migrations + seeds
npm run db:reset        # Reset database completely

# Utilities
npm run lint            # Check code style
npm run lint:fix        # Fix code style issues
npm run health          # Check application health
```

## 🔧 Configuration

### Environment Variables

The application uses environment variables for configuration. See `.env.example` for all available options:

**Required Variables:**
- `JWT_SECRET` - JWT signing secret (32+ characters)
- `SESSION_SECRET` - Session encryption secret (32+ characters) 
- `CREDENTIAL_ENCRYPTION_KEY` - Data encryption key (32+ characters)
- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - Database connection

**Optional Variables:**
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` - Email configuration
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` - S3 file storage
- `STORAGE_PROVIDER` - 'local' or 's3' (default: 'local')
- `FRONTEND_URL` - Frontend application URL for CORS

### Business Configuration

After initial setup, configure business settings through the admin panel:

1. **Company Information** - Name, contact details, GST number
2. **Service Catalog** - Customize services and pricing
3. **Workflow Templates** - Define business processes
4. **Notification Templates** - Email and SMS templates
5. **User Roles** - Define access permissions

## 🗃️ Database Schema

The system uses a comprehensive database schema with the following key entities:

- **service_categories** - Service organization
- **services** - Service definitions and pricing
- **service_requests** - Customer service requests
- **service_request_steps** - Workflow step tracking
- **service_documents** - File attachments
- **workflow_templates** - Process definitions
- **system_users** - Internal users and staff
- **roles** - Role-based access control
- **audit_logs** - Activity tracking
- **notifications** - Communication tracking

### Migration Management

```bash
# Create new migration
npm run migrate:make migration_name

# Run migrations
npm run migrate

# Rollback migrations
npm run migrate:rollback

# Check migration status
npx knex migrate:status
```

## 🔐 Security Features

### Authentication & Authorization
- **Hybrid Auth System** - JWT tokens + secure sessions
- **Role-based Access Control** - 7 predefined roles with granular permissions
- **Session Management** - Secure session handling with fingerprinting
- **Password Security** - bcrypt hashing with cost factor 12
- **Account Lockout** - Brute force protection

### Security Middleware
- **Rate Limiting** - Configurable request throttling
- **CORS Protection** - Cross-origin request validation
- **Helmet.js** - Security headers and CSP
- **Input Validation** - Comprehensive request validation
- **SQL Injection Prevention** - Parameterized queries
- **XSS Protection** - Input sanitization

### Data Protection
- **Encryption at Rest** - Sensitive data encryption
- **Secure File Upload** - Type and size validation
- **Audit Logging** - Comprehensive activity tracking
- **Error Handling** - No information leakage

## 📁 File Management

The platform supports two storage modes:

### Local Storage (Development)
```javascript
// Automatic setup - files stored in ./uploads/
STORAGE_PROVIDER=local
UPLOAD_PATH=./uploads
```

### AWS S3 (Production)
```javascript
// Configure S3 credentials
STORAGE_PROVIDER=s3
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=your-bucket-name
```

**Features:**
- File type validation
- Size limits (configurable)
- Virus scanning hooks
- Automatic thumbnails for images
- Secure download URLs
- Access control per document

## 📧 Email Integration

The platform includes a comprehensive email system:

### Development Mode
```javascript
// Automatically uses Ethereal for testing
// Preview URLs logged to console
```

### Production SMTP
```javascript
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**Features:**
- Template-based emails
- Variable substitution
- Service request notifications
- Custom template management
- Delivery tracking
- Bulk email support

## 🔌 Real-time Features

Socket.IO integration provides:

- **Live Notifications** - Instant updates for status changes
- **Real-time Dashboards** - Live data updates
- **Collaborative Features** - Multi-user coordination
- **Activity Feeds** - Live activity streams

```javascript
// Client-side connection
const socket = io('http://localhost:5000', {
  auth: {
    sessionId: 'your-session-id'
  }
});

// Subscribe to service request updates
socket.emit('subscribe:service_request', requestId);
```

## 🚀 Production Deployment

For detailed production deployment instructions, see [PRODUCTION_DEPLOYMENT_GUIDE.md](PRODUCTION_DEPLOYMENT_GUIDE.md).

### Quick Production Setup

1. **Server Requirements**: Ubuntu 20.04+, Node.js 18+, PostgreSQL 13+
2. **Process Management**: PM2 for clustering and auto-restart
3. **Reverse Proxy**: Nginx with SSL termination
4. **SSL Certificate**: Let's Encrypt via Certbot
5. **Monitoring**: Built-in health checks and logging

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2 (cluster mode)
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
```

## 📊 Monitoring & Observability

### Health Checks
```bash
# Application health
curl http://localhost:5000/health

# Database health  
curl http://localhost:5000/api/admin/health
```

### Logging
- **Structured Logging** - JSON format with Winston
- **Log Rotation** - Daily rotation with compression
- **Log Levels** - Configurable verbosity
- **Request Tracing** - Unique request IDs
- **Error Tracking** - Comprehensive error logging

### Performance Monitoring
- **Response Time Tracking** - Built-in metrics
- **Database Query Monitoring** - Slow query detection
- **Memory Usage Tracking** - Heap monitoring
- **File Upload Metrics** - Upload success rates

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration

# Run load tests
npm run test:load
```

## 🤝 Contributing

This is a proprietary project for MKW Advisors. For internal development:

1. **Branch Naming**: `feature/description`, `bugfix/description`
2. **Commit Messages**: Use conventional commits
3. **Code Style**: ESLint + Prettier configuration
4. **Testing**: Add tests for new features
5. **Documentation**: Update relevant docs

### Development Workflow

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and test
npm run lint
npm test

# Commit with conventional format
git commit -m "feat: add new service management feature"

# Push and create pull request
git push origin feature/new-feature
```

## 📞 Support

### Technical Support
- **Email**: tech@mkwadvisors.com
- **Documentation**: Internal wiki available
- **Issue Tracking**: GitHub issues for bug reports
- **Emergency**: 24/7 on-call support available

### Business Support
- **Training**: User training available
- **Customization**: Custom feature development
- **Integration**: Third-party integration support
- **Consulting**: Business process optimization

## 📄 License

This project is proprietary software owned by MKW Advisors. All rights reserved.

## 🔄 Changelog

### Version 1.0.0 (Current)
- ✅ Complete service management system
- ✅ Role-based access control
- ✅ Document management with S3 support
- ✅ Email notification system
- ✅ Real-time updates via Socket.IO
- ✅ Comprehensive audit logging
- ✅ Production-ready security
- ✅ API documentation
- ✅ Database migrations and seeding
- ✅ File upload with validation
- ✅ Payment integration ready
- ✅ Multi-tenant architecture foundation

### Upcoming Features (v1.1.0)
- 📋 Advanced reporting and analytics
- 📱 Mobile app API enhancements
- 🔔 Push notification support
- 📊 Business intelligence dashboard
- 🔄 Workflow automation enhancements
- 📈 Performance optimization
- 🌐 Multi-language support
- 🔒 Advanced security features

---

**Built with ❤️ for MKW Advisors**

*Enterprise Business Management Platform - Empowering Professional Services*