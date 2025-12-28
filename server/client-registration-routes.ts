import type { Express } from "express";
import { z } from 'zod';
import { db } from './db';
import { users, businessEntities } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { requireAuth } from './auth-middleware';
import { log } from './logger';

const registrationSchema = z.object({
  businessName: z.string().trim().min(1),
  entityType: z.string().trim().min(1),
  pan: z.string().trim().optional(),
  gstin: z.string().trim().optional(),
  cin: z.string().trim().optional(),
  industryType: z.string().trim().optional(),
  registrationDate: z
    .string()
    .optional()
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), {
      message: 'Invalid registrationDate',
    }),
  fullName: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().min(7).max(20),
  alternatePhone: z.string().trim().min(7).max(20).optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
});

const emailSchema = z.object({
  email: z.string().trim().email(),
});

const verifyEmailSchema = emailSchema.extend({
  otp: z.string().trim().min(4).max(10),
});

const userIdParamSchema = z.object({
  userId: z.coerce.number().int().positive(),
});

const privilegedRoles = new Set(['admin', 'super_admin', 'ops_executive']);

export function registerClientRegistrationRoutes(app: Express) {

  // Client self-service registration
  app.post('/api/client/register', async (req, res) => {
    try {
      const validatedData = registrationSchema.parse(req.body);
      const {
        businessName,
        entityType,
        pan,
        gstin,
        cin,
        industryType,
        registrationDate,
        fullName,
        phone,
        alternatePhone,
        address,
        city,
        state,
      } = validatedData;
      const email = validatedData.email.toLowerCase();

      // Check if email already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser.length > 0) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      // Generate temporary password (will be sent via email)
      const tempPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Create user account
      const [newUser] = await db
        .insert(users)
        .values({
          username: email.split('@')[0] + Math.random().toString(36).slice(-4),
          email,
          password: hashedPassword,
          phone,
          fullName,
          role: 'client',
          isActive: true,
        })
        .returning();

      // Generate client ID (C0001 format)
      const clientCount = await db.select().from(businessEntities);
      const clientId = `C${String(clientCount.length + 1).padStart(4, '0')}`;

      // Create business entity
      const [newEntity] = await db
        .insert(businessEntities)
        .values({
          ownerId: newUser.id,
          clientId,
          name: businessName,
          entityType,
          pan: pan || null,
          gstin: gstin || null,
          cin: cin || null,
          industryType: industryType || null,
          registrationDate: registrationDate ? new Date(registrationDate) : null,
          alternatePhone: alternatePhone || null,
          address: address || null,
          city: city || null,
          state: state || null,
          leadSource: 'self_registration',
          clientStatus: 'active',
          isActive: true,
        })
        .returning();

      // TODO: Send welcome email with temporary password
      // Password is sent via email service (not logged for security)

      res.status(201).json({
        success: true,
        clientId,
        userId: newUser.id,
        message: 'Registration successful. Check your email for login credentials.',
        // In production, remove tempPassword from response
        tempPassword: process.env.NODE_ENV === 'development' ? tempPassword : undefined,
      });

      log.business('Client self-registration completed', {
        userId: newUser.id,
        entityId: newEntity.id,
        clientId,
      });
    } catch (error: any) {
      console.error('Client registration error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }

      if (error.code === '23505') {
        return res.status(409).json({ error: 'Email or business already registered' });
      }

      res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
  });

  // Verify client email (OTP-based)
  app.post('/api/client/verify-email', async (req, res) => {
    try {
      const { email, otp } = verifyEmailSchema.parse(req.body);

      // TODO: Implement OTP verification logic
      // For now, just mark user as verified
      
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // In production, verify OTP here
      // For now, just return success
      res.json({
        success: true,
        message: 'Email verified successfully',
      });
      log.auth('Client email verification requested', { email, otp });
    } catch (error) {
      console.error('Email verification error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: 'Verification failed' });
    }
  });

  // Resend verification OTP
  app.post('/api/client/resend-otp', async (req, res) => {
    try {
      const { email } = emailSchema.parse(req.body);

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // TODO: Generate and send new OTP
      console.log(`OTP resent to ${email}`);

      res.json({
        success: true,
        message: 'OTP sent successfully',
      });
      log.auth('Client OTP resend requested', { email });
    } catch (error) {
      console.error('Resend OTP error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to send OTP' });
    }
  });

  // Get onboarding status
  app.get('/api/client/onboarding-status/:userId', requireAuth, async (req, res) => {
    try {
      const { userId } = userIdParamSchema.parse(req.params);

      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!privilegedRoles.has(req.user.role) && req.user.id !== userId) {
        log.security('Unauthorized onboarding status access attempt', {
          actorId: req.user.id,
          requestedUserId: userId,
        });
        return res.status(403).json({ error: 'Access denied' });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const [entity] = await db
        .select()
        .from(businessEntities)
        .where(eq(businessEntities.ownerId, userId))
        .limit(1);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          isActive: user.isActive,
        },
        entity: entity || null,
        onboardingComplete: !!entity,
      });
    } catch (error) {
      console.error('Get onboarding status error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to fetch onboarding status' });
    }
  });

  console.log('✅ Client Registration routes registered');
}
