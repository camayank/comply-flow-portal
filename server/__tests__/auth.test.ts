/**
 * Authentication System Tests
 * Tests for OTP-based and password-based authentication
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { registerAuthRoutes } from '../auth-routes';
import { db } from '../db';
import { users, userSessions, otpStore } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

describe('Authentication System', () => {
  let app: express.Express;
  let testUser: any;
  let testStaffUser: any;

  beforeAll(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    registerAuthRoutes(app);

    // Create test users
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

    [testUser] = await db.insert(users).values({
      username: 'testclient',
      email: 'testclient@example.com',
      password: hashedPassword,
      fullName: 'Test Client',
      role: 'client',
      isActive: true,
    }).returning();

    [testStaffUser] = await db.insert(users).values({
      username: 'teststaff',
      email: 'teststaff@example.com',
      password: hashedPassword,
      fullName: 'Test Staff',
      role: 'admin',
      department: 'admin',
      isActive: true,
    }).returning();
  });

  afterAll(async () => {
    // Cleanup test data
    if (testUser) {
      await db.delete(userSessions).where(eq(userSessions.userId, testUser.id));
      await db.delete(users).where(eq(users.id, testUser.id));
    }
    if (testStaffUser) {
      await db.delete(userSessions).where(eq(userSessions.userId, testStaffUser.id));
      await db.delete(users).where(eq(users.id, testStaffUser.id));
    }
  });

  beforeEach(async () => {
    // Clear OTP store before each test
    await db.delete(otpStore).where(eq(otpStore.email, testUser.email));
  });

  describe('Client OTP Authentication', () => {
    it('should send OTP to valid client email', async () => {
      const response = await request(app)
        .post('/api/auth/client/send-otp')
        .send({ email: testUser.email });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('OTP sent');

      // In test environment, OTP should be returned
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        expect(response.body.otp).toBeDefined();
        expect(response.body.otp).toMatch(/^\d{6}$/);
      }
    });

    it('should reject OTP request for non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/client/send-otp')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not registered');
    });

    it('should reject OTP request for staff user', async () => {
      const response = await request(app)
        .post('/api/auth/client/send-otp')
        .send({ email: testStaffUser.email });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('clients only');
    });

    it('should verify correct OTP and create session', async () => {
      // First send OTP
      const sendResponse = await request(app)
        .post('/api/auth/client/send-otp')
        .send({ email: testUser.email });

      const otp = sendResponse.body.otp;
      expect(otp).toBeDefined();

      // Then verify OTP
      const verifyResponse = await request(app)
        .post('/api/auth/client/verify-otp')
        .send({ email: testUser.email, otp });

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.success).toBe(true);
      expect(verifyResponse.body.user).toBeDefined();
      expect(verifyResponse.body.user.email).toBe(testUser.email);
      expect(verifyResponse.body.sessionToken).toBeDefined();

      // Session should be created
      const sessions = await db.select()
        .from(userSessions)
        .where(eq(userSessions.userId, testUser.id));

      expect(sessions.length).toBeGreaterThan(0);
      expect(sessions[0].isActive).toBe(true);
    });

    it('should reject incorrect OTP', async () => {
      // Send OTP
      await request(app)
        .post('/api/auth/client/send-otp')
        .send({ email: testUser.email });

      // Try with wrong OTP
      const response = await request(app)
        .post('/api/auth/client/verify-otp')
        .send({ email: testUser.email, otp: '000000' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid OTP');
      expect(response.body.remainingAttempts).toBeDefined();
    });

    it('should lock out after 3 failed attempts', async () => {
      // Send OTP
      await request(app)
        .post('/api/auth/client/send-otp')
        .send({ email: testUser.email });

      // Try 3 times with wrong OTP
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/auth/client/verify-otp')
          .send({ email: testUser.email, otp: '000000' });
      }

      // 4th attempt should be locked out
      const response = await request(app)
        .post('/api/auth/client/verify-otp')
        .send({ email: testUser.email, otp: '000000' });

      expect(response.status).toBe(429);
      expect(response.body.error).toContain('Too many failed attempts');
    });
  });

  describe('Staff Password Authentication', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/staff/login')
        .send({
          username: testStaffUser.username,
          password: 'TestPassword123!'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.role).toBe('admin');
      expect(response.body.sessionToken).toBeDefined();
    });

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/staff/login')
        .send({
          username: testStaffUser.username,
          password: 'WrongPassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should reject client users trying staff login', async () => {
      const response = await request(app)
        .post('/api/auth/staff/login')
        .send({
          username: testUser.username,
          password: 'TestPassword123!'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Staff login only');
    });
  });

  describe('Session Management', () => {
    let sessionToken: string;

    beforeEach(async () => {
      // Create a session
      const response = await request(app)
        .post('/api/auth/staff/login')
        .send({
          username: testStaffUser.username,
          password: 'TestPassword123!'
        });

      sessionToken = response.body.sessionToken;
    });

    it('should verify valid session', async () => {
      const response = await request(app)
        .post('/api/auth/verify-session')
        .send({ sessionToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
    });

    it('should logout and invalidate session', async () => {
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .send({ sessionToken });

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body.success).toBe(true);

      // Session should be inactive
      const verifyResponse = await request(app)
        .post('/api/auth/verify-session')
        .send({ sessionToken });

      expect(verifyResponse.status).toBe(401);
    });
  });

  describe('Security Features', () => {
    it('should store OTPs as hashed values', async () => {
      const response = await request(app)
        .post('/api/auth/client/send-otp')
        .send({ email: testUser.email });

      const plainOTP = response.body.otp;

      // Get stored OTP from database
      const [storedOTP] = await db.select()
        .from(otpStore)
        .where(eq(otpStore.email, testUser.email));

      expect(storedOTP).toBeDefined();
      // Stored OTP should be hashed (not equal to plain OTP)
      expect(storedOTP.otp).not.toBe(plainOTP);
      // Should be bcrypt hash format
      expect(storedOTP.otp).toMatch(/^\$2[aby]\$\d{2}\$/);
    });

    it('should create sessions with fingerprints', async () => {
      const response = await request(app)
        .post('/api/auth/staff/login')
        .send({
          username: testStaffUser.username,
          password: 'TestPassword123!'
        });

      const sessionToken = response.body.sessionToken;

      const [session] = await db.select()
        .from(userSessions)
        .where(eq(userSessions.sessionToken, sessionToken));

      expect(session).toBeDefined();
      expect(session.fingerprint).toBeDefined();
      expect(session.csrfToken).toBeDefined();
      expect(session.fingerprint).toMatch(/^[a-f0-9]{64}$/); // SHA256 hash
    });
  });
});
