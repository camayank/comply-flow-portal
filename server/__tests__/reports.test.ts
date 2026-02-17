/**
 * Report Generator Service Tests
 * Tests for report generation, download, and history
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import reportsRoutes from '../routes/reports';
import { db } from '../db';
import { users, userSessions, serviceRequests, businessEntities } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

describe('Report Generator Service', () => {
  let app: express.Express;
  let opsManagerUser: any;
  let opsExecutiveUser: any;
  let sessionToken: string;
  let executiveSessionToken: string;
  let testBusinessEntity: any;

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
      if (token === sessionToken && opsManagerUser) {
        req.user = opsManagerUser;
        req.isAuthenticated = () => true;
      } else if (token === executiveSessionToken && opsExecutiveUser) {
        req.user = opsExecutiveUser;
        req.isAuthenticated = () => true;
      } else {
        req.isAuthenticated = () => false;
      }
      next();
    });

    app.use('/api/v1/reports', reportsRoutes);

    // Create test users
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

    [opsManagerUser] = await db.insert(users).values({
      username: 'testopsmanager',
      email: 'testopsmanager@example.com',
      password: hashedPassword,
      fullName: 'Test Ops Manager',
      role: 'ops_manager',
      department: 'operations',
      isActive: true,
    }).returning();

    [opsExecutiveUser] = await db.insert(users).values({
      username: 'testopsexec',
      email: 'testopsexec@example.com',
      password: hashedPassword,
      fullName: 'Test Ops Executive',
      role: 'ops_executive',
      department: 'operations',
      isActive: true,
    }).returning();

    // Create sessions
    sessionToken = crypto.randomBytes(32).toString('hex');
    executiveSessionToken = crypto.randomBytes(32).toString('hex');

    await db.insert(userSessions).values({
      userId: opsManagerUser.id,
      sessionToken,
      fingerprint: crypto.createHash('sha256').update('test').digest('hex'),
      csrfToken: crypto.randomBytes(16).toString('hex'),
      isActive: true,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await db.insert(userSessions).values({
      userId: opsExecutiveUser.id,
      sessionToken: executiveSessionToken,
      fingerprint: crypto.createHash('sha256').update('test').digest('hex'),
      csrfToken: crypto.randomBytes(16).toString('hex'),
      isActive: true,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // Create test business entity for service request reports
    [testBusinessEntity] = await db.insert(businessEntities).values({
      ownerId: opsExecutiveUser.id,
      clientId: `TEST-${Date.now()}`,
      name: 'Test Business for Reports',
      entityType: 'pvt_ltd',
      contactPhone: '9876543210',
      contactEmail: 'reporttest@example.com',
    }).returning();

    // Create some test service requests
    await db.insert(serviceRequests).values([
      {
        entityId: testBusinessEntity.id,
        serviceId: 1,
        serviceName: 'GST Registration',
        category: 'Compliance',
        status: 'completed',
        priority: 'normal',
        basePrice: '5000',
      },
      {
        entityId: testBusinessEntity.id,
        serviceId: 2,
        serviceName: 'Annual Filing',
        category: 'Compliance',
        status: 'in_progress',
        priority: 'high',
        basePrice: '10000',
      },
    ]);
  });

  afterAll(async () => {
    // Cleanup test data
    if (testBusinessEntity) {
      await db.delete(serviceRequests).where(eq(serviceRequests.entityId, testBusinessEntity.id));
      await db.delete(businessEntities).where(eq(businessEntities.id, testBusinessEntity.id));
    }
    if (opsManagerUser) {
      await db.delete(userSessions).where(eq(userSessions.userId, opsManagerUser.id));
      await db.delete(users).where(eq(users.id, opsManagerUser.id));
    }
    if (opsExecutiveUser) {
      await db.delete(userSessions).where(eq(userSessions.userId, opsExecutiveUser.id));
      await db.delete(users).where(eq(users.id, opsExecutiveUser.id));
    }
  });

  describe('GET /reports/types', () => {
    it('should return available report types for ops executive', async () => {
      const response = await request(app)
        .get('/api/v1/reports/types')
        .set('x-session-token', executiveSessionToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      // Check for expected report types
      const types = response.body.data.map((t: any) => t.type);
      expect(types).toContain('service_requests');
      expect(types).toContain('compliance');
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/v1/reports/types');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /reports/generate', () => {
    it('should generate JSON report for ops manager', async () => {
      const response = await request(app)
        .post('/api/v1/reports/generate')
        .set('x-session-token', sessionToken)
        .send({
          type: 'service_requests',
          format: 'json',
          parameters: {
            limit: 10,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.reportId).toBeDefined();
      expect(response.body.data.format).toBe('json');
    });

    it('should reject invalid report type', async () => {
      const response = await request(app)
        .post('/api/v1/reports/generate')
        .set('x-session-token', sessionToken)
        .send({
          type: 'invalid_type',
          format: 'json',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid report type');
    });

    it('should reject invalid format', async () => {
      const response = await request(app)
        .post('/api/v1/reports/generate')
        .set('x-session-token', sessionToken)
        .send({
          type: 'service_requests',
          format: 'invalid_format',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid format');
    });

    it('should reject requests without report type', async () => {
      const response = await request(app)
        .post('/api/v1/reports/generate')
        .set('x-session-token', sessionToken)
        .send({
          format: 'json',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Report type is required');
    });

    it('should reject ops executive from generating reports', async () => {
      const response = await request(app)
        .post('/api/v1/reports/generate')
        .set('x-session-token', executiveSessionToken)
        .send({
          type: 'service_requests',
          format: 'json',
        });

      // ops_executive doesn't have permission for generate (requires ops_manager)
      expect(response.status).toBe(403);
    });
  });

  describe('POST /reports/download', () => {
    it('should generate CSV download for ops manager', async () => {
      const response = await request(app)
        .post('/api/v1/reports/download')
        .set('x-session-token', sessionToken)
        .send({
          type: 'service_requests',
          format: 'csv',
          parameters: {
            limit: 10,
          },
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('should generate JSON download', async () => {
      const response = await request(app)
        .post('/api/v1/reports/download')
        .set('x-session-token', sessionToken)
        .send({
          type: 'compliance',
          format: 'json',
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
    });
  });

  describe('GET /reports/history', () => {
    beforeEach(async () => {
      // Generate a report first to have history
      await request(app)
        .post('/api/v1/reports/generate')
        .set('x-session-token', sessionToken)
        .send({
          type: 'service_requests',
          format: 'json',
        });
    });

    it('should return report history for ops manager', async () => {
      const response = await request(app)
        .get('/api/v1/reports/history')
        .set('x-session-token', sessionToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter history by type', async () => {
      const response = await request(app)
        .get('/api/v1/reports/history?type=service_requests')
        .set('x-session-token', sessionToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // All items should be of the filtered type
      for (const item of response.body.data) {
        expect(item.type).toBe('service_requests');
      }
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/v1/reports/history?limit=5')
        .set('x-session-token', sessionToken);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('POST /reports/service-requests (Quick Report)', () => {
    it('should generate service requests quick report', async () => {
      const response = await request(app)
        .post('/api/v1/reports/service-requests')
        .set('x-session-token', executiveSessionToken)
        .send({
          format: 'json',
          limit: 10,
        });

      expect(response.status).toBe(200);
    });

    it('should filter by date range', async () => {
      const response = await request(app)
        .post('/api/v1/reports/service-requests')
        .set('x-session-token', executiveSessionToken)
        .send({
          format: 'json',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        });

      expect(response.status).toBe(200);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .post('/api/v1/reports/service-requests')
        .set('x-session-token', executiveSessionToken)
        .send({
          format: 'json',
          status: 'completed',
        });

      expect(response.status).toBe(200);
    });
  });

  describe('POST /reports/revenue (Quick Report)', () => {
    it('should generate revenue report for ops manager', async () => {
      const response = await request(app)
        .post('/api/v1/reports/revenue')
        .set('x-session-token', sessionToken)
        .send({
          format: 'json',
          groupBy: 'month',
        });

      expect(response.status).toBe(200);
    });

    it('should reject revenue report for ops executive', async () => {
      const response = await request(app)
        .post('/api/v1/reports/revenue')
        .set('x-session-token', executiveSessionToken)
        .send({
          format: 'json',
        });

      // Revenue report requires ops_manager role
      expect(response.status).toBe(403);
    });
  });

  describe('POST /reports/compliance (Quick Report)', () => {
    it('should generate compliance report', async () => {
      const response = await request(app)
        .post('/api/v1/reports/compliance')
        .set('x-session-token', executiveSessionToken)
        .send({
          format: 'json',
        });

      expect(response.status).toBe(200);
    });
  });
});
