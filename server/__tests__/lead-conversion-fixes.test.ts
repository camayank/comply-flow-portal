/**
 * Lead Conversion Fixes Tests
 * Verifies that lead conversion creates a business entity record
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { registerLeadsRoutes } from '../leads-routes';
import { db } from '../db';
import { users, leads, userSessions, businessEntities } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

describe('Lead Conversion — Business Entity Creation', () => {
  let app: express.Express;
  let csUser: any;
  let csSession: any;
  let testLead: any;

  // Track all created IDs for cleanup
  const createdUserIds: number[] = [];
  const createdLeadIds: number[] = [];
  const createdEntityIds: number[] = [];
  const createdSessionIds: number[] = [];

  beforeAll(async () => {
    // Setup Express app with session middleware
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    registerLeadsRoutes(app);

    // Create a customer_service user for performing conversions
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
    [csUser] = await db.insert(users).values({
      username: 'cs_lead_conv_test',
      email: 'cs_lead_conv@test.digicomply.in',
      password: hashedPassword,
      fullName: 'CS Lead Conv Test',
      role: 'customer_service',
      isActive: true,
    }).returning();
    createdUserIds.push(csUser.id);

    // Create a session for the user
    const sessionToken = `test-session-cs-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    [csSession] = await db.insert(userSessions).values({
      userId: csUser.id,
      sessionToken,
      isActive: true,
      expiresAt,
    }).returning();
    createdSessionIds.push(csSession.id);

    // Create a test lead to convert
    [testLead] = await db.insert(leads).values({
      leadId: `L_CONV_TEST_${Date.now()}`,
      clientName: 'Test Conversion Corp',
      contactEmail: 'conversion@testcorp.com',
      contactPhone: '9876543210',
      state: 'Maharashtra',
      entityType: 'pvt_ltd',
      serviceInterested: 'GST Registration',
      leadSource: 'website',
      leadStage: 'qualified',
      status: 'approved',
      priority: 'high',
    }).returning();
    createdLeadIds.push(testLead.id);
  });

  afterAll(async () => {
    // Cleanup in reverse dependency order
    for (const id of createdEntityIds) {
      await db.delete(businessEntities).where(eq(businessEntities.id, id)).catch(() => {});
    }
    for (const id of createdSessionIds) {
      await db.delete(userSessions).where(eq(userSessions.id, id)).catch(() => {});
    }
    // Delete any users created during conversion (look by email pattern)
    for (const leadId of createdLeadIds) {
      // Clean up converted user created by the route
      const lead = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
      if (lead[0]?.contactEmail) {
        const convUsers = await db.select().from(users).where(eq(users.email, lead[0].contactEmail));
        for (const u of convUsers) {
          if (!createdUserIds.includes(u.id)) {
            // Delete any business entities owned by this user
            await db.delete(businessEntities).where(eq(businessEntities.ownerId, u.id)).catch(() => {});
            await db.delete(userSessions).where(eq(userSessions.userId, u.id)).catch(() => {});
            await db.delete(users).where(eq(users.id, u.id)).catch(() => {});
          }
        }
      }
    }
    for (const id of createdLeadIds) {
      await db.delete(leads).where(eq(leads.id, id)).catch(() => {});
    }
    for (const id of createdUserIds) {
      await db.delete(userSessions).where(eq(userSessions.userId, id)).catch(() => {});
      await db.delete(users).where(eq(users.id, id)).catch(() => {});
    }
  });

  it('should create a business entity when converting a lead', async () => {
    const response = await request(app)
      .post(`/api/leads/${testLead.id}/convert`)
      .set('Authorization', `Bearer ${csSession.sessionToken}`)
      .send({
        createServiceRequest: false,
        notes: 'Test conversion',
        convertedBy: 'test_user',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.businessEntity).toBeDefined();
    expect(response.body.businessEntity.id).toBeDefined();
    expect(response.body.businessEntity.name).toBe('Test Conversion Corp');

    // Verify the business entity was actually created in the database
    const [entity] = await db.select()
      .from(businessEntities)
      .where(eq(businessEntities.id, response.body.businessEntity.id));

    expect(entity).toBeDefined();
    expect(entity.name).toBe('Test Conversion Corp');
    expect(entity.entityType).toBe('pvt_ltd');
    expect(entity.contactEmail).toBe('conversion@testcorp.com');
    expect(entity.contactPhone).toBe('9876543210');
    expect(entity.state).toBe('Maharashtra');
    expect(entity.onboardingStage).toBe('pending');
    expect(entity.clientStatus).toBe('active');
    expect(entity.isActive).toBe(true);
    expect(entity.leadId).toBe(testLead.id);
    expect(entity.ownerId).toBe(response.body.user.id);

    // Track for cleanup
    createdEntityIds.push(entity.id);
  });

  it('should use clientName as entity name and default entityType when lead has no entityType', async () => {
    // Create a lead without entityType
    const [minimalLead] = await db.insert(leads).values({
      leadId: `L_CONV_MIN_${Date.now()}`,
      clientName: 'Minimal Lead Corp',
      contactEmail: `minimal_${Date.now()}@testcorp.com`,
      contactPhone: '9876500000',
      serviceInterested: 'Company Registration',
      leadSource: 'referral',
      leadStage: 'qualified',
      status: 'approved',
    }).returning();
    createdLeadIds.push(minimalLead.id);

    const response = await request(app)
      .post(`/api/leads/${minimalLead.id}/convert`)
      .set('Authorization', `Bearer ${csSession.sessionToken}`)
      .send({
        createServiceRequest: false,
        convertedBy: 'test_user',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.businessEntity).toBeDefined();

    // Verify entity in DB
    const [entity] = await db.select()
      .from(businessEntities)
      .where(eq(businessEntities.id, response.body.businessEntity.id));

    expect(entity).toBeDefined();
    expect(entity.name).toBe('Minimal Lead Corp');
    // Should default to 'proprietorship' when entityType not set on lead
    expect(entity.entityType).toBe('proprietorship');
    expect(entity.leadId).toBe(minimalLead.id);

    createdEntityIds.push(entity.id);
  });

  it('should not convert an already-converted lead', async () => {
    // testLead was already converted in the first test
    const response = await request(app)
      .post(`/api/leads/${testLead.id}/convert`)
      .set('Authorization', `Bearer ${csSession.sessionToken}`)
      .send({
        createServiceRequest: false,
        convertedBy: 'test_user',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('LEAD_ALREADY_CONVERTED');
  });
});
