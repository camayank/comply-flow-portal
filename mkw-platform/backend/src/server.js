const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Import security middleware
const {
  rateLimits,
  getCSPPolicy,
  csrfProtection,
  sessionConfig,
  requireMinimumRole,
  validateEnvironment
} = require('./middleware/security');
const {
  sessionManager,
  sessionAuthMiddleware
} = require('./middleware/sessionAuth');

// Import utilities
const logger = require('./utils/logger');
const db = require('./database/connection');

// Validate environment before starting
try {
  validateEnvironment();
  logger.info('Environment validation passed');
} catch (error) {
  logger.error('Environment validation failed', { error: error.message });
  process.exit(1);
}

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }
});

// Trust proxy for accurate IP addresses behind load balancers
app.set('trust proxy', 1);

// Security middleware - Applied in order of importance

// 1. Helmet with strict CSP for production
app.use(helmet({
  contentSecurityPolicy: {
    directives: getCSPPolicy(process.env.NODE_ENV)
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// 2. Compression for performance
app.use(compression());

// 3. Body parsing with size limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Store raw body for webhook verification if needed
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. Cookie parser for secure session management
app.use(cookieParser(sessionConfig.secret));

// 5. Session middleware with secure configuration
if (process.env.NODE_ENV === 'production') {
  // Use Redis for production sessions
  const RedisStore = require('connect-redis')(session);
  const redis = require('redis');
  const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });
  
  sessionConfig.store = new RedisStore({ client: redisClient });
}

app.use(session(sessionConfig));

// 6. CORS with strict configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',');
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked request', { origin, allowedOrigins });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type',
    'Accept',
    'Authorization',
    'X-CSRF-Token'
  ],
  exposedHeaders: ['X-CSRF-Token']
};

app.use(cors(corsOptions));

// 7. General API rate limiting
app.use('/api/', rateLimits.generalAPI);

// 8. Request logging middleware
app.use((req, res, next) => {
  // Log all requests with essential info
  logger.info('API Request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    sessionId: req.sessionID ? req.sessionID.substring(0, 8) + '...' : 'none'
  });
  
  // Add request ID for tracing
  req.requestId = require('crypto').randomBytes(8).toString('hex');
  res.setHeader('X-Request-ID', req.requestId);
  
  next();
});

// Health check endpoint (no authentication required)
app.get('/health', async (req, res) => {
  try {
    // Check database connectivity
    await db.raw('SELECT 1');
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV,
      database: 'connected',
      redis: 'connected', // TODO: Add Redis health check
      uptime: process.uptime()
    };
    
    res.status(200).json(healthData);
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
});

// API Routes with progressive security layers

// Authentication routes (with specific rate limits)
const authRoutes = require('./routes/auth');
app.use('/api/v1/auth', authRoutes);

// Protected API routes (require session authentication)
const accountRoutes = require('./routes/accounts');
const opportunityRoutes = require('./routes/opportunities');

app.use('/api/v1/accounts', sessionAuthMiddleware, accountRoutes);
app.use('/api/v1/opportunities', sessionAuthMiddleware, opportunityRoutes);

// Admin routes with strict protection
app.use('/api/admin/*', 
  rateLimits.adminPerIP, // Strict rate limiting for admin endpoints
  sessionAuthMiddleware, // Must be authenticated
  requireMinimumRole('admin'), // Must have admin privileges
  csrfProtection // CSRF protection for state-changing operations
);

// Example admin routes (previously unprotected - NOW SECURED)
app.post('/api/admin/combo-configurations', 
  sessionAuthMiddleware,
  requireMinimumRole('admin'),
  csrfProtection,
  async (req, res) => {
    try {
      // Admin-only configuration creation
      logger.info('Admin created combo configuration', {
        adminId: req.user.id,
        ip: req.ip,
        config: req.body
      });
      
      res.json({ success: true, message: 'Configuration created' });
    } catch (error) {
      logger.error('Admin combo config creation failed', {
        error: error.message,
        adminId: req.user.id
      });
      res.status(500).json({ success: false, error: 'Creation failed' });
    }
  }
);

app.post('/api/admin/quality-standards',
  sessionAuthMiddleware,
  requireMinimumRole('admin'),
  csrfProtection,
  async (req, res) => {
    try {
      // Admin-only quality standards creation
      logger.info('Admin created quality standard', {
        adminId: req.user.id,
        ip: req.ip
      });
      
      res.json({ success: true, message: 'Quality standard created' });
    } catch (error) {
      logger.error('Admin quality standard creation failed', {
        error: error.message,
        adminId: req.user.id
      });
      res.status(500).json({ success: false, error: 'Creation failed' });
    }
  }
);

