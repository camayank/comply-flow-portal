import { db } from './db';
import { leads, salesProposals, serviceRequests, businessEntities, payments } from '../shared/schema';
import { eq, desc, ilike, and, or, sql } from 'drizzle-orm';
import type { 
  LeadEnhanced, InsertLeadEnhanced, 
  SalesProposal, InsertSalesProposal,
  ServiceRequest, InsertServiceRequest,
  BusinessEntity, InsertBusinessEntity,
  Payment, InsertPayment
} from '../shared/schema';

// Database-backed storage for critical entities (Leads & Proposals)
// This ensures data persists across server restarts
export class DbLeadsStorage {
  
  async getAllLeads(filters?: {
    search?: string;
    stage?: string;
    source?: string;
    executive?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ leads: LeadEnhanced[]; total: number }> {
    const conditions = [];
    
    if (filters?.search) {
      conditions.push(or(
        ilike(leads.clientName, `%${filters.search}%`),
        ilike(leads.contactEmail, `%${filters.search}%`),
        ilike(leads.contactPhone, `%${filters.search}%`)
      ));
    }
    
    if (filters?.stage) {
      conditions.push(eq(leads.leadStage, filters.stage));
    }
    
    if (filters?.source) {
      conditions.push(eq(leads.leadSource, filters.source));
    }
    
    if (filters?.executive) {
      conditions.push(eq(leads.preSalesExecutive, filters.executive));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const [leadsData, [{ count }]] = await Promise.all([
      db.select()
        .from(leads)
        .where(whereClause)
        .orderBy(desc(leads.createdAt))
        .limit(filters?.limit || 50)
        .offset(filters?.offset || 0),
      db.select({ count: sql<number>`count(*)::int` })
        .from(leads)
        .where(whereClause)
    ]);
    
    return { leads: leadsData, total: count };
  }
  
  async getLead(id: number): Promise<LeadEnhanced | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    return lead;
  }
  
  async createLead(lead: InsertLeadEnhanced): Promise<LeadEnhanced> {
    const leadId = `L${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const [newLead] = await db.insert(leads).values({ ...lead, leadId }).returning();
    return newLead;
  }
  
  async updateLead(id: number, updates: Partial<LeadEnhanced>): Promise<LeadEnhanced | undefined> {
    const [updatedLead] = await db.update(leads)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return updatedLead;
  }
  
  async deleteLead(id: number): Promise<boolean> {
    const result = await db.delete(leads).where(eq(leads.id, id));
    return true;
  }
  
  async addLeadInteraction(id: number, interaction: { type: string; notes: string; executive: string }): Promise<LeadEnhanced | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    if (!lead) return undefined;
    
    const history = (lead.interactionHistory as any[]) || [];
    history.push({ ...interaction, date: new Date() });
    
    const [updated] = await db.update(leads)
      .set({ interactionHistory: history, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return updated;
  }
  
  async getLeadStats(): Promise<{
    stageDistribution: Record<string, number>;
    sourceDistribution: Record<string, number>;
    totalLeads: number;
    recentLeads: number;
    conversionRate: number;
  }> {
    const allLeads = await db.select().from(leads);
    
    const stageDistribution: Record<string, number> = {};
    const sourceDistribution: Record<string, number> = {};
    let convertedCount = 0;
    let recentCount = 0;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    allLeads.forEach(lead => {
      if (lead.leadStage) {
        stageDistribution[lead.leadStage] = (stageDistribution[lead.leadStage] || 0) + 1;
      }
      if (lead.leadSource) {
        sourceDistribution[lead.leadSource] = (sourceDistribution[lead.leadSource] || 0) + 1;
      }
      if (lead.status === 'converted') {
        convertedCount++;
      }
      if (lead.createdAt && lead.createdAt >= thirtyDaysAgo) {
        recentCount++;
      }
    });
    
    return {
      stageDistribution,
      sourceDistribution,
      totalLeads: allLeads.length,
      recentLeads: recentCount,
      conversionRate: allLeads.length > 0 ? Math.round((convertedCount / allLeads.length) * 100) : 0
    };
  }
  
  async getPreSalesExecutives(): Promise<string[]> {
    const results = await db.selectDistinct({ executive: leads.preSalesExecutive })
      .from(leads)
      .where(sql`${leads.preSalesExecutive} IS NOT NULL`);
    return results.map(r => r.executive).filter(Boolean) as string[];
  }
}

export class DbProposalsStorage {
  async getAllProposals(filters?: {
    search?: string;
    status?: string;
    executive?: string;
    viewMode?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ proposals: SalesProposal[]; total: number }> {
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(salesProposals.proposalStatus, filters.status));
    }
    
    if (filters?.executive) {
      conditions.push(eq(salesProposals.salesExecutive, filters.executive));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const [proposalsData, [{ count }]] = await Promise.all([
      db.select()
        .from(salesProposals)
        .where(whereClause)
        .orderBy(desc(salesProposals.createdAt))
        .limit(filters?.limit || 50)
        .offset(filters?.offset || 0),
      db.select({ count: sql<number>`count(*)::int` })
        .from(salesProposals)
        .where(whereClause)
    ]);
    
    return { proposals: proposalsData, total: count };
  }
  
  async getProposal(id: number): Promise<SalesProposal | undefined> {
    const [proposal] = await db.select().from(salesProposals).where(eq(salesProposals.id, id)).limit(1);
    return proposal;
  }
  
  async getSalesProposalsByLead(leadId: string): Promise<SalesProposal[]> {
    return await db.select().from(salesProposals).where(eq(salesProposals.leadId, leadId));
  }
  
  async createSalesProposal(proposal: InsertSalesProposal): Promise<SalesProposal> {
    const [newProposal] = await db.insert(salesProposals).values(proposal).returning();
    return newProposal;
  }
  
  async updateProposal(id: number, updates: Partial<SalesProposal>): Promise<SalesProposal | undefined> {
    const [updated] = await db.update(salesProposals)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(salesProposals.id, id))
      .returning();
    return updated;
  }
  
  async deleteProposal(id: number): Promise<boolean> {
    await db.delete(salesProposals).where(eq(salesProposals.id, id));
    return true;
  }
  
  async sendProposal(id: number): Promise<SalesProposal | undefined> {
    const [updated] = await db.update(salesProposals)
      .set({ proposalStatus: 'sent', updatedAt: new Date() })
      .where(eq(salesProposals.id, id))
      .returning();
    return updated;
  }
  
  async getProposalStats(): Promise<{
    statusDistribution: Record<string, number>;
    totalProposals: number;
    recentProposals: number;
    totalValue: number;
    conversionRate: number;
    avgProposalValue: number;
    pendingApprovals: number;
  }> {
    const allProposals = await db.select().from(salesProposals);
    
    const statusDistribution: Record<string, number> = {};
    let totalValue = 0;
    let recentCount = 0;
    let acceptedCount = 0;
    let pendingApprovals = 0;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    allProposals.forEach(proposal => {
      const status = proposal.proposalStatus || 'unknown';
      statusDistribution[status] = (statusDistribution[status] || 0) + 1;
      
      totalValue += Number(proposal.proposalAmount || 0);
      if (proposal.createdAt && proposal.createdAt >= thirtyDaysAgo) {
        recentCount++;
      }
      if (status === 'approved') {
        acceptedCount++;
      }
      if (status === 'sent') {
        pendingApprovals++;
      }
    });
    
    return {
      statusDistribution,
      totalProposals: allProposals.length,
      recentProposals: recentCount,
      totalValue,
      conversionRate: allProposals.length > 0 ? Math.round((acceptedCount / allProposals.length) * 100) : 0,
      avgProposalValue: allProposals.length > 0 ? Math.round(totalValue / allProposals.length) : 0,
      pendingApprovals
    };
  }
}

// Service Requests Storage
export class DbServiceRequestsStorage {
  async getAllServiceRequests(filters?: {
    search?: string;
    status?: string;
    clientId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ requests: ServiceRequest[]; total: number }> {
    const conditions = [];
    
    if (filters?.search) {
      conditions.push(ilike(serviceRequests.serviceId, `%${filters.search}%`));
    }
    
    if (filters?.status) {
      conditions.push(eq(serviceRequests.status, filters.status));
    }
    
    if (filters?.clientId) {
      conditions.push(eq(serviceRequests.businessEntityId, parseInt(filters.clientId)));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const [requestsData, [{ count }]] = await Promise.all([
      db.select()
        .from(serviceRequests)
        .where(whereClause)
        .orderBy(desc(serviceRequests.createdAt))
        .limit(filters?.limit || 50)
        .offset(filters?.offset || 0),
      db.select({ count: sql<number>`count(*)::int` })
        .from(serviceRequests)
        .where(whereClause)
    ]);
    
    return { requests: requestsData, total: count };
  }
  
  async getServiceRequest(id: number): Promise<ServiceRequest | undefined> {
    const [request] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, id)).limit(1);
    return request;
  }
  
  async createServiceRequest(request: InsertServiceRequest): Promise<ServiceRequest> {
    const [newRequest] = await db.insert(serviceRequests).values(request).returning();
    return newRequest;
  }
  
  async updateServiceRequest(id: number, updates: Partial<ServiceRequest>): Promise<ServiceRequest | undefined> {
    const [updated] = await db.update(serviceRequests)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(serviceRequests.id, id))
      .returning();
    return updated;
  }
  
  async deleteServiceRequest(id: number): Promise<boolean> {
    await db.delete(serviceRequests).where(eq(serviceRequests.id, id));
    return true;
  }
}

// Business Entities (Clients) Storage
export class DbBusinessEntitiesStorage {
  async getAllBusinessEntities(filters?: {
    search?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ entities: BusinessEntity[]; total: number }> {
    const conditions = [];
    
    if (filters?.search) {
      conditions.push(or(
        ilike(businessEntities.name, `%${filters.search}%`),
        ilike(businessEntities.pan, `%${filters.search}%`),
        ilike(businessEntities.gstin, `%${filters.search}%`)
      ));
    }
    
    if (filters?.isActive !== undefined) {
      conditions.push(eq(businessEntities.isActive, filters.isActive));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const [entitiesData, [{ count }]] = await Promise.all([
      db.select()
        .from(businessEntities)
        .where(whereClause)
        .orderBy(desc(businessEntities.createdAt))
        .limit(filters?.limit || 50)
        .offset(filters?.offset || 0),
      db.select({ count: sql<number>`count(*)::int` })
        .from(businessEntities)
        .where(whereClause)
    ]);
    
    return { entities: entitiesData, total: count };
  }
  
  async getBusinessEntity(id: number): Promise<BusinessEntity | undefined> {
    const [entity] = await db.select().from(businessEntities).where(eq(businessEntities.id, id)).limit(1);
    return entity;
  }
  
  async createBusinessEntity(entity: InsertBusinessEntity): Promise<BusinessEntity> {
    const [newEntity] = await db.insert(businessEntities).values(entity).returning();
    return newEntity;
  }
  
  async updateBusinessEntity(id: number, updates: Partial<BusinessEntity>): Promise<BusinessEntity | undefined> {
    const [updated] = await db.update(businessEntities)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(businessEntities.id, id))
      .returning();
    return updated;
  }
  
  async deleteBusinessEntity(id: number): Promise<boolean> {
    await db.delete(businessEntities).where(eq(businessEntities.id, id));
    return true;
  }
}

// Payments Storage
export class DbPaymentsStorage {
  async getAllPayments(filters?: {
    search?: string;
    status?: string;
    serviceRequestId?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ payments: Payment[]; total: number }> {
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(payments.status, filters.status));
    }
    
    if (filters?.serviceRequestId) {
      conditions.push(eq(payments.serviceRequestId, filters.serviceRequestId));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const [paymentsData, [{ count }]] = await Promise.all([
      db.select()
        .from(payments)
        .where(whereClause)
        .orderBy(desc(payments.createdAt))
        .limit(filters?.limit || 50)
        .offset(filters?.offset || 0),
      db.select({ count: sql<number>`count(*)::int` })
        .from(payments)
        .where(whereClause)
    ]);
    
    return { payments: paymentsData, total: count };
  }
  
  async getPayment(id: number): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
    return payment;
  }
  
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return newPayment;
  }
  
  async updatePayment(id: number, updates: Partial<Payment>): Promise<Payment | undefined> {
    const [updated] = await db.update(payments)
      .set(updates)
      .where(eq(payments.id, id))
      .returning();
    return updated;
  }
  
  async deletePayment(id: number): Promise<boolean> {
    await db.delete(payments).where(eq(payments.id, id));
    return true;
  }
}

// Export instances
export const dbLeadsStorage = new DbLeadsStorage();
export const dbProposalsStorage = new DbProposalsStorage();
export const dbServiceRequestsStorage = new DbServiceRequestsStorage();
export const dbBusinessEntitiesStorage = new DbBusinessEntitiesStorage();
export const dbPaymentsStorage = new DbPaymentsStorage();
