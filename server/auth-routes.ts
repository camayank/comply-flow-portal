import type { Express, Request } from "express";
import { db } from './db';
import { users, userSessions, otpStore } from '@shared/schema';
import { eq, and, lt } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import * as cron from 'node-cron';
import crypto from 'crypto';
import { emailService } from './email-service';

// Session fingerprinting for hijack detection (Salesforce-level security)
function generateSessionFingerprint(req: Request): string {
  const userAgent = req.headers['user-agent'] || '';
  const ipSubnet = (req.ip || '').split('.').slice(0, 3).join('.'); // Allow IP changes within subnet

  return crypto
    .createHash('sha256')
    .update(userAgent)
    .update(ipSubnet)
    .digest('hex');
}

// Generate CSRF token for session
function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Production-ready PostgreSQL-based OTP storage with hashing (Salesforce-level security)
async function storeOTP(email: string, otp: string, expiresAt: Date): Promise<void> {
  // Delete any existing OTPs for this email
  await db.delete(otpStore).where(eq(otpStore.email, email));

  // Hash OTP before storing (cost factor 12 like Salesforce)
  const hashedOTP = await bcrypt.hash(otp, 12);

  // Insert hashed OTP
  await db.insert(otpStore).values({
    email,
    otp: hashedOTP, // Store hashed version
    expiresAt,
    attempts: 0,
  });
}

async function getOTP(email: string): Promise<{ otp: string; expiresAt: Date; attempts: number } | null> {
  const [result] = await db
    .select()
    .from(otpStore)
    .where(eq(otpStore.email, email))
    .limit(1);
  
  if (!result) return null;
  
  return {
    otp: result.otp,
    expiresAt: result.expiresAt,
    attempts: result.attempts,
  };
}

async function incrementOtpAttempts(email: string): Promise<void> {
  const [record] = await db
    .select()
    .from(otpStore)
    .where(eq(otpStore.email, email))
    .limit(1);
  
  if (record) {
    await db
      .update(otpStore)
      .set({ attempts: Math.min(record.attempts + 1, 3) })
      .where(eq(otpStore.email, email));
  }
}

async function deleteOTP(email: string): Promise<void> {
  await db.delete(otpStore).where(eq(otpStore.email, email));
}

// Cleanup expired OTPs (run periodically)
async function cleanupExpiredOTPs(): Promise<void> {
  await db.delete(otpStore).where(lt(otpStore.expiresAt, new Date()));
}

