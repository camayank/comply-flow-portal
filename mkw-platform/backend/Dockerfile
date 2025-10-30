# Multi-stage Dockerfile for Node.js Backend

# Stage 1: Base image with dependencies
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    curl \
    bash \
    postgresql-client \
    && rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Stage 2: Dependencies installation
FROM base AS dependencies

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Install development dependencies for building
RUN npm ci && npm cache clean --force

# Stage 3: Development
FROM dependencies AS development

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p logs uploads && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start development server
CMD ["npm", "run", "dev"]

# Stage 4: Production build
FROM base AS production

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Create required directories
RUN mkdir -p logs uploads && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start production server
CMD ["npm", "start"]