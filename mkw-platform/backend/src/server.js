require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Import utilities and middleware
const logger = require('./utils/logger');
const db = require('./database/connection');
const { sessionManager } = require('./middleware/sessionAuth');

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const servicesRoutes = require('./routes/services');
const filesRoutes = require('./routes/files');

const app = express();
const server = createServer(app);

// Initialize Socket.IO for real-time features
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Environment validation
const requiredEnvVars = [
  'JWT_SECRET',
  'SESSION_SECRET',
  'CREDENTIAL_ENCRYPTION_KEY',
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  logger.error('Missing required environment variables', {
    missing: missingEnvVars
  });
  process.exit(1);
}

// Validate secret lengths
if (process.env.JWT_SECRET.length < 32) {
  logger.error('JWT_SECRET must be at least 32 characters long');
  process.exit(1);
}

if (process.env.SESSION_SECRET.length < 32) {
  logger.error('SESSION_SECRET must be at least 32 characters long');
  process.exit(1);
}

if (process.env.CREDENTIAL_ENCRYPTION_KEY.length < 32) {
  logger.error('CREDENTIAL_ENCRYPTION_KEY must be at least 32 characters long');
  process.exit(1);
}

// Trust proxy for accurate IP addresses behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"]
    }
  } : false, // Disable CSP in development for hot reloading
  crossOriginEmbedderPolicy: false // Allow embedding for development
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
      .split(',')
      .map(origin => origin.trim());
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS origin rejected', { origin, allowedOrigins });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
};

app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser(process.env.SESSION_SECRET));

// Request ID middleware for tracing
app.use((req, res, next) => {
  req.id = Math.random().toString(36).substring(2) + Date.now().toString(36);
  res.set('X-Request-ID', req.id);
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Skip health check logs to reduce noise
    if (req.path === '/health' && res.statusCode === 200) {
      return;
    }
    
    const logLevel = res.statusCode >= 500 ? 'error' : 
                    res.statusCode >= 400 ? 'warn' : 'info';
    
    logger.log(logLevel, 'HTTP Request', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      userId: req.user?.id
    });
  });
  
  next();
});

// Global rate limiting
const globalRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});

app.use(globalRateLimit);

// Health check endpoint (no authentication required)
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await db.raw('SELECT 1');
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV,
      uptime: Math.floor(process.uptime()),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      },
      database: 'connected'
    };
    
    res.json(health);
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/files', filesRoutes);

// API Documentation (Swagger) - only in development and staging
if (process.env.NODE_ENV !== 'production' && process.env.API_DOCS_ENABLED !== 'false') {
  const swaggerJsdoc = require('swagger-jsdoc');
  const swaggerUi = require('swagger-ui-express');
  
  const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'MKW Platform API',
        version: process.env.npm_package_version || '1.0.0',
        description: 'Complete business management platform API for MKW Advisors',
        contact: {
          name: 'MKW Advisors',
          email: 'tech@mkwadvisors.com'
        }
      },
      servers: [
        {
          url: process.env.NODE_ENV === 'development' ? 
            `http://localhost:${process.env.PORT || 5000}` :
            'https://api.mkwadvisors.com',
          description: process.env.NODE_ENV === 'development' ? 'Development server' : 'Production server'
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          },
          sessionAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'mkw.sid'
          }
        }
      },
      security: [
        { bearerAuth: [] },
        { sessionAuth: [] }
      ]
    },
    apis: ['./src/routes/*.js', './src/routes/**/*.js']
  };
  
  const swaggerSpec = swaggerJsdoc(swaggerOptions);
  
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customSiteTitle: 'MKW Platform API Documentation',
    customCss: '.swagger-ui .topbar { display: none }'
  }));
  
  // Serve raw OpenAPI spec
  app.get('/api/docs/openapi.json', (req, res) => {
    res.json(swaggerSpec);
  });
  
  logger.info('API documentation enabled', {
    path: '/api/docs',
    environment: process.env.NODE_ENV
  });
}

