import type { Express, Request, Response, NextFunction } from "express";

export function registerSecurityMiddleware(app: Express) {

  // Security headers middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Enable browser XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Production-grade Content Security Policy (environment-specific)
    const isDev = process.env.NODE_ENV === 'development';

    const cspDirectives = [
      "default-src 'self'",
      // CRITICAL: Different policies for dev vs production
      isDev
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com http://localhost:*"
        : "script-src 'self' https://js.stripe.com", // NO unsafe-inline/eval in production!
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      isDev
        ? "connect-src 'self' https://api.stripe.com https://api.anthropic.com ws://localhost:* http://localhost:*"
        : "connect-src 'self' https://api.stripe.com https://api.anthropic.com",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "media-src 'self'",
      "worker-src 'self'",
      "child-src 'none'"
    ].join('; ') + (isDev ? '' : '; upgrade-insecure-requests');

    res.setHeader('Content-Security-Policy', cspDirectives);

    // Permissions Policy (formerly Feature Policy)
    res.setHeader('Permissions-Policy',
      'geolocation=(), microphone=(), camera=(), payment=(self)'
    );

    // HSTS (Strict Transport Security) - only in production with HTTPS
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    next();
  });

  // Simple CSRF protection for state-changing operations
  // This checks for a custom header on all POST/PUT/PATCH/DELETE requests
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Skip CSRF check for:
    // - GET/HEAD/OPTIONS requests
    // - Health check endpoints
    // - Webhook endpoints (they have their own signature verification)
    if (
      ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ||
      req.path.startsWith('/health') ||
      req.path.startsWith('/ready') ||
      req.path.startsWith('/live') ||
      req.path.includes('/webhook')
    ) {
      return next();
    }

    // For API requests, check for custom header or valid session
    if (req.path.startsWith('/api/')) {
      const hasCustomHeader = req.headers['x-requested-with'] === 'XMLHttpRequest' ||
                             req.headers['x-csrf-token'];
      const hasValidSession = req.session && req.session.userId;
      
      if (!hasCustomHeader && !hasValidSession) {
        return res.status(403).json({ 
          error: 'CSRF protection: Missing required security headers' 
        });
      }
    }

    next();
  });

  console.log('✅ Security middleware registered');
}
