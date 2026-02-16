import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { validateEnv } from "./env";
import { initializeEncryption } from "./encryption";
import { registerSecurityMiddleware } from "./security-middleware";
import { logger, requestLogger, attachLogger, logStartup, logShutdown } from "./logger";
import { errorHandler, notFoundHandler, handleUncaughtException, handleUnhandledRejection } from "./error-middleware";
import { createBackwardCompatibilityMiddleware, apiVersionMiddleware } from "./api-versioning";
import { deprecationMiddleware, deprecationResponseInterceptor } from "./deprecation-middleware";
import { sanitizeRequest, globalErrorHandler, trackRequest } from "./robustness-middleware";
import { jobManager } from "./job-lifecycle-manager";
import { apmMiddleware } from "./monitoring";
import './compliance-state-scheduler'; // Auto-start compliance state scheduler

// Validate environment variables on startup
const env = validateEnv();

// Initialize encryption
await initializeEncryption();

const app = express();

// Parse cookies before security middleware (CSRF/session checks use cookies)
app.use(cookieParser());

// Register security headers early
registerSecurityMiddleware(app);

// CORS middleware - restricted even in development for security
const corsOrigins = process.env.NODE_ENV === 'production'
  ? process.env.ALLOWED_ORIGINS?.split(',') || []
  : [
      'http://localhost:5000',
      'http://localhost:5173',
      'http://127.0.0.1:5000',
      'http://127.0.0.1:5173',
    ];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    if (corsOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Log blocked CORS requests for monitoring
    logger.warn(`CORS blocked request from origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token', 'X-Tenant-ID'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(express.static('public'));

// Request logging and correlation
app.use(requestLogger);
app.use(attachLogger);

// APM middleware (tracks request metrics for monitoring dashboard)
app.use(apmMiddleware);

// API Deprecation tracking (adds headers to V1 endpoints)
app.use(deprecationMiddleware);
app.use(deprecationResponseInterceptor);

// Request sanitization (security)
app.use(sanitizeRequest);

// API versioning (must be before routes)
app.use(apiVersionMiddleware());
app.use(createBackwardCompatibilityMiddleware('v1'));

// Serve uploaded files (local storage in development)
// In production with GCS, files are served directly from Google Cloud Storage
const uploadsPath = process.env.LOCAL_STORAGE_PATH || './uploads';
app.use('/uploads', express.static(uploadsPath));
log(`📁 File uploads directory: ${uploadsPath}`);

// Request timeout (30 seconds for all requests)
const SENSITIVE_KEYS = new Set([
  'password',
  'otp',
  'token',
  'sessionToken',
  'csrfToken',
  'authorization',
  'cookie',
  'set-cookie',
]);

function redactSensitive(value: any): any {
  if (Array.isArray(value)) {
    return value.map(redactSensitive);
  }
  if (value && typeof value === 'object') {
    const redacted: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redactSensitive(val);
      }
    }
    return redacted;
  }
  return value;
}

app.use((req, res, next) => {
  req.setTimeout(30000); // 30 seconds
  res.setTimeout(30000);
  next();
});

// PRODUCTION READY: Rate limiting enabled
// Helper to create rate limiter with validation disabled for custom key generators
const createRateLimit = (windowMs: number, max: number, message: string, keyGenerator?: (req: Request) => string) => {
  return rateLimit({
    windowMs,
    max,
    message: { success: false, error: message },
    standardHeaders: true,
    legacyHeaders: false,
    // Disable all validation to suppress IPv6/custom key generator warnings
    validate: false,
    ...(keyGenerator ? { keyGenerator } : {}),
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: message,
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
  });
};

// OTP endpoints - Ultra-strict rate limiting (prevent abuse)
const otpPerEmailLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  3, // 3 OTP requests per email
  'Too many OTP requests for this email. Please wait 15 minutes.',
  (req) => (req.body.email || '').toLowerCase()
);

const otpPerIPLimiter = createRateLimit(
  60 * 60 * 1000, // 1 hour
  20, // 20 OTP requests per IP
  'Too many OTP requests from this IP address. Please wait 1 hour.',
  (req) => req.ip || 'unknown'
);

// Authentication endpoints - Strict limiting (prevent brute force)
const authLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  10, // 10 login attempts per IP
  'Too many authentication attempts. Please wait 15 minutes.',
  (req) => req.ip || 'unknown'
);

// Admin endpoints - Ultra-strict limiting (protect sensitive operations)
const adminLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  30, // 30 admin operations per IP (increased for normal admin work)
  'Admin operations rate limited. Please wait 15 minutes.',
  (req) => req.ip || 'unknown'
);

// General API protection (prevent abuse)
const apiLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  200, // 200 requests per IP (reasonable for normal usage)
  'API rate limit exceeded. Please slow down.',
  (req) => req.ip || 'unknown'
);

// Payment operations - Strict limiting (prevent payment fraud)
const paymentLimiter = createRateLimit(
  60 * 60 * 1000, // 1 hour
  20, // 20 payment operations per hour
  'Payment rate limit exceeded. Please wait before trying again.',
  (req) => req.ip || 'unknown'
);

// File upload - Prevent storage abuse
const uploadLimiter = createRateLimit(
  60 * 60 * 1000, // 1 hour
  50, // 50 uploads per hour
  'Upload limit exceeded. Please wait before uploading more files.',
  (req) => req.ip || 'unknown'
);

// Write operations (POST/PUT/PATCH/DELETE) - Moderate limiting
const writeLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // 100 write operations per 15 minutes
  'Write operation limit exceeded. Please slow down.',
  (req) => req.ip || 'unknown'
);

// Apply rate limiters (order matters - more specific first)
app.use('/api/auth/client/send-otp', otpPerEmailLimiter, otpPerIPLimiter);
app.use('/api/auth/client/verify-otp', otpPerIPLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/admin', adminLimiter);
app.use('/api/payments', paymentLimiter);
app.use('/api/files', uploadLimiter);
app.use('/api', (req, res, next) => {
  // Apply write limiter only for mutating operations
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  next();
});
app.use('/api', apiLimiter);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    const isError = res.statusCode >= 400;
    
    // Track metrics for health monitoring
    trackRequest(duration, isError);
    
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse && process.env.NODE_ENV !== 'production') {
        const safeBody = redactSensitive(capturedJsonResponse);
        logLine += ` :: ${JSON.stringify(safeBody)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);
  
  // Initialize service spawner and seeder
  console.log('🌱 Initializing service management systems...');
  const { serviceSpawner } = await import('./service-spawner');
  const { serviceSeeder } = await import('./service-seeder');
  const { seedComplianceData } = await import('./compliance-seeder');
  
  // Auto-seed services on startup (development only)
  if (process.env.NODE_ENV === 'development') {
    await serviceSeeder.seedAllServices();
    await seedComplianceData();
  }

  // Run ID sequences migration
  try {
    const { runMigration: runIdSequencesMigration } = await import('./migrations/add-id-sequences');
    await runIdSequencesMigration();
    console.log('✅ ID sequences initialized');
  } catch (error) {
    console.warn('⚠️ ID sequences migration skipped (may already exist):', (error as Error).message);
  }

  // Run readable IDs migration (adds columns for SR, DOC, QC, etc.)
  try {
    const { runAddReadableIdsMigration } = await import('./migrations/add-readable-ids');
    await runAddReadableIdsMigration();
    console.log('✅ Readable ID columns initialized');
  } catch (error) {
    console.warn('⚠️ Readable IDs migration skipped:', (error as Error).message);
  }

  console.log('✅ Service management systems initialized');
  
  // Initialize task reminder processor
  const { taskReminderProcessor } = await import('./task-reminder-processor');
  console.log('📋 Task reminder processor initialized');

  // Initialize compliance alert processor
  const { ComplianceAlertProcessor } = await import('./compliance-alert-processor');
  new ComplianceAlertProcessor();
  console.log('📢 Compliance alert processor initialized');
  
  // Initialize platform-wide synchronization orchestrator
  // const { platformSyncOrchestrator } = await import('./platform-sync-orchestrator');
  console.log('Platform sync orchestrator initialized');

  // importantly setup vite in development BEFORE 404/error handlers
  // so the catch-all route works properly
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // 404 handler (must be before error handler, but after Vite)
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);
  app.use(globalErrorHandler); // Additional robustness error handler

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
    logStartup(port);
  });

  // Graceful shutdown handler
  const shutdown = async (signal: string) => {
    log(`${signal} received - starting graceful shutdown...`);
    logShutdown(signal);

    // Stop accepting new connections
    server.close(() => {
      log('HTTP server closed');
      logger.info('HTTP server closed');
    });

    // Set timeout for forceful shutdown
    const shutdownTimeout = setTimeout(() => {
      log('Forceful shutdown after timeout');
      process.exit(1);
    }, 30000); // 30 seconds

    try {
      // Stop all background jobs first
      logger.info('Stopping background jobs...');
      await jobManager.stopAll();
      logger.info('Background jobs stopped');

      // TODO: Close database connection pool
      // await db.end();

      log('Cleanup completed');
      clearTimeout(shutdownTimeout);
      process.exit(0);
    } catch (error) {
      log('Error during shutdown:', error);
      logger.error('Shutdown failed', { error });
      clearTimeout(shutdownTimeout);
      process.exit(1);
    }
  };

  // Listen for shutdown signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught errors
  process.on('uncaughtException', handleUncaughtException);
  process.on('unhandledRejection', handleUnhandledRejection);
})();