// Socket.IO authentication middleware
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
    
    // Get user details
    const user = await db('system_users')
      .leftJoin('roles', 'system_users.role_id', 'roles.id')
      .select(
        'system_users.*',
        'roles.name as role_name'
      )
      .where('system_users.id', validation.session.userId)
      .where('system_users.status', 'active')
      .first();
    
    if (!user) {
      return next(new Error('User not found'));
    }
    
    socket.user = user;
    socket.sessionId = sessionId;
    
    next();
  } catch (error) {
    logger.error('Socket.IO authentication error', {
      error: error.message,
      socketId: socket.id
    });
    
    next(new Error('Authentication failed'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info('Socket.IO connection established', {
    socketId: socket.id,
    userId: socket.user.id,
    userRole: socket.user.role_name
  });
  
  // Join user-specific room
  socket.join(`user:${socket.user.id}`);
  
  // Join role-specific room
  socket.join(`role:${socket.user.role_name}`);
  
  // Handle service request updates
  socket.on('subscribe:service_request', (requestId) => {
    // Verify user has access to this service request
    db('service_requests')
      .where('id', requestId)
      .where(function() {
        this.where('assigned_to', socket.user.id)
            .orWhere('client_email', socket.user.email);
        
        // Admins can access all requests
        if (['super_admin', 'admin', 'operations_manager'].includes(socket.user.role_name)) {
          this.orWhere(db.raw('1 = 1'));
        }
      })
      .first()
      .then(request => {
        if (request) {
          socket.join(`service_request:${requestId}`);
          logger.debug('User subscribed to service request updates', {
            userId: socket.user.id,
            requestId,
            socketId: socket.id
          });
        } else {
          socket.emit('error', { message: 'Access denied to service request' });
        }
      })
      .catch(error => {
        logger.error('Service request subscription error', {
          error: error.message,
          userId: socket.user.id,
          requestId
        });
        socket.emit('error', { message: 'Subscription failed' });
      });
  });
  
  socket.on('unsubscribe:service_request', (requestId) => {
    socket.leave(`service_request:${requestId}`);
  });
  
  socket.on('disconnect', (reason) => {
    logger.info('Socket.IO connection closed', {
      socketId: socket.id,
      userId: socket.user.id,
      reason
    });
  });
});

// Global error handler for Socket.IO
io.engine.on('connection_error', (err) => {
  logger.error('Socket.IO connection error', {
    error: err.message,
    code: err.code,
    context: err.context
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  logger.warn('API endpoint not found', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use((error, req, res, next) => {
  // Handle CORS errors
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      error: 'CORS policy violation'
    });
  }
  
  // Handle multer errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File too large'
    });
  }
  
  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
  
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired'
    });
  }
  
  // Handle database errors
  if (error.code === '23505') { // PostgreSQL unique violation
    return res.status(400).json({
      success: false,
      error: 'Duplicate entry'
    });
  }
  
  if (error.code === '23503') { // PostgreSQL foreign key violation
    return res.status(400).json({
      success: false,
      error: 'Invalid reference'
    });
  }
  
  // Log unexpected errors
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    requestId: req.id,
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    ip: req.ip
  });
  
  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    success: false,
    error: isDevelopment ? error.message : 'Internal server error',
    ...(isDevelopment && { stack: error.stack, requestId: req.id })
  });
});

// Schedule cleanup tasks
setInterval(async () => {
  try {
    // Clean up expired sessions
    await sessionManager.cleanupExpiredSessions();
    
    // Clean up old audit logs (keep 90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const deletedLogs = await db('audit_logs')
      .where('created_at', '<', ninetyDaysAgo)
      .del();
    
    if (deletedLogs > 0) {
      logger.info('Cleaned up old audit logs', { count: deletedLogs });
    }
    
  } catch (error) {
    logger.error('Cleanup task failed', {
      error: error.message
    });
  }
}, 60 * 60 * 1000); // Run every hour

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  // Close server
  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      // Close database connections
      await db.destroy();
      logger.info('Database connections closed');
      
      // Close Socket.IO
      io.close(() => {
        logger.info('Socket.IO server closed');
      });
      
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', {
        error: error.message
      });
      process.exit(1);
    }
  });
  
  // Force close after timeout
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Listen for shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined
  });
  
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  logger.info('MKW Platform Backend started successfully', {
    port: PORT,
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    nodeVersion: process.version,
    database: {
      host: process.env.DB_HOST,
      name: process.env.DB_NAME
    },
    features: {
      apiDocs: process.env.NODE_ENV !== 'production' && process.env.API_DOCS_ENABLED !== 'false',
      socketIO: true,
      fileStorage: process.env.STORAGE_PROVIDER || 'local',
      emailService: !!(process.env.SMTP_HOST && process.env.SMTP_USER)
    }
  });
});

// Export for testing
module.exports = { app, server, io };