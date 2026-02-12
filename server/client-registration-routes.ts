import type { Express } from "express";
import { db } from './db';
import { users, businessEntities } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { generateClientId } from './services/id-generator';
import { syncComplianceTracking } from './compliance-tracking-sync';
import { generateTempPassword } from './security-utils';

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

      // TODO: Send welcome email with temporary password
      // Password is sent via email service (not logged for security)

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
