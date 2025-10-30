#!/bin/bash

# MKW Platform Setup Script
# This script automates the complete setup process

set -e  # Exit on any error

echo "🚀 MKW Platform Setup Started..."
echo "====================================="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check prerequisites
print_info "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current: $(node --version)"
    exit 1
fi
print_status "Node.js $(node --version) detected"

# Check Docker
if command -v docker &> /dev/null; then
    print_status "Docker available - can use docker-compose deployment"
    DOCKER_AVAILABLE=true
else
    print_warning "Docker not found. Manual setup will be required."
    DOCKER_AVAILABLE=false
fi

# Setup backend
print_info "Setting up backend..."
cd backend

if [ ! -f .env ]; then
    cp .env.example .env
    print_status "Environment file created: backend/.env"
    print_warning "Please update database credentials in backend/.env"
fi

# Install backend dependencies
print_info "Installing backend dependencies..."
npm install
print_status "Backend dependencies installed"

# Setup frontend
print_info "Setting up frontend..."
cd ../frontend

if [ ! -f .env ]; then
    cp .env.example .env
    print_status "Environment file created: frontend/.env"
fi

# Install frontend dependencies
print_info "Installing frontend dependencies..."
npm install
print_status "Frontend dependencies installed"

cd ..

echo
print_status "🎉 MKW Platform setup completed successfully!"
echo
print_info "Next steps:"
echo "1. Set up PostgreSQL database:"
echo "   createdb mkw_platform"
echo "   psql -U postgres -d mkw_platform -f backend/src/database/schema.sql"
echo
print_info "2. Start the application:"
if [ "$DOCKER_AVAILABLE" = true ]; then
    echo "   Docker: docker-compose up -d"
fi
echo "   Manual: npm run dev:all"
echo
print_info "3. Access at:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5000"
echo "   Login:    admin@mkwadvisors.com / admin123"
echo