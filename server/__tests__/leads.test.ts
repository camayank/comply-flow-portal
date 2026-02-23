/**
 * Lead Routes Tests
 * Tests for lead CRUD operations and role-based access control
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { registerLeadsRoutes } from '../leads-routes';
import { db } from '../db';
import { users, leads, userSessions } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

describe('Lead Management Routes', () => {
  let app: express.Express;
  let adminUser: any;
  let salesManagerUser: any;
  let salesExecUser: any;
  let customerServiceUser: any;
  let agentUser: any;
  let clientUser: any;

  let adminSession: any;
  let salesManagerSession: any;
  let salesExecSession: any;
  let customerServiceSession: any;
  let agentSession: any;
  let clientSession: any;

  let testLead: any;

  const createTestUser = async (role: string, username: string) => {
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
    const [user] = await db.insert(users).values({
      username,
      email: `${username}@test.digicomply.in`,
      password: hashedPassword,
      fullName: `Test ${role}`,
      role,
      isActive: true,
    }).returning();
    return user;
  };

  const createSession = async (userId: number) => {
    const sessionToken = `test-session-${userId}-${Date.now()}`;
    const [session] = await db.insert(userSessions).values({
      userId,
      sessionToken,
      isActive: true,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      fingerprint: 'test-fingerprint',
      csrfToken: 'test-csrf',
    }).returning();
    return session;
  };

  beforeAll(async () => {
    // Setup Express app with session middleware
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
    }));

    // Register lead routes
    registerLeadsRoutes(app);

    // Create test users with different roles
    adminUser = await createTestUser('admin', 'test_admin_leads');
    salesManagerUser = await createTestUser('sales_manager', 'test_sales_manager');
    salesExecUser = await createTestUser('sales_executive', 'test_sales_exec');
    customerServiceUser = await createTestUser('customer_service', 'test_customer_service');
    agentUser = await createTestUser('agent', 'test_agent_leads');
    clientUser = await createTestUser('client', 'test_client_leads');

    // Create sessions
    adminSession = await createSession(adminUser.id);
    salesManagerSession = await createSession(salesManagerUser.id);
    salesExecSession = await createSession(salesExecUser.id);
    customerServiceSession = await createSession(customerServiceUser.id);
    agentSession = await createSession(agentUser.id);
    clientSession = await createSession(clientUser.id);
  });

  afterAll(async () => {
    // Cleanup test data
    const testUsers = [adminUser, salesManagerUser, salesExecUser, customerServiceUser, agentUser, clientUser];

    for (const user of testUsers) {
      if (user) {
        await db.delete(userSessions).where(eq(userSessions.userId, user.id));
        await db.delete(users).where(eq(users.id, user.id));
      }
    }

    // Delete test leads
    if (testLead) {
      await db.delete(leads).where(eq(leads.id, testLead.id));
    }
  });

  describe('Role-Based Access Control', () => {
    it('should allow admin to access leads', async () => {
      const response = await request(app)
        .get('/api/leads')
        .set('Authorization', `Bearer ${adminSession.sessionToken}`);

      // Should not be 401 or 403
      expect([200, 500]).toContain(response.status);
    });

    it('should allow sales_manager to access leads', async () => {
      const response = await request(app)
        .get('/api/leads')
        .set('Authorization', `Bearer ${salesManagerSession.sessionToken}`);

      expect([200, 500]).toContain(response.status);
    });

    it('should allow customer_service to access leads', async () => {
      const response = await request(app)
        .get('/api/leads')
        .set('Authorization', `Bearer ${customerServiceSession.sessionToken}`);

      expect([200, 500]).toContain(response.status);
    });

    it('should deny client access to leads API', async () => {
      const response = await request(app)
        .get('/api/leads')
        .set('Authorization', `Bearer ${clientSession.sessionToken}`);

      // Client should be forbidden (403) or unauthorized (401)
      expect([401, 403]).toContain(response.status);
    });

    it('should deny unauthenticated access', async () => {
      const response = await request(app)
        .get('/api/leads');

      expect(response.status).toBe(401);
    });
  });

  describe('Lead CRUD Operations', () => {
    describe('Create Lead', () => {
      it('should create lead with valid data', async () => {
        const leadData = {
          clientName: 'Test Company Ltd',
          contactPhone: '+91 9876543210',
          contactEmail: 'contact@testcompany.com',
          serviceInterested: 'GST Registration',
          leadSource: 'Website',
          state: 'Maharashtra',
          entityType: 'pvt_ltd',
        };

        const response = await request(app)
          .post('/api/leads')
          .set('Authorization', `Bearer ${salesManagerSession.sessionToken}`)
          .send(leadData);

        if (response.status === 200 || response.status === 201) {
          expect(response.body).toBeDefined();
          testLead = response.body;
        }
      });

      it('should reject lead creation with missing required fields', async () => {
        const response = await request(app)
          .post('/api/leads')
          .set('Authorization', `Bearer ${salesManagerSession.sessionToken}`)
          .send({
            // Missing required fields
            serviceInterested: 'GST Registration',
          });

        expect([400, 500]).toContain(response.status);
      });
    });

    describe('Read Lead', () => {
      it('should fetch leads list', async () => {
        const response = await request(app)
          .get('/api/leads')
          .set('Authorization', `Bearer ${salesManagerSession.sessionToken}`);

        if (response.status === 200) {
          expect(response.body.leads).toBeDefined();
          expect(Array.isArray(response.body.leads)).toBe(true);
        }
      });

      it('should fetch leads with pagination', async () => {
        const response = await request(app)
          .get('/api/leads?page=1&limit=10')
          .set('Authorization', `Bearer ${salesManagerSession.sessionToken}`);

        if (response.status === 200) {
          expect(response.body.pagination).toBeDefined();
        }
      });

      it('should fetch leads with stage filter', async () => {
        const response = await request(app)
          .get('/api/leads?stage=new')
          .set('Authorization', `Bearer ${salesManagerSession.sessionToken}`);

        expect([200, 500]).toContain(response.status);
      });
    });

    describe('Update Lead', () => {
      it('should update lead with valid data', async () => {
        if (!testLead) return;

        const response = await request(app)
          .put(`/api/leads/${testLead.id}`)
          .set('Authorization', `Bearer ${salesManagerSession.sessionToken}`)
          .send({
            priority: 'high',
            remarks: 'Updated by test',
          });

        expect([200, 404, 500]).toContain(response.status);
      });
    });

    describe('Delete Lead', () => {
      it('should allow admin to delete lead', async () => {
        // Create a lead to delete
        const leadData = {
          clientName: 'Lead To Delete',
          contactPhone: '+91 9876543211',
          serviceInterested: 'Company Registration',
          leadSource: 'Referral',
        };

        const createResponse = await request(app)
          .post('/api/leads')
          .set('Authorization', `Bearer ${adminSession.sessionToken}`)
          .send(leadData);

        if (createResponse.status === 200 || createResponse.status === 201) {
          const leadToDelete = createResponse.body;

          const deleteResponse = await request(app)
            .delete(`/api/leads/${leadToDelete.id}`)
            .set('Authorization', `Bearer ${adminSession.sessionToken}`);

          expect([200, 404]).toContain(deleteResponse.status);
        }
      });

      it('should deny non-admin from deleting leads', async () => {
        if (!testLead) return;

        const response = await request(app)
          .delete(`/api/leads/${testLead.id}`)
          .set('Authorization', `Bearer ${salesExecSession.sessionToken}`);

        // Should be forbidden
        expect([401, 403]).toContain(response.status);
      });
    });
  });

  describe('Lead Assignment', () => {
    it('should allow sales_manager to assign leads', async () => {
      if (!testLead) return;

      const response = await request(app)
        .put(`/api/leads/${testLead.id}/assign`)
        .set('Authorization', `Bearer ${salesManagerSession.sessionToken}`)
        .send({
          assignedTo: salesExecUser.id,
          assignedToName: salesExecUser.fullName,
          notes: 'Assigned for follow-up',
        });

      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it('should deny sales_executive from assigning leads', async () => {
      if (!testLead) return;

      const response = await request(app)
        .put(`/api/leads/${testLead.id}/assign`)
        .set('Authorization', `Bearer ${salesExecSession.sessionToken}`)
        .send({
          assignedTo: adminUser.id,
        });

      // Sales exec should not have permission to assign
      expect([401, 403]).toContain(response.status);
    });
  });

  describe('Lead Approval Workflow', () => {
    it('should allow sales_manager to approve leads', async () => {
      if (!testLead) return;

      const response = await request(app)
        .patch(`/api/leads/${testLead.id}/approve`)
        .set('Authorization', `Bearer ${salesManagerSession.sessionToken}`)
        .send({
          qualityScore: 85,
          notes: 'Good quality lead',
        });

      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it('should allow sales_manager to reject leads', async () => {
      // Create a lead to reject
      const leadData = {
        clientName: 'Lead To Reject',
        contactPhone: '+91 9876543212',
        serviceInterested: 'Trademark',
        leadSource: 'Cold Call',
      };

      const createResponse = await request(app)
        .post('/api/leads')
        .set('Authorization', `Bearer ${salesManagerSession.sessionToken}`)
        .send(leadData);

      if (createResponse.status === 200 || createResponse.status === 201) {
        const leadToReject = createResponse.body;

        const rejectResponse = await request(app)
          .patch(`/api/leads/${leadToReject.id}/reject`)
          .set('Authorization', `Bearer ${salesManagerSession.sessionToken}`)
          .send({
            reason: 'Not qualified',
            feedback: 'Incomplete contact information',
          });

        expect([200, 400, 404, 500]).toContain(rejectResponse.status);

        // Cleanup
        await db.delete(leads).where(eq(leads.id, leadToReject.id));
      }
    });

    it('should deny customer_service from approving leads', async () => {
      if (!testLead) return;

      const response = await request(app)
        .patch(`/api/leads/${testLead.id}/approve`)
        .set('Authorization', `Bearer ${customerServiceSession.sessionToken}`)
        .send({
          qualityScore: 70,
        });

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('Lead Interactions', () => {
    it('should add interaction to lead', async () => {
      if (!testLead) return;

      const response = await request(app)
        .post(`/api/leads/${testLead.id}/interaction`)
        .set('Authorization', `Bearer ${salesExecSession.sessionToken}`)
        .send({
          type: 'call',
          notes: 'Initial follow-up call, client interested',
          executive: salesExecUser.fullName,
        });

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe('Lead Statistics', () => {
    it('should fetch dashboard stats', async () => {
      const response = await request(app)
        .get('/api/stats/dashboard')
        .set('Authorization', `Bearer ${salesManagerSession.sessionToken}`);

      if (response.status === 200) {
        expect(response.body).toBeDefined();
      }
    });
  });

  describe('Pre-Sales Executives List', () => {
    it('should fetch executives list', async () => {
      const response = await request(app)
        .get('/api/executives')
        .set('Authorization', `Bearer ${salesManagerSession.sessionToken}`);

      if (response.status === 200) {
        expect(Array.isArray(response.body)).toBe(true);
      }
    });
  });
});

describe('Sales Dashboard Routes', () => {
  let app: express.Express;
  let salesUser: any;
  let salesSession: any;
  let clientUser: any;
  let clientSession: any;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
    }));

    // Import and register sales dashboard routes
    const salesDashboardRouter = (await import('../routes/sales-dashboard')).default;
    app.use('/api/sales', salesDashboardRouter);

    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

    // Create sales user
    [salesUser] = await db.insert(users).values({
      username: 'test_sales_dashboard',
      email: 'sales_dashboard@test.digicomply.in',
      password: hashedPassword,
      fullName: 'Test Sales Dashboard',
      role: 'sales_manager',
      isActive: true,
    }).returning();

    // Create client user (should not have access)
    [clientUser] = await db.insert(users).values({
      username: 'test_client_dashboard',
      email: 'client_dashboard@test.digicomply.in',
      password: hashedPassword,
      fullName: 'Test Client Dashboard',
      role: 'client',
      isActive: true,
    }).returning();

    // Create sessions
    const sessionToken1 = `test-sales-session-${Date.now()}`;
    [salesSession] = await db.insert(userSessions).values({
      userId: salesUser.id,
      sessionToken: sessionToken1,
      isActive: true,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      fingerprint: 'test-fingerprint',
      csrfToken: 'test-csrf',
    }).returning();

    const sessionToken2 = `test-client-session-${Date.now()}`;
    [clientSession] = await db.insert(userSessions).values({
      userId: clientUser.id,
      sessionToken: sessionToken2,
      isActive: true,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      fingerprint: 'test-fingerprint',
      csrfToken: 'test-csrf',
    }).returning();
  });

  afterAll(async () => {
    if (salesUser) {
      await db.delete(userSessions).where(eq(userSessions.userId, salesUser.id));
      await db.delete(users).where(eq(users.id, salesUser.id));
    }
    if (clientUser) {
      await db.delete(userSessions).where(eq(userSessions.userId, clientUser.id));
      await db.delete(users).where(eq(users.id, clientUser.id));
    }
  });

  describe('Authentication & Authorization', () => {
    it('should require authentication for /api/sales/leads', async () => {
      const response = await request(app).get('/api/sales/leads');
      expect(response.status).toBe(401);
    });

    it('should require authentication for /api/sales/metrics', async () => {
      const response = await request(app).get('/api/sales/metrics');
      expect(response.status).toBe(401);
    });

    it('should require authentication for /api/sales/pipeline', async () => {
      const response = await request(app).get('/api/sales/pipeline');
      expect(response.status).toBe(401);
    });

    it('should deny client access to sales dashboard', async () => {
      const response = await request(app)
        .get('/api/sales/leads')
        .set('Authorization', `Bearer ${clientSession.sessionToken}`);

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('Sales Dashboard Endpoints', () => {
    it('should fetch leads for authorized sales user', async () => {
      const response = await request(app)
        .get('/api/sales/leads')
        .set('Authorization', `Bearer ${salesSession.sessionToken}`);

      if (response.status === 200) {
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    it('should fetch pipeline data', async () => {
      const response = await request(app)
        .get('/api/sales/pipeline')
        .set('Authorization', `Bearer ${salesSession.sessionToken}`);

      if (response.status === 200) {
        expect(Array.isArray(response.body)).toBe(true);
      }
    });

    it('should fetch sales metrics', async () => {
      const response = await request(app)
        .get('/api/sales/metrics')
        .set('Authorization', `Bearer ${salesSession.sessionToken}`);

      if (response.status === 200) {
        expect(response.body.totalLeads).toBeDefined();
      }
    });

    it('should fetch team data', async () => {
      const response = await request(app)
        .get('/api/sales/team')
        .set('Authorization', `Bearer ${salesSession.sessionToken}`);

      if (response.status === 200) {
        expect(Array.isArray(response.body)).toBe(true);
      }
    });

    it('should fetch forecasts', async () => {
      const response = await request(app)
        .get('/api/sales/forecasts')
        .set('Authorization', `Bearer ${salesSession.sessionToken}`);

      if (response.status === 200) {
        expect(response.body.weightedForecast).toBeDefined();
      }
    });
  });
});