export async function registerAuthRoutes(app: Express) {

  // CLIENT AUTHENTICATION (OTP-based)
  
  // Send OTP to client email
  app.post('/api/auth/client/send-otp', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Check if user exists
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: 'Email not registered' });
      }

      if (user.role !== 'client') {
        return res.status(403).json({ error: 'This login method is for clients only' });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store hashed OTP
      await storeOTP(email, otp, expiresAt);

      // Send OTP via email
      const emailSent = await emailService.sendOTP({
        email,
        otp,
        expiryMinutes: 10,
        userName: user.fullName || undefined,
      });

      if (!emailSent && process.env.NODE_ENV === 'production') {
        return res.status(500).json({
          success: false,
          error: 'Failed to send OTP. Please try again.',
        });
      }

      // In development, return OTP in response for easy testing
      const otpInResponse = process.env.NODE_ENV === 'development' ? otp : undefined;

      res.json({
        success: true,
        message: 'OTP sent to your email',
        // Only in development mode
        ...(otpInResponse && { otp: otpInResponse }),
      });
    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(500).json({ error: 'Failed to send OTP' });
    }
  });

  // Verify OTP and login
  app.post('/api/auth/client/verify-otp', async (req, res) => {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({ error: 'Email and OTP are required' });
      }

      // Check OTP
      const storedOtp = await getOTP(email);
      
      if (!storedOtp) {
        return res.status(400).json({ error: 'OTP expired or invalid' });
      }

      if (storedOtp.expiresAt < new Date()) {
        await deleteOTP(email);
        return res.status(400).json({ error: 'OTP expired' });
      }

      // Check if too many failed attempts
      if (storedOtp.attempts >= 3) {
        await deleteOTP(email);
        return res.status(429).json({ error: 'Too many failed attempts. Please request a new OTP.' });
      }

      // Verify OTP using constant-time comparison (bcrypt.compare)
      const isOtpValid = await bcrypt.compare(otp, storedOtp.otp);

      if (!isOtpValid) {
        // Increment failed attempts
        await incrementOtpAttempts(email);
        const remainingAttempts = 3 - (storedOtp.attempts + 1);

        if (remainingAttempts <= 0) {
          await deleteOTP(email);
          return res.status(429).json({ error: 'Too many failed attempts. Please request a new OTP.' });
        }

        return res.status(400).json({
          error: 'Invalid OTP',
          remainingAttempts
        });
      }

      // OTP verified, delete from store
      await deleteOTP(email);

      // Get user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Create session with fingerprinting and CSRF protection
      const sessionToken = nanoid(32);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      const fingerprint = generateSessionFingerprint(req);
      const csrfToken = generateCSRFToken();

      await db.insert(userSessions).values({
        userId: user.id,
        sessionToken,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'unknown',
        fingerprint, // Session fingerprinting for hijack detection
        csrfToken, // CSRF protection token
        expiresAt,
        isActive: true,
        lastActivity: new Date(),
      });

      // Update last login
      await db
        .update(users)
        .set({ lastLogin: new Date() })
        .where(eq(users.id, user.id));

      // Set secure session cookie
      res.cookie('sessionToken', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
        sessionToken,
      });
    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(500).json({ error: 'Failed to verify OTP' });
    }
  });

  // STAFF AUTHENTICATION (Username/Password)
  
  // Staff login
  app.post('/api/auth/staff/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      // Get user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if staff member (not client)
      if (user.role === 'client') {
        return res.status(403).json({ error: 'Staff login only. Clients should use OTP login.' });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({ error: 'Account is deactivated. Contact administrator.' });
      }

      // Create session with fingerprinting and CSRF protection
      const sessionToken = nanoid(32);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      const fingerprint = generateSessionFingerprint(req);
      const csrfToken = generateCSRFToken();

      await db.insert(userSessions).values({
        userId: user.id,
        sessionToken,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'unknown',
        fingerprint, // Session fingerprinting for hijack detection
        csrfToken, // CSRF protection token
        expiresAt,
        isActive: true,
        lastActivity: new Date(),
      });

      // Update last login
      await db
        .update(users)
        .set({ lastLogin: new Date() })
        .where(eq(users.id, user.id));

      // Set secure session cookie
      res.cookie('sessionToken', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          department: user.department,
        },
        sessionToken,
      });
    } catch (error) {
      console.error('Staff login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Get current authenticated user (for frontend useAuth hook)
  app.get('/api/auth/me', async (req, res) => {
    try {
      const sessionToken = req.cookies?.sessionToken;

      if (!sessionToken) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const [session] = await db
        .select()
        .from(userSessions)
        .where(eq(userSessions.sessionToken, sessionToken))
        .limit(1);

      if (!session || !session.isActive) {
        return res.status(401).json({ error: 'Invalid or expired session' });
      }

      if (session.expiresAt < new Date()) {
        await db
          .update(userSessions)
          .set({ isActive: false })
          .where(eq(userSessions.id, session.id));

        return res.status(401).json({ error: 'Session expired' });
      }

      // Get user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);

      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'User not found or inactive' });
      }

      // Update last activity
      await db
        .update(userSessions)
        .set({ lastActivity: new Date() })
        .where(eq(userSessions.id, session.id));

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        department: user.department,
        isActive: user.isActive,
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  // Logout (both client and staff)
  app.post('/api/auth/logout', async (req, res) => {
    try {
      const sessionToken = req.cookies?.sessionToken || req.body?.sessionToken;

      if (!sessionToken) {
        return res.status(400).json({ error: 'Session token required' });
      }

      // Deactivate session
      await db
        .update(userSessions)
        .set({ isActive: false })
        .where(eq(userSessions.sessionToken, sessionToken));

      // Clear session cookie
      res.clearCookie('sessionToken');

      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  });

  // Verify session
  app.post('/api/auth/verify-session', async (req, res) => {
    try {
      const { sessionToken } = req.body;

      if (!sessionToken) {
        return res.status(400).json({ error: 'Session token required' });
      }

      const [session] = await db
        .select()
        .from(userSessions)
        .where(eq(userSessions.sessionToken, sessionToken))
        .limit(1);

      if (!session || !session.isActive) {
        return res.status(401).json({ error: 'Invalid session' });
      }

      if (session.expiresAt < new Date()) {
        await db
          .update(userSessions)
          .set({ isActive: false })
          .where(eq(userSessions.id, session.id));
        
        return res.status(401).json({ error: 'Session expired' });
      }

      // Get user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);

      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'User not found or inactive' });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          department: user.department,
        },
      });
    } catch (error) {
      console.error('Verify session error:', error);
      res.status(500).json({ error: 'Session verification failed' });
    }
  });

  // Change password (for staff)
  app.post('/api/auth/change-password', async (req, res) => {
    try {
      const { sessionToken, currentPassword, newPassword } = req.body;

      if (!sessionToken || !currentPassword || !newPassword) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      // Verify session
      const [session] = await db
        .select()
        .from(userSessions)
        .where(eq(userSessions.sessionToken, sessionToken))
        .limit(1);

      if (!session || !session.isActive) {
        return res.status(401).json({ error: 'Invalid session' });
      }

      // Get user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, user.id));

      res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Failed to change password' });
    }
  });

  // Schedule OTP cleanup job (runs every hour) using JobLifecycleManager
  const { jobManager } = await import('./job-lifecycle-manager.js');

  const otpCleanupJob = cron.schedule('0 * * * *', async () => {
    try {
      await cleanupExpiredOTPs();
      console.log('🧹 Cleaned up expired OTPs');
    } catch (error) {
      console.error('OTP cleanup error:', error);
    }
  }, {
    scheduled: false // Don't start automatically
  });

  jobManager.registerCron(
    'otp-cleanup',
    otpCleanupJob,
    'Hourly OTP cleanup - removes expired OTP entries'
  );

  otpCleanupJob.start();

  console.log('✅ Authentication routes registered (Client OTP + Staff Password)');
  console.log('⏰ Scheduled OTP cleanup job (runs hourly) - managed by JobLifecycleManager');
}
