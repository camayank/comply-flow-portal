import type { Express } from "express";
import { db } from './db';
import { users, businessEntities } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { generateClientId } from './services/id-generator';
import { syncComplianceTracking } from './compliance-tracking-sync';
import { generateTempPassword } from './security-utils';
import { otpService } from './services/notifications/otp.service';
import { EmailService } from './services/notifications/channels/email.service';
import { logger } from './logger';

// Create email service instance for client registration
const emailService = new EmailService();

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
        annualTurnover,
        employeeCount,
        fullName,
        email,
        phone,
        alternatePhone,
        contactEmail,
        contactPhone,
        address,
        city,
        state,
        pincode,
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

      // Generate cryptographically secure temporary password (will be sent via email)
      const tempPassword = generateTempPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 12);

      // Create user account
      const [newUser] = await db
        .insert(users)
        .values({
          username: email.split('@')[0] + '_' + Date.now().toString(36),
          email,
          password: hashedPassword,
          phone,
          fullName,
          role: 'client',
          isActive: true,
        })
        .returning();

      // Generate client ID using centralized ID generator
      const clientId = await generateClientId();

      // Create business entity
      const [newEntity] = await db
        .insert(businessEntities)
        .values({
          ownerId: newUser.id,
          clientId,
          name: businessName,
          contactEmail: contactEmail || email,
          contactPhone: contactPhone || phone,
          entityType,
          pan: pan || null,
          gstin: gstin || null,
          cin: cin || null,
          industryType: industryType || null,
          registrationDate: registrationDate ? new Date(registrationDate) : null,
          annualTurnover: annualTurnover ?? null,
          employeeCount: employeeCount ?? null,
          alternatePhone: alternatePhone || null,
          address: address || null,
          city: city || null,
          state: state || null,
          pincode: pincode || null,
          leadSource: 'self_registration',
          clientStatus: 'active',
          isActive: true,
        })
        .returning();

      await db.update(users)
        .set({ businessEntityId: newEntity.id })
        .where(eq(users.id, newUser.id));

      await syncComplianceTracking({ entityIds: [newEntity.id] });

      // Send welcome email with credentials
      const emailTemplate = emailService.getTemplate('welcome', {
        userName: newUser.fullName || newUser.username,
        email: newUser.email,
        tempPassword,
        loginUrl: `${process.env.APP_URL || 'https://digicomply.in'}/login`,
      });

      await emailService.send({
        to: newUser.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      });

      logger.info(`Welcome email sent to ${newUser.email}`);

      // SECURITY: Never send passwords in API responses
      // Password is sent via secure email channel only
      res.status(201).json({
        success: true,
        clientId,
        userId: newUser.id,
        message: 'Registration successful. Check your email for login credentials.',
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

      if (!email || !otp) {
        return res.status(400).json({ error: 'Email and OTP are required' });
      }

      const result = await otpService.verify(email, 'verification', otp);

      if (!result.valid) {
        return res.status(400).json({ error: result.reason });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Mark user as verified (if you have an emailVerified field, update it here)
      logger.info(`Email verified successfully for ${email}`);

      res.json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error: any) {
      logger.error('Email verification error:', error);
      res.status(500).json({ error: 'Verification failed' });
    }
  });

  // Resend verification OTP
  app.post('/api/client/resend-otp', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const result = await otpService.generateAndSend(
        email,
        'verification',
        { userName: user.fullName || undefined }
      );

      if (!result.success) {
        return res.status(429).json({ error: result.error });
      }

      res.json({
        success: true,
        message: 'OTP sent successfully',
        expiresAt: result.expiresAt,
      });
    } catch (error: any) {
      logger.error('Resend OTP error:', error);
      res.status(500).json({ error: 'Failed to send OTP' });
    }
  });

  // Send verification OTP (initial request)
  app.post('/api/client/send-otp', async (req, res) => {
    try {
      const { identifier, purpose = 'verification' } = req.body;

      if (!identifier) {
        return res.status(400).json({ error: 'Identifier (email or phone) is required' });
      }

      const result = await otpService.generateAndSend(
        identifier,
        purpose as any,
        { ipAddress: req.ip, userAgent: req.headers['user-agent'] }
      );

      if (!result.success) {
        return res.status(429).json({ error: result.error });
      }

      res.json({
        success: true,
        message: 'OTP sent successfully',
        expiresAt: result.expiresAt,
      });
    } catch (error: any) {
      logger.error('Send OTP error:', error);
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
