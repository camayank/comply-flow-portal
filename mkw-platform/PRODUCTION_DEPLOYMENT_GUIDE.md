# MKW Platform - Production Deployment Guide

This guide provides step-by-step instructions for deploying the MKW Platform to production environments.

## 🏗️ Architecture Overview

The MKW Platform is a complete business management system consisting of:

- **Backend API**: Node.js/Express server with PostgreSQL database
- **Frontend**: React application (separate deployment)
- **File Storage**: Local filesystem or AWS S3
- **Real-time Features**: Socket.IO for live updates
- **Authentication**: JWT + Session-based hybrid security
- **Database**: PostgreSQL with Knex migrations

## 📋 Prerequisites

### System Requirements
- **Node.js**: 18.0+ (LTS recommended)
- **PostgreSQL**: 13.0+ (14+ recommended)
- **Redis**: 6.0+ (optional, for session storage)
- **Memory**: 2GB RAM minimum (4GB+ recommended)
- **Storage**: 20GB+ (depending on file uploads)

### Required Services
- **Database**: PostgreSQL instance
- **Email**: SMTP server or service (Gmail, SendGrid, etc.)
- **Storage**: AWS S3 bucket (optional, for file storage)
- **Domain**: SSL certificate for HTTPS

## 🚀 Deployment Steps

### 1. Server Setup

#### Ubuntu/Debian Server
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install PM2 for process management
sudo npm install -g pm2

# Install nginx for reverse proxy
sudo apt install nginx -y

# Install certbot for SSL
sudo apt install certbot python3-certbot-nginx -y
```

#### CentOS/RHEL Server
```bash
# Update system packages
sudo yum update -y

# Install Node.js 18 LTS
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install PostgreSQL
sudo yum install postgresql-server postgresql-contrib -y
sudo postgresql-setup initdb
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Install PM2
sudo npm install -g pm2

# Install nginx
sudo yum install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 2. Database Setup

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE mkw_platform;
CREATE USER mkw_user WITH ENCRYPTED PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE mkw_platform TO mkw_user;
ALTER USER mkw_user CREATEDB;  -- For running migrations
\q
```

### 3. Application Deployment

```bash
# Create application directory
sudo mkdir -p /var/www/mkw-platform
sudo chown $USER:$USER /var/www/mkw-platform
cd /var/www/mkw-platform

# Clone repository (or upload files)
git clone https://github.com/your-username/mkw-platform.git .
# OR upload and extract your deployment package

# Navigate to backend directory
cd mkw-platform/backend

# Install dependencies
npm ci --production

# Create uploads directory
mkdir -p uploads
chmod 755 uploads

# Copy environment file
cp .env.example .env
```

### 4. Environment Configuration

Edit the production `.env` file:

```bash
nano .env
```

```env
# PRODUCTION ENVIRONMENT CONFIGURATION
NODE_ENV=production
PORT=5000
LOG_LEVEL=info

# DATABASE (Use your actual values)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mkw_platform
DB_USER=mkw_user
DB_PASSWORD=your_secure_password_here

# SECURITY (Generate strong secrets - 32+ characters each)
JWT_SECRET=your-super-secure-jwt-secret-key-minimum-32-characters-long-production
SESSION_SECRET=your-super-secure-session-secret-minimum-32-characters-long-production
CREDENTIAL_ENCRYPTION_KEY=your-super-secure-encryption-key-minimum-32-characters-long-production

# FRONTEND
FRONTEND_URL=https://yourdomain.com
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
COOKIE_DOMAIN=.yourdomain.com
COOKIE_SECURE=true

# EMAIL (Use your SMTP provider)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM_NAME=MKW Advisors
EMAIL_FROM_ADDRESS=noreply@yourdomain.com

# FILE STORAGE (Local or S3)
STORAGE_PROVIDER=s3
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
S3_BUCKET_NAME=mkw-platform-uploads-prod
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# RATE LIMITING
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# BUSINESS CONFIGURATION
COMPANY_NAME=MKW Advisors
COMPANY_EMAIL=info@yourdomain.com
COMPANY_PHONE=+91-11-4567-8900
COMPANY_WEBSITE=https://yourdomain.com

# DISABLE FEATURES FOR PRODUCTION
API_DOCS_ENABLED=false
DEBUG_SQL=false
DEBUG_EMAILS=false
```

### 5. Database Migration and Seeding

```bash
# Run database migrations
npm run migrate

# Seed initial data
npm run seed

# Verify database setup
psql -h localhost -U mkw_user -d mkw_platform -c "SELECT COUNT(*) FROM system_users;"
```

### 6. PM2 Process Management

Create PM2 ecosystem file:

```bash
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'mkw-platform-backend',
    script: 'src/server.js',
    cwd: '/var/www/mkw-platform/mkw-platform/backend',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    log_file: '/var/log/mkw-platform/combined.log',
    out_file: '/var/log/mkw-platform/out.log',
    error_file: '/var/log/mkw-platform/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    node_args: '--max_old_space_size=1024'
  }]
};
```

```bash
# Create log directory
sudo mkdir -p /var/log/mkw-platform
sudo chown $USER:$USER /var/log/mkw-platform

