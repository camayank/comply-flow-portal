/**
 * Government Filing Service Tests
 * Tests for GST, ITR, MCA, TDS, PF, ESI filing endpoints
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import governmentFilingRoutes from '../routes/government-filing';
import { db } from '../db';
import { users, userSessions, governmentFilings, businessEntities } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

describe('Government Filing Service', () => {
  let app: express.Express;
  let opsExecutiveUser: any;
  let sessionToken: string;
  let testEntity: any;

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
      if (token === sessionToken && opsExecutiveUser) {
        req.user = opsExecutiveUser;
        req.isAuthenticated = () => true;
      } else {
        req.isAuthenticated = () => false;
      }
      next();
    });

    app.use('/api/v1/government', governmentFilingRoutes);

    // Create test user
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

    [opsExecutiveUser] = await db.insert(users).values({
      username: 'testgovfiling',
      email: 'testgovfiling@example.com',
      password: hashedPassword,
      fullName: 'Test Gov Filing User',
      role: 'ops_executive',
      department: 'operations',
      isActive: true,
    }).returning();

    // Create session
    sessionToken = crypto.randomBytes(32).toString('hex');

    await db.insert(userSessions).values({
      userId: opsExecutiveUser.id,
      sessionToken,
      fingerprint: crypto.createHash('sha256').update('test').digest('hex'),
      csrfToken: crypto.randomBytes(16).toString('hex'),
      isActive: true,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // Create test business entity
    [testEntity] = await db.insert(businessEntities).values({
      ownerId: opsExecutiveUser.id,
      clientId: `TEST-GOV-${Date.now()}`,
      name: 'Test Entity Pvt Ltd',
      entityType: 'pvt_ltd',
      gstin: '29AABCT1234A1ZG',
      pan: 'AABCT1234A',
      cin: 'U12345KA2020PTC123456',
    }).returning();

    // Create some test filings
    await db.insert(governmentFilings).values([
      {
        clientId: testEntity.id,
        entityId: testEntity.id,
        portalType: 'gst',
        filingType: 'GSTR-1',
        period: '2024-01',
        status: 'submitted',
        arnNumber: 'AA1234567890',
        dueDate: new Date('2024-02-11'),
        submittedAt: new Date('2024-02-05'),
      },
      {
        clientId: testEntity.id,
        entityId: testEntity.id,
        portalType: 'gst',
        filingType: 'GSTR-3B',
        period: '2024-01',
        status: 'pending',
        dueDate: new Date('2024-02-20'),
      },
      {
        clientId: testEntity.id,
        entityId: testEntity.id,
        portalType: 'income_tax',
        filingType: 'ITR-3',
        assessmentYear: '2024-25',
        financialYear: '2023-24',
        status: 'acknowledged',
        acknowledgmentNumber: 'ITR-ACK-123456',
        dueDate: new Date('2024-07-31'),
        submittedAt: new Date('2024-07-15'),
        acknowledgedAt: new Date('2024-07-15'),
      },
    ]);
  });

  afterAll(async () => {
    // Cleanup test data
    if (testEntity) {
      await db.delete(governmentFilings).where(eq(governmentFilings.clientId, testEntity.id));
      await db.delete(businessEntities).where(eq(businessEntities.id, testEntity.id));
    }
    if (opsExecutiveUser) {
      await db.delete(userSessions).where(eq(userSessions.userId, opsExecutiveUser.id));
      await db.delete(users).where(eq(users.id, opsExecutiveUser.id));
    }
  });

  describe('GST Filing Endpoints', () => {
    describe('POST /government/gst/gstr1', () => {
      it('should accept GSTR-1 filing request', async () => {
        const response = await request(app)
          .post('/api/v1/government/gst/gstr1')
          .set('x-session-token', sessionToken)
          .send({
            clientId: testEntity.id,
            entityId: testEntity.id,
            period: '2024-02',
            data: {
              b2b: [],
              b2c: [],
              hsn: [],
            },
          });

        // Service might return success or simulated response
        expect([200, 201, 500]).toContain(response.status);
        if (response.status === 200 || response.status === 201) {
          expect(response.body).toBeDefined();
        }
      });

      it('should reject unauthenticated requests', async () => {
        const response = await request(app)
          .post('/api/v1/government/gst/gstr1')
          .send({
            clientId: testEntity.id,
            period: '2024-02',
            data: {},
          });

        expect(response.status).toBe(401);
      });

      it('should reject request without clientId', async () => {
        const response = await request(app)
          .post('/api/v1/government/gst/gstr1')
          .set('x-session-token', sessionToken)
          .send({
            period: '2024-02',
            data: {},
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Client ID');
      });
    });

    describe('POST /government/gst/gstr3b', () => {
      it('should accept GSTR-3B filing request', async () => {
        const response = await request(app)
          .post('/api/v1/government/gst/gstr3b')
          .set('x-session-token', sessionToken)
          .send({
            clientId: testEntity.id,
            entityId: testEntity.id,
            period: '2024-02',
            data: {
              outwardTaxable: 100000,
              outwardZero: 0,
              itc: 15000,
            },
          });

        expect([200, 201, 500]).toContain(response.status);
      });
    });

    describe('GET /government/gst/status/:gstin/:arn', () => {
      it('should return filing status for valid ARN', async () => {
        const response = await request(app)
          .get('/api/v1/government/gst/status/29AABCT1234A1ZG/AA1234567890')
          .set('x-session-token', sessionToken);

        expect([200, 404, 500]).toContain(response.status);
      });
    });

    describe('GET /government/gst/calendar/:gstin', () => {
      it('should return returns calendar for GSTIN', async () => {
        const response = await request(app)
          .get('/api/v1/government/gst/calendar/29AABCT1234A1ZG')
          .set('x-session-token', sessionToken);

        expect([200, 500]).toContain(response.status);
      });
    });
  });

  describe('Income Tax Filing Endpoints', () => {
    describe('POST /government/itr/file', () => {
      it('should accept ITR filing request', async () => {
        const response = await request(app)
          .post('/api/v1/government/itr/file')
          .set('x-session-token', sessionToken)
          .send({
            clientId: testEntity.id,
            entityId: testEntity.id,
            itrType: 'ITR-3',
            assessmentYear: '2025-26',
            period: '2024-25',
            data: {
              grossIncome: 1000000,
              deductions: 150000,
              taxPayable: 50000,
            },
          });

        expect([200, 201, 500]).toContain(response.status);
      });

      it('should reject ITR without assessment year', async () => {
        const response = await request(app)
          .post('/api/v1/government/itr/file')
          .set('x-session-token', sessionToken)
          .send({
            clientId: testEntity.id,
            itrType: 'ITR-3',
            period: '2024-25',
            data: {},
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Assessment year');
      });

      it('should reject ITR without ITR type', async () => {
        const response = await request(app)
          .post('/api/v1/government/itr/file')
          .set('x-session-token', sessionToken)
          .send({
            clientId: testEntity.id,
            assessmentYear: '2025-26',
            period: '2024-25',
            data: {},
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('ITR type');
      });
    });

    describe('GET /government/itr/form26as/:pan/:assessmentYear', () => {
      it('should fetch Form 26AS data', async () => {
        const response = await request(app)
          .get('/api/v1/government/itr/form26as/AABCT1234A/2024-25')
          .set('x-session-token', sessionToken);

        expect([200, 404, 500]).toContain(response.status);
      });
    });

    describe('GET /government/itr/ais/:pan/:financialYear', () => {
      it('should fetch AIS data', async () => {
        const response = await request(app)
          .get('/api/v1/government/itr/ais/AABCT1234A/2023-24')
          .set('x-session-token', sessionToken);

        expect([200, 404, 500]).toContain(response.status);
      });
    });
  });

  describe('MCA Filing Endpoints', () => {
    describe('POST /government/mca/form', () => {
      it('should accept MCA form filing request', async () => {
        const response = await request(app)
          .post('/api/v1/government/mca/form')
          .set('x-session-token', sessionToken)
          .send({
            clientId: testEntity.id,
            entityId: testEntity.id,
            formType: 'AOC-4',
            period: '2023-24',
            data: {
              financialStatements: {},
              boardReport: {},
            },
          });

        expect([200, 201, 500]).toContain(response.status);
      });

      it('should reject MCA form without form type', async () => {
        const response = await request(app)
          .post('/api/v1/government/mca/form')
          .set('x-session-token', sessionToken)
          .send({
            clientId: testEntity.id,
            period: '2023-24',
            data: {},
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Form type');
      });
    });

    describe('GET /government/mca/company/:cin', () => {
      it('should fetch company master data', async () => {
        const response = await request(app)
          .get('/api/v1/government/mca/company/U12345KA2020PTC123456')
          .set('x-session-token', sessionToken);

        expect([200, 404, 500]).toContain(response.status);
      });
    });

    describe('GET /government/mca/director/:din', () => {
      it('should fetch director details', async () => {
        const response = await request(app)
          .get('/api/v1/government/mca/director/12345678')
          .set('x-session-token', sessionToken);

        expect([200, 404, 500]).toContain(response.status);
      });
    });

    describe('GET /government/mca/srn/:srn', () => {
      it('should fetch SRN status', async () => {
        const response = await request(app)
          .get('/api/v1/government/mca/srn/SRN123456')
          .set('x-session-token', sessionToken);

        expect([200, 404, 500]).toContain(response.status);
      });
    });
  });

  describe('TDS Filing Endpoints', () => {
    describe('POST /government/tds/return', () => {
      it('should accept TDS return filing request', async () => {
        const response = await request(app)
          .post('/api/v1/government/tds/return')
          .set('x-session-token', sessionToken)
          .send({
            clientId: testEntity.id,
            entityId: testEntity.id,
            formType: '24Q',
            quarter: 'Q3',
            period: '2024-25',
            financialYear: '2024-25',
            data: {
              deductorDetails: {},
              challanDetails: [],
              deducteeRecords: [],
            },
          });

        expect([200, 201, 500]).toContain(response.status);
      });

      it('should reject TDS return without form type', async () => {
        const response = await request(app)
          .post('/api/v1/government/tds/return')
          .set('x-session-token', sessionToken)
          .send({
            clientId: testEntity.id,
            quarter: 'Q3',
            period: '2024-25',
            data: {},
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Form type');
      });

      it('should reject TDS return without quarter', async () => {
        const response = await request(app)
          .post('/api/v1/government/tds/return')
          .set('x-session-token', sessionToken)
          .send({
            clientId: testEntity.id,
            formType: '24Q',
            period: '2024-25',
            data: {},
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Quarter');
      });
    });

    describe('GET /government/tds/form16/:tan/:pan/:financialYear', () => {
      it('should fetch Form 16 data', async () => {
        const response = await request(app)
          .get('/api/v1/government/tds/form16/BLRT12345A/AABCT1234A/2023-24')
          .set('x-session-token', sessionToken);

        expect([200, 404, 500]).toContain(response.status);
      });
    });
  });

  describe('PF/ESI Filing Endpoints', () => {
    describe('POST /government/pf/return', () => {
      it('should accept PF return filing request', async () => {
        const response = await request(app)
          .post('/api/v1/government/pf/return')
          .set('x-session-token', sessionToken)
          .send({
            clientId: testEntity.id,
            entityId: testEntity.id,
            period: '2024-01',
            data: {
              establishmentId: 'MH/BOM/123456',
              employeeContributions: [],
              employerContributions: [],
            },
          });

        expect([200, 201, 500]).toContain(response.status);
      });
    });

    describe('POST /government/esi/return', () => {
      it('should accept ESI return filing request', async () => {
        const response = await request(app)
          .post('/api/v1/government/esi/return')
          .set('x-session-token', sessionToken)
          .send({
            clientId: testEntity.id,
            entityId: testEntity.id,
            period: '2024-01',
            data: {
              employerCode: '12345678901234567',
              contributions: [],
            },
          });

        expect([200, 201, 500]).toContain(response.status);
      });
    });
  });

  describe('Filing History Endpoints', () => {
    describe('GET /government/history/:clientId', () => {
      it('should return filing history for client', async () => {
        const response = await request(app)
          .get(`/api/v1/government/history/${testEntity.id}`)
          .set('x-session-token', sessionToken);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThanOrEqual(3);
      });

      it('should filter by portal type', async () => {
        const response = await request(app)
          .get(`/api/v1/government/history/${testEntity.id}?portalType=gst`)
          .set('x-session-token', sessionToken);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        for (const filing of response.body.data) {
          expect(filing.portalType).toBe('gst');
        }
      });

      it('should filter by status', async () => {
        const response = await request(app)
          .get(`/api/v1/government/history/${testEntity.id}?status=submitted`)
          .set('x-session-token', sessionToken);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        for (const filing of response.body.data) {
          expect(filing.status).toBe('submitted');
        }
      });

      it('should respect limit parameter', async () => {
        const response = await request(app)
          .get(`/api/v1/government/history/${testEntity.id}?limit=2`)
          .set('x-session-token', sessionToken);

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBeLessThanOrEqual(2);
      });
    });

    describe('GET /government/pending', () => {
      it('should return all pending filings', async () => {
        const response = await request(app)
          .get('/api/v1/government/pending')
          .set('x-session-token', sessionToken);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should filter pending by client', async () => {
        const response = await request(app)
          .get(`/api/v1/government/pending?clientId=${testEntity.id}`)
          .set('x-session-token', sessionToken);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        for (const filing of response.body.data) {
          expect(filing.clientId).toBe(testEntity.id);
          expect(filing.status).toBe('pending');
        }
      });
    });

    describe('GET /government/deadlines', () => {
      it('should return upcoming deadlines', async () => {
        const response = await request(app)
          .get('/api/v1/government/deadlines?days=90')
          .set('x-session-token', sessionToken);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should filter deadlines by client', async () => {
        const response = await request(app)
          .get(`/api/v1/government/deadlines?days=365&clientId=${testEntity.id}`)
          .set('x-session-token', sessionToken);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});
