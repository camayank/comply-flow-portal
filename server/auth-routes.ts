import type { Express } from "express";
import { db } from './db';
import { users, userSessions } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';

// OTP storage (in production, use Redis or database)
// WARNING: In-memory Map is NOT production-ready and will lose OTPs on server restart
// For production, implement Redis/database storage with proper expiration
const otpStore = new Map<string, { otp: string; expiresAt: Date }>();

// Production-ready OTP storage function (placeholder for future implementation)
async function storeOTP(email: string, otp: string, expiresAt: Date): Promise<void> {
  // TODO: Replace with Redis/database implementation
  // Example with Redis: await redis.setex(`otp:${email}`, 600, JSON.stringify({ otp, expiresAt }))
  otpStore.set(email, { otp, expiresAt });
}

async function getOTP(email: string): Promise<{ otp: string; expiresAt: Date } | null> {
  // TODO: Replace with Redis/database implementation
  // Example with Redis: const data = await redis.get(`otp:${email}`)
  return otpStore.get(email) || null;
}

async function deleteOTP(email: string): Promise<void> {
  // TODO: Replace with Redis/database implementation
  // Example with Redis: await redis.del(`otp:${email}`)
  otpStore.delete(email);
}

export function registerAuthRoutes(app: Express) {

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

      // Store OTP
      await storeOTP(email, otp, expiresAt);

      // TODO: Send OTP via email
      console.log(`🔐 OTP for ${email}: ${otp}`);
      
      // In development, return OTP in response
      const otpInResponse = process.env.NODE_ENV === 'development' ? otp : undefined;

      res.json({
        success: true,
        message: 'OTP sent to your email',
        // Only in development
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

      if (storedOtp.otp !== otp) {
        return res.status(400).json({ error: 'Invalid OTP' });
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

      // Create session
      const sessionToken = nanoid(32);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await db.insert(userSessions).values({
        userId: user.id,
        sessionToken,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'unknown',
        expiresAt,
        isActive: true,
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

      // Create session
      const sessionToken = nanoid(32);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await db.insert(userSessions).values({
        userId: user.id,
        sessionToken,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'unknown',
        expiresAt,
        isActive: true,
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

  // Logout (both client and staff)
  app.post('/api/auth/logout', async (req, res) => {
    try {
      const { sessionToken } = req.body;

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

  console.log('✅ Authentication routes registered (Client OTP + Staff Password)');
}
