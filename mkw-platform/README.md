# MKW Enterprise Platform 🏢

A complete Salesforce-level CRM platform built for MKW Advisors with modern web technologies.

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/camayank/comply-flow-portal.git
cd comply-flow-portal/mkw-platform

# Start with Docker (Recommended)
docker-compose up -d

# Or start manually
# 1. Start database
sudo service postgresql start

# 2. Start backend
cd backend
npm install
npm run dev

# 3. Start frontend
cd frontend
npm install
npm start
```

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18, Tailwind CSS, Recharts, Socket.IO
- **Backend**: Node.js, Express.js, PostgreSQL, JWT
- **Deployment**: Docker, Docker Compose
- **Database**: PostgreSQL with comprehensive CRM schema

### Project Structure
```
mkw-platform/
├── backend/                    # Node.js API server
│   ├── src/
│   │   ├── server.js          # Main server file
│   │   ├── database/
│   │   │   └── schema.sql     # Complete database schema
│   │   └── routes/
│   │       ├── auth.js        # Authentication routes
│   │       ├── accounts.js    # Account management
│   │       └── opportunities.js # Opportunity management
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
├── frontend/                   # React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── AccountManagement.jsx
│   │   │   └── OpportunityManagement.jsx
│   │   └── App.jsx
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml          # Container orchestration
└── README.md
```

## 📊 Features

### ✅ Core CRM Functionality
- **Dashboard**: Real-time analytics and key metrics
- **Account Management**: Complete customer lifecycle management
- **Opportunity Pipeline**: Visual sales pipeline with drag-drop
- **Contact Management**: Relationship tracking and communication
- **Lead Management**: Lead scoring and conversion tracking
- **Activity Tracking**: Tasks, meetings, calls, and notes

### ✅ Enterprise Features
- **Authentication & Authorization**: JWT-based with role management
- **Real-time Updates**: Socket.IO for live collaboration
- **Advanced Filtering**: Multi-parameter search and filtering
- **Data Visualization**: Interactive charts and reports
- **File Management**: Document upload and storage
- **Audit Trail**: Complete activity logging
- **Mobile Responsive**: Works on all devices

### ✅ Business Process Automation
- **Service Management**: Track service delivery lifecycle
- **Payment Integration**: Razorpay payment gateway
- **Email Notifications**: Automated email workflows
- **SLA Management**: Service level agreement tracking
- **Compliance Tracking**: GST, legal, and regulatory compliance

## 🗄️ Database Schema

### Core Entities
- **Users**: System users with role-based permissions
- **Accounts**: Companies and organizations
- **Contacts**: People associated with accounts
- **Opportunities**: Sales deals and pipeline
- **Leads**: Potential customers
- **Cases**: Customer support tickets
- **Activities**: Tasks, meetings, calls, emails
- **Campaigns**: Marketing campaign tracking
- **Services**: Service catalog and offerings
- **Service Instances**: Active service deliveries

## 🔐 Environment Configuration

### Backend (.env)
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mkw_platform
DB_USER=mkw_user
DB_PASSWORD=your_secure_password

# JWT
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_EXPIRES_IN=7d

# Server
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# External Services
RAZORPAY_KEY_ID=your_razorpay_key
SMTP_USER=your_email
AWS_S3_BUCKET=your_s3_bucket
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
REACT_APP_ENV=development
```

## 🐳 Docker Deployment

### Development
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### Production
```bash
docker-compose --profile production up -d
```

## 📚 API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh JWT token

### Accounts
- `GET /api/accounts` - List accounts with filtering
- `POST /api/accounts` - Create new account
- `GET /api/accounts/:id` - Get account details
- `PUT /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Delete account

### Opportunities
- `GET /api/opportunities` - List opportunities
- `GET /api/opportunities/pipeline` - Pipeline view
- `POST /api/opportunities` - Create opportunity
- `PUT /api/opportunities/:id` - Update opportunity

## 🚀 Deployment Options

### Cloud Platforms
- **AWS**: EC2, RDS, S3, CloudFront
- **Azure**: App Service, PostgreSQL, Blob Storage
- **Google Cloud**: Compute Engine, Cloud SQL, Cloud Storage
- **DigitalOcean**: Droplets, Managed Databases, Spaces

### Recommended Production Setup
1. **Database**: Managed PostgreSQL (AWS RDS, Azure Database)
2. **Backend**: Container service (AWS ECS, Azure Container Instances)
3. **Frontend**: Static hosting (Netlify, Vercel, CloudFront)
4. **Files**: Object storage (AWS S3, Azure Blob Storage)
5. **Monitoring**: Application monitoring (New Relic, DataDog)

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests  
cd frontend
npm test

# Integration tests
npm run test:integration
```

## 🔧 Development

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Docker & Docker Compose (optional)

### Setup Development Environment
```bash
# 1. Install dependencies
npm run install:all

# 2. Setup database
createdb mkw_platform
psql mkw_platform < backend/src/database/schema.sql

# 3. Configure environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 4. Start development servers
npm run dev
```

### Database Migrations
```bash
cd backend
npm run migrate
npm run seed
```

## 📈 Performance

### Optimizations
- Database indexing for fast queries
- Redis caching for frequent operations
- CDN for static assets
- Gzip compression
- Image optimization
- Lazy loading for large datasets

### Scalability
- Horizontal scaling with load balancers
- Database read replicas
- Microservices architecture ready
- Container orchestration (Kubernetes)

## 🔒 Security

### Implemented Security Features
- JWT authentication with refresh tokens
- Password hashing with bcrypt
- Rate limiting and request throttling
- CORS protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- HTTPS enforcement in production

## 📞 Support

### Business Contacts
- **Company**: MKW Advisors
- **Email**: info@mkwadvisors.com
- **Phone**: +91-9999999999
- **Support**: support@mkwadvisors.com

### Technical Support
- **Documentation**: [Link to documentation]
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions

## 📄 License

This project is proprietary software developed for MKW Advisors.

## 🤝 Contributing

This is a private enterprise application. For internal development guidelines, please refer to the development documentation.

---

**Built with ❤️ by MKW Advisors Development Team**