import { db } from './db';
import { 
  integrationCredentials, 
  governmentFilings, 
  apiAuditLogs, 
  integrationJobs,
  InsertIntegrationCredential,
  InsertGovernmentFiling,
  InsertApiAuditLog,
  InsertIntegrationJob
} from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { encryptCredential, decryptCredential } from './encryption';

// ============================================================================
// INTEGRATION HUB - Core Service for Government API Integration
// Separate from portal - handles input/output with GSP, ERI, MCA21
// SECURITY: All sensitive credentials are encrypted at rest
// ============================================================================

export class IntegrationHub {
  
  // ========================================================================
  // CREDENTIAL MANAGEMENT (Encrypted)
  // ========================================================================
  
  async storeCredentials(data: InsertIntegrationCredential) {
    // Encrypt sensitive fields before storing
    const encryptedData = { ...data };
    
    if (data.username) {
      encryptedData.username = await encryptCredential(data.username);
    }
    if (data.apiKey) {
      encryptedData.apiKey = await encryptCredential(data.apiKey);
    }
    if (data.clientSecret) {
      encryptedData.clientSecret = await encryptCredential(data.clientSecret);
    }
    if (data.tokenData) {
      encryptedData.tokenData = JSON.parse(await encryptCredential(JSON.stringify(data.tokenData)));
    }
    
    const [credential] = await db.insert(integrationCredentials).values(encryptedData).returning();
    return credential;
  }

  async getCredentials(clientId: number, portalType: string) {
    const credentials = await db
      .select()
      .from(integrationCredentials)
      .where(
        and(
          eq(integrationCredentials.clientId, clientId),
          eq(integrationCredentials.portalType, portalType),
          eq(integrationCredentials.isActive, true)
        )
      )
      .limit(1);
    
    if (!credentials[0]) return null;
    
    // Decrypt sensitive fields before returning
    const decryptedCredential = { ...credentials[0] };
    
    if (credentials[0].username) {
      decryptedCredential.username = await decryptCredential(credentials[0].username);
    }
    if (credentials[0].apiKey) {
      decryptedCredential.apiKey = await decryptCredential(credentials[0].apiKey);
    }
    if (credentials[0].clientSecret) {
      decryptedCredential.clientSecret = await decryptCredential(credentials[0].clientSecret);
    }
    if (credentials[0].tokenData) {
      const decryptedToken = await decryptCredential(JSON.stringify(credentials[0].tokenData));
      decryptedCredential.tokenData = JSON.parse(decryptedToken);
    }
    
    return decryptedCredential;
  }

  async updateCredentials(id: number, updates: Partial<InsertIntegrationCredential>) {
    const [updated] = await db
      .update(integrationCredentials)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(integrationCredentials.id, id))
      .returning();
    
    return updated;
  }

  async deactivateCredentials(id: number) {
    await db
      .update(integrationCredentials)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(integrationCredentials.id, id));
  }

  // ========================================================================
  // FILING MANAGEMENT
  // ========================================================================

  async createFiling(data: InsertGovernmentFiling) {
    const [filing] = await db.insert(governmentFilings).values(data).returning();
    return filing;
  }

  async updateFiling(id: number, updates: Partial<InsertGovernmentFiling>) {
    const [updated] = await db
      .update(governmentFilings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(governmentFilings.id, id))
      .returning();
    
    return updated;
  }

  async getFilingsByClient(clientId: number, portalType?: string) {
    const conditions = [eq(governmentFilings.clientId, clientId)];
    
    if (portalType) {
      conditions.push(eq(governmentFilings.portalType, portalType));
    }
    
    return await db
      .select()
      .from(governmentFilings)
      .where(and(...conditions))
      .orderBy(desc(governmentFilings.createdAt));
  }

  async getFilingById(id: number) {
    const filings = await db
      .select()
      .from(governmentFilings)
      .where(eq(governmentFilings.id, id))
      .limit(1);
    
    return filings[0] || null;
  }

  // ========================================================================
  // API AUDIT LOGGING
  // ========================================================================

  async logApiCall(data: InsertApiAuditLog) {
    const [log] = await db.insert(apiAuditLogs).values(data).returning();
    return log;
  }

  async getApiLogs(clientId: number, portalType?: string, limit = 100) {
    const conditions = [];
    
    if (clientId) {
      conditions.push(eq(apiAuditLogs.clientId, clientId));
    }
    
    if (portalType) {
      conditions.push(eq(apiAuditLogs.portalType, portalType));
    }
    
    if (conditions.length === 0) {
      return await db
        .select()
        .from(apiAuditLogs)
        .orderBy(desc(apiAuditLogs.timestamp))
        .limit(limit);
    }
    
    return await db
      .select()
      .from(apiAuditLogs)
      .where(and(...conditions))
      .orderBy(desc(apiAuditLogs.timestamp))
      .limit(limit);
  }

  // ========================================================================
  // JOB QUEUE MANAGEMENT
  // ========================================================================

  async createJob(data: InsertIntegrationJob) {
    const [job] = await db.insert(integrationJobs).values(data).returning();
    return job;
  }

  async getNextJob(portalType?: string) {
    const conditions = [eq(integrationJobs.status, 'queued')];
    
    if (portalType) {
      conditions.push(eq(integrationJobs.portalType, portalType));
    }
    
    const jobs = await db
      .select()
      .from(integrationJobs)
      .where(and(...conditions))
      .orderBy(desc(integrationJobs.priority), integrationJobs.createdAt)
      .limit(1);
    
    return jobs[0] || null;
  }

  async updateJob(id: number, updates: Partial<InsertIntegrationJob>) {
    const [updated] = await db
      .update(integrationJobs)
      .set(updates)
      .where(eq(integrationJobs.id, id))
      .returning();
    
    return updated;
  }

  async markJobProcessing(id: number) {
    const job = await this.getJobById(id);
    if (!job) return null;
    
    return this.updateJob(id, {
      status: 'processing',
      startedAt: new Date(),
      attempts: (job.attempts || 0) + 1,
      lastAttemptAt: new Date()
    });
  }

  async markJobCompleted(id: number, result: any) {
    return this.updateJob(id, {
      status: 'completed',
      completedAt: new Date(),
      result
    });
  }

  async markJobFailed(id: number, errorMessage: string, shouldRetry = true) {
    const job = await this.getJobById(id);
    if (!job) return null;

    const updates: any = {
      errorMessage,
      lastAttemptAt: new Date()
    };

    const attempts = job.attempts || 0;
    const maxAttempts = job.maxAttempts || 3;
    
    if (shouldRetry && attempts < maxAttempts) {
      updates.status = 'retry';
      const nextAttempt = new Date();
      nextAttempt.setMinutes(nextAttempt.getMinutes() + Math.pow(2, attempts) * 5);
      updates.nextAttemptAt = nextAttempt;
    } else {
      updates.status = 'failed';
      updates.completedAt = new Date();
    }

    return this.updateJob(id, updates);
  }

  async getJobById(id: number) {
    const jobs = await db
      .select()
      .from(integrationJobs)
      .where(eq(integrationJobs.id, id))
      .limit(1);
    
    return jobs[0] || null;
  }

  async getJobsByStatus(status: string, limit = 50) {
    return await db
      .select()
      .from(integrationJobs)
      .where(eq(integrationJobs.status, status))
      .orderBy(desc(integrationJobs.priority), integrationJobs.createdAt)
      .limit(limit);
  }
}

export const integrationHub = new IntegrationHub();
