/**
 * User Provisioning Service Tests
 * Tests for user creation, bulk provisioning, deprovisioning, and role management
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import adminRoutes from '../routes/admin';
import { db } from '../db';
import { users, userSessions } from '@shared/schema';
import { eq, like } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

describe('User Provisioning Service', () => {
  let app: express.Express;
  let superAdminUser: any;
  let adminUser: any;
  let superAdminSessionToken: string;
  let adminSessionToken: string;
  const createdUserIds: number[] = [];

  beforeAll(async () => {
    // Setup Express app with session
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    app.use(session({
      secret: process.env.SESSION_SECRET || 'test-secret',
      resave: false,
      saveUninitialized: false,
    }));

    // Mock session authentication middleware
    app.use((req: any, res, next) => {
      const token = req.headers['x-session-token'] as string;
      if (token === superAdminSessionToken && superAdminUser) {
        req.user = superAdminUser;
        req.isAuthenticated = () => true;
      } else if (token === adminSessionToken && adminUser) {
        req.user = adminUser;
        req.isAuthenticated = () => true;
      } else {
        req.isAuthenticated = () => false;
      }
      next();
    });

    app.use('/api/v1/admin', adminRoutes);

    // Create test users
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

    [superAdminUser] = await db.insert(users).values({
      username: 'testsuperadmin_prov',
      email: 'testsuperadmin_prov@example.com',
      password: hashedPassword,
      fullName: 'Test Super Admin Provisioning',
      role: 'super_admin',
      department: 'admin',
      isActive: true,
    }).returning();

    [adminUser] = await db.insert(users).values({
      username: 'testadmin_prov',
      email: 'testadmin_prov@example.com',
      password: hashedPassword,
      fullName: 'Test Admin Provisioning',
      role: 'admin',
      department: 'admin',
      isActive: true,
    }).returning();

    // Create sessions
    superAdminSessionToken = crypto.randomBytes(32).toString('hex');
    adminSessionToken = crypto.randomBytes(32).toString('hex');

    await db.insert(userSessions).values({
      userId: superAdminUser.id,
      sessionToken: superAdminSessionToken,
      fingerprint: crypto.createHash('sha256').update('test').digest('hex'),
      csrfToken: crypto.randomBytes(16).toString('hex'),
      isActive: true,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await db.insert(userSessions).values({
      userId: adminUser.id,
      sessionToken: adminSessionToken,
      fingerprint: crypto.createHash('sha256').update('test').digest('hex'),
      csrfToken: crypto.randomBytes(16).toString('hex'),
      isActive: true,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
  });

  afterAll(async () => {
    // Cleanup created users
    for (const userId of createdUserIds) {
      await db.delete(userSessions).where(eq(userSessions.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
    }

    // Cleanup test admin users
    if (superAdminUser) {
      await db.delete(userSessions).where(eq(userSessions.userId, superAdminUser.id));
      await db.delete(users).where(eq(users.id, superAdminUser.id));
    }
    if (adminUser) {
      await db.delete(userSessions).where(eq(userSessions.userId, adminUser.id));
      await db.delete(users).where(eq(users.id, adminUser.id));
    }

    // Cleanup any test users that might have been created
    const testUsers = await db.select().from(users).where(like(users.email, '%provtest%'));
    for (const user of testUsers) {
      await db.delete(userSessions).where(eq(userSessions.userId, user.id));
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  describe('GET /admin/provisioning/templates', () => {
    it('should return role templates for authenticated users', async () => {
      const response = await request(app)
        .get('/api/v1/admin/provisioning/templates')
        .set('x-session-token', adminSessionToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(typeof response.body.data).toBe('object');

      // Check for expected roles
      const roles = Object.keys(response.body.data);
      expect(roles).toContain('client');
      expect(roles).toContain('ops_executive');
      expect(roles).toContain('ops_manager');
      expect(roles).toContain('admin');
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/v1/admin/provisioning/templates');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /admin/provisioning/stats', () => {
    it('should return provisioning statistics for super admin', async () => {
      const response = await request(app)
        .get('/api/v1/admin/provisioning/stats')
        .set('x-session-token', superAdminSessionToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalUsers).toBeDefined();
      expect(response.body.data.activeUsers).toBeDefined();
      expect(response.body.data.byRole).toBeDefined();
    });
  });

  describe('POST /admin/provisioning/user', () => {
    it('should provision a new user with super admin role', async () => {
      const timestamp = Date.now();
      const response = await request(app)
        .post('/api/v1/admin/provisioning/user')
        .set('x-session-token', superAdminSessionToken)
        .send({
          email: `provtest.user${timestamp}@example.com`,
          fullName: 'Provisioned Test User',
          role: 'ops_executive',
          department: 'operations',
          sendWelcomeEmail: false,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(`provtest.user${timestamp}@example.com`);
      expect(response.body.data.temporaryPassword).toBeDefined();

      createdUserIds.push(response.body.data.user.id);
    });

    it('should reject duplicate email', async () => {
      const timestamp = Date.now();
      const email = `provtest.dup${timestamp}@example.com`;

      // Create first user
      const firstResponse = await request(app)
        .post('/api/v1/admin/provisioning/user')
        .set('x-session-token', superAdminSessionToken)
        .send({
          email,
          fullName: 'First User',
          role: 'client',
        });

      expect(firstResponse.status).toBe(201);
      createdUserIds.push(firstResponse.body.data.user.id);

      // Try to create second user with same email
      const secondResponse = await request(app)
        .post('/api/v1/admin/provisioning/user')
        .set('x-session-token', superAdminSessionToken)
        .send({
          email,
          fullName: 'Second User',
          role: 'client',
        });

      expect(secondResponse.status).toBe(400);
      expect(secondResponse.body.error).toContain('already exists');
    });

    it('should reject non-super-admin from provisioning', async () => {
      const response = await request(app)
        .post('/api/v1/admin/provisioning/user')
        .set('x-session-token', adminSessionToken)
        .send({
          email: 'test@example.com',
          fullName: 'Test User',
          role: 'client',
        });

      expect(response.status).toBe(403);
    });

    it('should reject provisioning without email', async () => {
      const response = await request(app)
        .post('/api/v1/admin/provisioning/user')
        .set('x-session-token', superAdminSessionToken)
        .send({
          fullName: 'Test User',
          role: 'client',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Email');
    });

    it('should reject provisioning without full name', async () => {
      const response = await request(app)
        .post('/api/v1/admin/provisioning/user')
        .set('x-session-token', superAdminSessionToken)
        .send({
          email: 'test@example.com',
          role: 'client',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Full name');
    });

    it('should reject invalid role', async () => {
      const response = await request(app)
        .post('/api/v1/admin/provisioning/user')
        .set('x-session-token', superAdminSessionToken)
        .send({
          email: 'test@example.com',
          fullName: 'Test User',
          role: 'invalid_role',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid role');
    });
  });

  describe('POST /admin/provisioning/bulk', () => {
    it('should bulk provision multiple users', async () => {
      const timestamp = Date.now();
      const response = await request(app)
        .post('/api/v1/admin/provisioning/bulk')
        .set('x-session-token', superAdminSessionToken)
        .send({
          users: [
            {
              email: `provtest.bulk1.${timestamp}@example.com`,
              fullName: 'Bulk User 1',
              role: 'client',
            },
            {
              email: `provtest.bulk2.${timestamp}@example.com`,
              fullName: 'Bulk User 2',
              role: 'ops_executive',
              department: 'operations',
            },
          ],
          sendWelcomeEmails: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.created).toBeDefined();
      expect(response.body.data.created.length).toBe(2);
      expect(response.body.data.failed).toBeDefined();
      expect(response.body.data.failed.length).toBe(0);

      for (const user of response.body.data.created) {
        createdUserIds.push(user.user.id);
      }
    });

    it('should handle partial failures in bulk provisioning', async () => {
      const timestamp = Date.now();
      const existingEmail = `provtest.existing.${timestamp}@example.com`;

      // Create a user first
      const firstResponse = await request(app)
        .post('/api/v1/admin/provisioning/user')
        .set('x-session-token', superAdminSessionToken)
        .send({
          email: existingEmail,
          fullName: 'Existing User',
          role: 'client',
        });

      createdUserIds.push(firstResponse.body.data.user.id);

      // Now try bulk with one existing email
      const response = await request(app)
        .post('/api/v1/admin/provisioning/bulk')
        .set('x-session-token', superAdminSessionToken)
        .send({
          users: [
            {
              email: existingEmail, // This should fail
              fullName: 'Duplicate User',
              role: 'client',
            },
            {
              email: `provtest.new.${timestamp}@example.com`, // This should succeed
              fullName: 'New User',
              role: 'client',
            },
          ],
          sendWelcomeEmails: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.created.length).toBe(1);
      expect(response.body.data.failed.length).toBe(1);
      expect(response.body.data.failed[0].error).toContain('already exists');

      for (const user of response.body.data.created) {
        createdUserIds.push(user.user.id);
      }
    });

    it('should reject bulk provisioning exceeding limit', async () => {
      const users = [];
      for (let i = 0; i < 101; i++) {
        users.push({
          email: `bulk${i}@example.com`,
          fullName: `Bulk User ${i}`,
          role: 'client',
        });
      }

      const response = await request(app)
        .post('/api/v1/admin/provisioning/bulk')
        .set('x-session-token', superAdminSessionToken)
        .send({ users });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('100');
    });
  });

  describe('POST /admin/provisioning/deprovision/:userId', () => {
    let userToDeprovision: any;

    beforeAll(async () => {
      const timestamp = Date.now();
      const response = await request(app)
        .post('/api/v1/admin/provisioning/user')
        .set('x-session-token', superAdminSessionToken)
        .send({
          email: `provtest.deprov.${timestamp}@example.com`,
          fullName: 'User To Deprovision',
          role: 'client',
        });

      userToDeprovision = response.body.data.user;
      createdUserIds.push(userToDeprovision.id);
    });

    it('should deprovision a user', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/provisioning/deprovision/${userToDeprovision.id}`)
        .set('x-session-token', superAdminSessionToken)
        .send({
          reason: 'Test deprovisioning',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify user is deactivated
      const [deactivatedUser] = await db.select()
        .from(users)
        .where(eq(users.id, userToDeprovision.id));

      expect(deactivatedUser.isActive).toBe(false);
    });

    it('should reject deprovisioning non-existent user', async () => {
      const response = await request(app)
        .post('/api/v1/admin/provisioning/deprovision/999999')
        .set('x-session-token', superAdminSessionToken)
        .send({
          reason: 'Test',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /admin/provisioning/reactivate/:userId', () => {
    let userToReactivate: any;

    beforeAll(async () => {
      const timestamp = Date.now();
      const response = await request(app)
        .post('/api/v1/admin/provisioning/user')
        .set('x-session-token', superAdminSessionToken)
        .send({
          email: `provtest.react.${timestamp}@example.com`,
          fullName: 'User To Reactivate',
          role: 'client',
        });

      userToReactivate = response.body.data.user;
      createdUserIds.push(userToReactivate.id);

      // Deprovision the user first
      await request(app)
        .post(`/api/v1/admin/provisioning/deprovision/${userToReactivate.id}`)
        .set('x-session-token', superAdminSessionToken)
        .send({ reason: 'Test' });
    });

    it('should reactivate a deprovisioned user', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/provisioning/reactivate/${userToReactivate.id}`)
        .set('x-session-token', superAdminSessionToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify user is reactivated
      const [reactivatedUser] = await db.select()
        .from(users)
        .where(eq(users.id, userToReactivate.id));

      expect(reactivatedUser.isActive).toBe(true);
    });
  });

  describe('PUT /admin/provisioning/role/:userId', () => {
    let userForRoleChange: any;

    beforeAll(async () => {
      const timestamp = Date.now();
      const response = await request(app)
        .post('/api/v1/admin/provisioning/user')
        .set('x-session-token', superAdminSessionToken)
        .send({
          email: `provtest.role.${timestamp}@example.com`,
          fullName: 'User For Role Change',
          role: 'client',
        });

      userForRoleChange = response.body.data.user;
      createdUserIds.push(userForRoleChange.id);
    });

    it('should update user role', async () => {
      const response = await request(app)
        .put(`/api/v1/admin/provisioning/role/${userForRoleChange.id}`)
        .set('x-session-token', superAdminSessionToken)
        .send({
          newRole: 'ops_executive',
          department: 'operations',
          reason: 'Promotion',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify role was updated
      const [updatedUser] = await db.select()
        .from(users)
        .where(eq(users.id, userForRoleChange.id));

      expect(updatedUser.role).toBe('ops_executive');
      expect(updatedUser.department).toBe('operations');
    });

    it('should reject role change without new role', async () => {
      const response = await request(app)
        .put(`/api/v1/admin/provisioning/role/${userForRoleChange.id}`)
        .set('x-session-token', superAdminSessionToken)
        .send({
          reason: 'Test',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('New role');
    });

    it('should reject invalid new role', async () => {
      const response = await request(app)
        .put(`/api/v1/admin/provisioning/role/${userForRoleChange.id}`)
        .set('x-session-token', superAdminSessionToken)
        .send({
          newRole: 'invalid_role',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid role');
    });
  });

  describe('POST /admin/provisioning/reset-password/:userId', () => {
    let userForPasswordReset: any;

    beforeAll(async () => {
      const timestamp = Date.now();
      const response = await request(app)
        .post('/api/v1/admin/provisioning/user')
        .set('x-session-token', superAdminSessionToken)
        .send({
          email: `provtest.pwreset.${timestamp}@example.com`,
          fullName: 'User For Password Reset',
          role: 'client',
        });

      userForPasswordReset = response.body.data.user;
      createdUserIds.push(userForPasswordReset.id);
    });

    it('should reset user password', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/provisioning/reset-password/${userForPasswordReset.id}`)
        .set('x-session-token', superAdminSessionToken)
        .send({
          sendEmail: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.temporaryPassword).toBeDefined();
      expect(response.body.data.temporaryPassword.length).toBeGreaterThanOrEqual(12);
    });
  });

  describe('GET /admin/provisioning/onboarding/:userId', () => {
    let userForOnboarding: any;

    beforeAll(async () => {
      const timestamp = Date.now();
      const response = await request(app)
        .post('/api/v1/admin/provisioning/user')
        .set('x-session-token', superAdminSessionToken)
        .send({
          email: `provtest.onboard.${timestamp}@example.com`,
          fullName: 'User For Onboarding',
          role: 'ops_executive',
          department: 'operations',
        });

      userForOnboarding = response.body.data.user;
      createdUserIds.push(userForOnboarding.id);
    });

    it('should return onboarding status', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/provisioning/onboarding/${userForOnboarding.id}`)
        .set('x-session-token', superAdminSessionToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.steps).toBeDefined();
      expect(Array.isArray(response.body.data.steps)).toBe(true);
      expect(response.body.data.completionPercentage).toBeDefined();
    });

    it('should reject request for non-existent user', async () => {
      const response = await request(app)
        .get('/api/v1/admin/provisioning/onboarding/999999')
        .set('x-session-token', superAdminSessionToken);

      expect(response.status).toBe(404);
    });
  });
});
