import { z } from 'zod';

// Environment validation schema
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Server configuration
  PORT: z.string().default('5000'),
  
  // Database (PostgreSQL)
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  PGHOST: z.string().optional(),
  PGPORT: z.string().optional(),
  PGUSER: z.string().optional(),
  PGPASSWORD: z.string().optional(),
  PGDATABASE: z.string().optional(),
  
  // Session secret
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters').optional(),
  
  // Encryption key for credentials (32 bytes base64)
  CREDENTIAL_ENCRYPTION_KEY: z.string().optional(),
  
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

// Validate and parse environment variables
export function validateEnv(): Env {
  try {
    const parsed = envSchema.parse(process.env);
    
    // Production-specific validations
    if (parsed.NODE_ENV === 'production') {
      if (!parsed.SESSION_SECRET || parsed.SESSION_SECRET.length < 32) {
        throw new Error('SESSION_SECRET must be at least 32 characters in production');
      }
      
      if (!parsed.CREDENTIAL_ENCRYPTION_KEY) {
        throw new Error('CREDENTIAL_ENCRYPTION_KEY is required in production');
      }
      
      console.log('✅ Production environment variables validated');
    } else {
      console.log('✅ Development environment variables validated');
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
    
    // In development, continue with warnings
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️  Continuing with invalid environment (development mode)');
      return process.env as Env;
    }
    
    // In production, fail fast
    process.exit(1);
  }
}

// Export validated environment
export const env = validateEnv();