# Start application with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided by the startup command
```

### 7. Nginx Reverse Proxy Setup

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/mkw-platform
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Configuration (will be handled by certbot)
    # ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Increase max upload size for file uploads
    client_max_body_size 10M;
    
    # API routes
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Socket.IO
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Health check
    location /health {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Frontend (if serving from same domain)
    location / {
        root /var/www/mkw-platform/frontend/build;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }
    
    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/mkw-platform /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### 8. SSL Certificate Setup

```bash
# Obtain SSL certificate with Certbot
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

### 9. Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Check status
sudo ufw status
```

### 10. Monitoring and Logging

```bash
# Setup log rotation for application logs
sudo nano /etc/logrotate.d/mkw-platform
```

```
/var/log/mkw-platform/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}

/var/www/mkw-platform/mkw-platform/backend/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
```

## 🔧 Post-Deployment Configuration

### 1. Default Admin Access

After seeding, you can login with these default credentials:
- **Super Admin**: `admin@mkwadvisors.com` / `MKW@Admin2024`
- **Operations**: `operations@mkwadvisors.com` / `MKW@Ops2024`

⚠️ **CRITICAL**: Change these passwords immediately after first login!

### 2. System Configuration

Access the admin panel at `https://yourdomain.com/admin` and configure:

1. **Company Information**
   - Update company name, email, phone, address
   - Set GST number and other business details

2. **Email Settings**
   - Verify SMTP configuration is working
   - Test email templates

3. **Business Rules**
   - Set default SLA hours
   - Configure auto-assignment rules
   - Set payment requirements

4. **User Management**
   - Create actual user accounts
   - Assign proper roles and permissions
   - Disable/remove default accounts

### 3. Service Catalog Setup

The system comes with pre-configured services for:
- Corporate Compliance
- Financial Services  
- Legal Advisory
- Business Advisory

Customize these services according to your actual offerings.

## 📊 Monitoring and Maintenance

### Application Monitoring

```bash
# Check application status
pm2 status
pm2 logs mkw-platform-backend

# Monitor system resources
htop
df -h

# Check database connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname='mkw_platform';"
```

### Health Checks

```bash
# API health check
curl https://yourdomain.com/health

# Database health check
curl https://yourdomain.com/api/admin/health
```

### Backup Strategy

```bash
# Create backup script
sudo nano /usr/local/bin/mkw-backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/mkw-platform"
DATE=$(date +"%Y%m%d_%H%M%S")

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -h localhost -U mkw_user mkw_platform > $BACKUP_DIR/database_$DATE.sql

# Files backup (if using local storage)
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz -C /var/www/mkw-platform/mkw-platform/backend uploads/

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# Make script executable
sudo chmod +x /usr/local/bin/mkw-backup.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/mkw-backup.sh >> /var/log/mkw-backup.log 2>&1
```

## 🔒 Security Hardening

### 1. Database Security

```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/*/main/postgresql.conf

# Set listen_addresses to specific IPs only
listen_addresses = 'localhost'

# Edit pg_hba.conf for authentication
sudo nano /etc/postgresql/*/main/pg_hba.conf

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 2. System Updates

```bash
# Setup automatic security updates
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure unattended-upgrades
```

### 3. Fail2Ban (Optional)

```bash
# Install fail2ban for intrusion prevention
sudo apt install fail2ban -y

# Configure for nginx
sudo nano /etc/fail2ban/jail.local
```

```ini
[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
logpath = /var/log/nginx/error.log
```

## 🚨 Troubleshooting

### Common Issues

1. **Application won't start**
   ```bash
   # Check PM2 logs
   pm2 logs mkw-platform-backend
   
   # Check environment variables
   pm2 env mkw-platform-backend
   ```

2. **Database connection errors**
   ```bash
   # Test database connection
   psql -h localhost -U mkw_user -d mkw_platform -c "SELECT version();"
   
   # Check PostgreSQL status
   sudo systemctl status postgresql
   ```

3. **File upload issues**
   ```bash
   # Check uploads directory permissions
   ls -la /var/www/mkw-platform/mkw-platform/backend/uploads/
   
   # Check nginx upload size
   grep client_max_body_size /etc/nginx/sites-available/mkw-platform
   ```

4. **SSL certificate issues**
   ```bash
   # Check certificate status
   sudo certbot certificates
   
   # Renew certificate
   sudo certbot renew
   ```

### Support

For additional support:
- Check application logs in `/var/log/mkw-platform/`
- Review PM2 logs with `pm2 logs`
- Monitor system resources with `htop` and `df -h`
- Contact: tech@mkwadvisors.com

---

## 📝 Deployment Checklist

- [ ] Server setup completed
- [ ] Database configured and migrated
- [ ] Environment variables configured
- [ ] Application deployed with PM2
- [ ] Nginx reverse proxy configured
- [ ] SSL certificate installed
- [ ] Firewall configured
- [ ] Backups configured
- [ ] Default passwords changed
- [ ] System configuration updated
- [ ] Health checks passing
- [ ] Monitoring setup
- [ ] DNS configured
- [ ] Email service tested

**Your MKW Platform is now ready for production use!** 🎉