const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Ensure logs directory exists
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Create transports
const transports = [
  // Console transport for all environments
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
    level: process.env.LOG_LEVEL || 'info'
  })
];

// File transports for production and development
if (process.env.NODE_ENV !== 'test') {
  // Error log - only errors
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      format: logFormat,
      maxSize: '20m',
      maxFiles: '14d',
      auditFile: path.join(logsDir, '.error-audit.json')
    })
  );
  
  // Combined log - all levels
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      format: logFormat,
      maxSize: '20m',
      maxFiles: '30d',
      auditFile: path.join(logsDir, '.combined-audit.json')
    })
  );
  
  // Access log - info and above
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'access-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'info',
      format: logFormat,
      maxSize: '20m',
      maxFiles: '7d',
      auditFile: path.join(logsDir, '.access-audit.json')
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'mkw-platform',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports,
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'exceptions.log'),
      format: logFormat
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'rejections.log'),
      format: logFormat
    })
  ],
  exitOnError: false
});

// Add request ID helper
logger.withRequestId = (requestId) => {
  return logger.child({ requestId });
};

// Add user context helper
logger.withUser = (userId, userEmail) => {
  return logger.child({ userId, userEmail });
};

// Security event logger
logger.security = (event, details = {}) => {
  logger.warn('Security Event', {
    event,
    ...details,
    timestamp: new Date().toISOString(),
    category: 'security'
  });
};

// Audit event logger
logger.audit = (action, details = {}) => {
  logger.info('Audit Event', {
    action,
    ...details,
    timestamp: new Date().toISOString(),
    category: 'audit'
  });
};

// Performance logger
logger.performance = (operation, duration, details = {}) => {
  logger.info('Performance Metric', {
    operation,
    duration,
    ...details,
    timestamp: new Date().toISOString(),
    category: 'performance'
  });
};

// Business event logger
logger.business = (event, details = {}) => {
  logger.info('Business Event', {
    event,
    ...details,
    timestamp: new Date().toISOString(),
    category: 'business'
  });
};

// Log startup information
logger.info('Logger initialized', {
  level: process.env.LOG_LEVEL || 'info',
  environment: process.env.NODE_ENV || 'development',
  logsDirectory: logsDir,
  transports: transports.map(t => t.name || t.constructor.name)
});

module.exports = logger;