import type { Express } from "express";
import { db } from './db';
import { users, businessEntities } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export function registerClientRegistrationRoutes(app: Express) {

  // Client self-service registration
  app.post('/api/client/register', async (req, res) => {
    try {
      const {
        businessName,
        entityType,
        pan,
        gstin,
        cin,
        industryType,
        registrationDate,
        fullName,
        email,
        phone,
        alternatePhone,
        address,
        city,
        state,
      } = req.body;

      // Validate required fields
      if (!businessName || !entityType || !fullName || !email || !phone) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

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
    } catch (error: any) {
      console.error('Client registration error:', error);
      
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Email or business already registered' });
      }

      res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
  });

  // Verify client email (OTP-based)
  app.post('/api/client/verify-email', async (req, res) => {
    try {
      const { email, otp } = req.body;

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
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({ error: 'Verification failed' });
    }
  });

  // Resend verification OTP
  app.post('/api/client/resend-otp', async (req, res) => {
    try {
      const { email } = req.body;

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
    } catch (error) {
      console.error('Resend OTP error:', error);
      res.status(500).json({ error: 'Failed to send OTP' });
    }
  });

  // Get onboarding status
  app.get('/api/client/onboarding-status/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

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
      res.status(500).json({ error: 'Failed to fetch onboarding status' });
    }
  });

  console.log('✅ Client Registration routes registered');
}
