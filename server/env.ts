import { z } from 'zod';

// Environment validation schema
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Server configuration
  PORT: z.string().default('5000'),
  ALLOWED_ORIGINS: z.string().optional(), // Comma-separated list for production CORS
  
  // Database (PostgreSQL)
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  PGHOST: z.string().optional(),
  PGPORT: z.string().optional(),
  PGUSER: z.string().optional(),
  PGPASSWORD: z.string().optional(),
  PGDATABASE: z.string().optional(),
  
  // Session secret (REQUIRED in production, minimum 32 characters)
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),

  // Encryption key for credentials (REQUIRED in production, minimum 32 characters)
  CREDENTIAL_ENCRYPTION_KEY: z.string().min(32, 'CREDENTIAL_ENCRYPTION_KEY must be at least 32 characters'),

  // JWT secret for tokens (REQUIRED, minimum 32 characters)
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').optional(),
  
  // Object storage
  DEFAULT_OBJECT_STORAGE_BUCKET_ID: z.string().optional(),
  PUBLIC_OBJECT_SEARCH_PATHS: z.string().optional(),
  PRIVATE_OBJECT_DIR: z.string().optional(),
  
  // Google Cloud Storage
  GCS_BUCKET_NAME: z.string().optional(),
  GCS_PROJECT_ID: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  
  // Payment gateway (Stripe)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  
  // Twilio (WhatsApp)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  
  // AI/Anthropic
  ANTHROPIC_API_KEY: z.string().optional(),
  
  // Google Sheets API
  GOOGLE_SHEETS_CLIENT_EMAIL: z.string().optional(),
  GOOGLE_SHEETS_PRIVATE_KEY: z.string().optional(),
  
  // Replit-specific
  REPL_ID: z.string().optional(),
  REPL_SLUG: z.string().optional(),
  REPLIT_DOMAINS: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

// Validate and parse environment variables (Fail-fast in production)
export function validateEnv(): Env {
  const isProduction = process.env.NODE_ENV === 'production';

  try {
    const parsed = envSchema.parse(process.env);

    // Strict production validations (Salesforce-level security)
    if (isProduction) {
      const criticalSecrets = [
        { name: 'SESSION_SECRET', value: parsed.SESSION_SECRET, minLength: 32 },
        { name: 'CREDENTIAL_ENCRYPTION_KEY', value: parsed.CREDENTIAL_ENCRYPTION_KEY, minLength: 32 },
      ];

      const missingOrWeak = criticalSecrets.filter(
        secret => !secret.value || secret.value.length < secret.minLength
      );

      if (missingOrWeak.length > 0) {
        console.error('❌ CRITICAL SECURITY ERROR: Missing or weak secrets in production:');
        missingOrWeak.forEach(secret => {
          console.error(`  - ${secret.name}: ${!secret.value ? 'MISSING' : `Too short (${secret.value.length} < ${secret.minLength})`}`);
        });
        console.error('\n🛑 Server startup BLOCKED for security reasons.');
        console.error('Generate strong secrets (32+ characters) and set them in your environment.');
        throw new Error('Critical security validation failed');
      }

      console.log('✅ Production environment validated - All security requirements met');
    } else {
      console.log('✅ Development environment validated');

      // Warnings for missing development secrets
      if (!parsed.SESSION_SECRET || parsed.SESSION_SECRET.length < 32) {
        console.warn('⚠️  SESSION_SECRET missing or weak (will be required in production)');
      }
      if (!parsed.CREDENTIAL_ENCRYPTION_KEY || parsed.CREDENTIAL_ENCRYPTION_KEY.length < 32) {
        console.warn('⚠️  CREDENTIAL_ENCRYPTION_KEY missing or weak (will be required in production)');
      }
    }

    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    } else {
      console.error('❌ Environment validation error:', error);
    }

    // In production: FAIL FAST - Never start with invalid configuration
    if (isProduction) {
      console.error('\n🛑 PRODUCTION STARTUP BLOCKED - Fix environment configuration and restart');
      process.exit(1);
    }

    // In development: Warn but continue (with caveats)
    console.warn('⚠️  DEVELOPMENT MODE: Continuing with invalid environment');
    console.warn('⚠️  Some features may not work correctly!');
    return process.env as Env;
  }
}

// Export validated environment
export const env = validateEnv();