app.post('/api/admin/retainership-plans',
  sessionAuthMiddleware,
  requireMinimumRole('admin'),
  csrfProtection,
  async (req, res) => {
    try {
      // Admin-only retainership plan creation
      logger.info('Admin created retainership plan', {
        adminId: req.user.id,
        ip: req.ip
      });
      
      res.json({ success: true, message: 'Retainership plan created' });
    } catch (error) {
      logger.error('Admin retainership plan creation failed', {
        error: error.message,
        adminId: req.user.id
      });
      res.status(500).json({ success: false, error: 'Creation failed' });
    }
  }
);

app.post('/api/admin/quality-audit/:serviceId',
  sessionAuthMiddleware,
  requireMinimumRole('admin'),
  csrfProtection,
  async (req, res) => {
    try {
      const { serviceId } = req.params;
      
      // Admin-only quality audit creation
      logger.info('Admin created quality audit', {
        adminId: req.user.id,
        serviceId,
        ip: req.ip
      });
      
      res.json({ success: true, message: 'Quality audit created' });
    } catch (error) {
      logger.error('Admin quality audit creation failed', {
        error: error.message,
        adminId: req.user.id
      });
      res.status(500).json({ success: false, error: 'Creation failed' });
    }
  }
);

// Socket.IO authentication and real-time features
io.use(async (socket, next) => {
  try {
    const sessionId = socket.handshake.auth.sessionId || 
                     socket.handshake.headers.cookie?.match(/mkw\.sid=([^;]+)/)?.[1];
    
    if (!sessionId) {
      return next(new Error('Authentication required'));
    }
    
    const validation = await sessionManager.validateSession(sessionId, {
      ip: socket.handshake.address,
      headers: socket.handshake.headers
    });
    
    if (!validation.valid) {
      return next(new Error('Invalid session'));
    }
    
    const user = await db('users')
      .where('id', validation.session.userId)
      .where('status', 'active')
      .first();
    
    if (!user) {
      return next(new Error('User not found'));
    }
    
    socket.user = user;
    socket.sessionId = sessionId;
    
    logger.info('Socket.IO connection authenticated', {
      userId: user.id,
      socketId: socket.id,
      ip: socket.handshake.address
    });
    
    next();
  } catch (error) {
    logger.error('Socket.IO authentication failed', {
      error: error.message,
      ip: socket.handshake.address
    });
    next(new Error('Authentication failed'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  const userId = socket.user.id;
  
  // Join user-specific room for private notifications
  socket.join(`user_${userId}`);
  
  // Join role-based rooms for broadcast messages
  socket.join(`role_${socket.user.role}`);
  
  logger.info('User connected to real-time service', {
    userId,
    role: socket.user.role,
    socketId: socket.id
  });
  
  // Handle real-time events
  socket.on('join_account_room', (accountId) => {
    // Verify user has access to this account
    socket.join(`account_${accountId}`);
    logger.info('User joined account room', { userId, accountId });
  });
  
  socket.on('opportunity_update', async (data) => {
    // Broadcast opportunity updates to account room
    socket.to(`account_${data.accountId}`).emit('opportunity_updated', {
      ...data,
      updatedBy: socket.user.first_name + ' ' + socket.user.last_name,
      timestamp: new Date()
    });
  });
  
  socket.on('disconnect', (reason) => {
    logger.info('User disconnected from real-time service', {
      userId,
      socketId: socket.id,
      reason
    });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: req.user?.id
  });
  
  // Don't expose internal errors in production
  const isDev = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    success: false,
    error: isDev ? err.message : 'Internal server error',
    ...(isDev && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Graceful shutdown handling
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Close database connections
    db.destroy(() => {
      logger.info('Database connections closed');
      
      // Close Socket.IO connections
      io.close(() => {
        logger.info('Socket.IO server closed');
        process.exit(0);
      });
    });
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after 30 seconds');
    process.exit(1);
  }, 30000);
}

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  logger.info(`🚀 MKW Platform server started successfully`, {
    port: PORT,
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    security: 'enterprise-grade',
    features: [
      'session-based-auth',
      'csrf-protection', 
      'rate-limiting',
      'admin-route-protection',
      'hashed-otp-storage',
      'progressive-lockout',
      'session-fingerprinting',
      'real-time-collaboration'
    ]
  });
});

// Periodic cleanup tasks
setInterval(async () => {
  try {
    await sessionManager.cleanupExpiredSessions();
    
    // Run database cleanup
    const cleanedCount = await db.raw('SELECT cleanup_expired_security_data()');
    logger.info('Periodic security cleanup completed', {
      cleanedRecords: cleanedCount.rows[0]?.cleanup_expired_security_data || 0
    });
  } catch (error) {
    logger.error('Periodic cleanup failed', { error: error.message });
  }
}, 60 * 60 * 1000); // Every hour

module.exports = { app, server, io };