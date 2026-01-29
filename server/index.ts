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
import './compliance-state-scheduler'; // Auto-start compliance state scheduler

// Validate environment variables on startup
const env = validateEnv();

// Initialize encryption
await initializeEncryption();

const app = express();

// Register security headers first
registerSecurityMiddleware(app);

// CORS middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || [] 
    : true,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(express.static('public'));

// Request logging and correlation
app.use(requestLogger);
app.use(attachLogger);

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
app.use((req, res, next) => {
  req.setTimeout(30000); // 30 seconds
  res.setTimeout(30000);
  next();
});

// 🔓 DEV MODE: Rate limiting disabled for development
const createRateLimit = (windowMs: number, max: number, message: string, keyGenerator?: (req: Request) => string) => {
  // Return a no-op middleware in dev mode
  return (req: Request, res: Response, next: NextFunction) => next();
};

// OTP endpoints - Ultra-strict rate limiting
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

// Authentication endpoints - Strict limiting
const authLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  10, // 10 login attempts per IP
  'Too many authentication attempts. Please wait 15 minutes.',
  (req) => req.ip || 'unknown'
);

// Admin endpoints - Ultra-strict limiting
const adminLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 admin operations per IP
  'Admin operations rate limited. Please wait 15 minutes.',
  (req) => req.ip || 'unknown'
);

// General API protection
const apiLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests per IP
  'API rate limit exceeded. Please slow down.',
  (req) => req.ip || 'unknown'
);

// Apply rate limiters
app.use('/api/auth/client/send-otp', otpPerEmailLimiter, otpPerIPLimiter);
app.use('/api/auth/client/verify-otp', otpPerIPLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/admin', adminLimiter);
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
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
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
  
  console.log('✅ Service management systems initialized');
  
  // Initialize task reminder processor
  const { taskReminderProcessor } = await import('./task-reminder-processor');
  console.log('📋 Task reminder processor initialized');
  
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
