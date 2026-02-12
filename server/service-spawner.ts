import cron from 'node-cron';
import { db } from './db';
import { 
  entityServices,
  businessEntities,
  servicesCatalog,
  dueDateMaster,
  serviceRequests
} from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

// Automated Service Order Spawner for Universal Service Provider Platform
export class ServiceSpawner {
  private isRunning = false;
  private cronJob: any = null;

  constructor() {
    this.initializeSpawner();
  }

  private async initializeSpawner() {
    const { jobManager } = await import('./job-lifecycle-manager.js');

    // Run daily at 06:30 IST to spawn new service orders
    this.cronJob = cron.schedule('30 6 * * *', async () => {
      if (this.isRunning) {
        console.log('⏳ Spawner already running, skipping this cycle');
        return;
      }

      console.log('🌱 Starting daily service order spawning...');
      this.isRunning = true;

      try {
        await this.spawnPeriodicServices();
      } catch (error) {
        console.error('❌ Error in spawner:', error);
      } finally {
        this.isRunning = false;
      }
    }, {
      timezone: 'Asia/Kolkata',
      scheduled: false // Don't start automatically
    });

    jobManager.registerCron(
      'service-spawner',
      this.cronJob,
      'Daily service order spawning at 06:30 IST - creates periodic service requests'
    );

    this.cronJob.start();

    console.log('✅ Service spawner initialized - runs daily at 06:30 IST - managed by JobLifecycleManager');
  }

  async spawnPeriodicServices() {
    try {
      // Get all active entity-service bindings with their rules
      const bindings = await db
        .select({
          binding: entityServices,
          entity: businessEntities,
          service: servicesCatalog,
          dueRule: dueDateMaster
        })
        .from(entityServices)
        .leftJoin(businessEntities, eq(entityServices.entityId, businessEntities.id))
        .leftJoin(servicesCatalog, eq(entityServices.serviceKey, servicesCatalog.serviceKey))
        .leftJoin(dueDateMaster, 
          and(
            eq(dueDateMaster.serviceKey, entityServices.serviceKey),
            eq(dueDateMaster.isActive, true),
            eq(dueDateMaster.jurisdiction, entityServices.jurisdiction)
          )
        )
        .where(
          and(
            eq(entityServices.isActive, true),
            eq(servicesCatalog.isActive, true)
          )
        );

      console.log(`📋 Processing ${bindings.length} entity-service bindings`);

      let spawnedCount = 0;
      const today = new Date();

      for (const binding of bindings) {
        const { binding: b, entity: e, service: s, dueRule: d } = binding;
        
        if (!e || !s) continue;

        // Determine periodicity (override or default)
        const periodicity = b.periodicityOverride || s.periodicity;
        
        // Skip one-time services that might already be completed
        if (periodicity === 'ONE_TIME') {
          const existingOrder = await db
            .select()
            .from(serviceRequests)
            .where(
              and(
                eq(serviceRequests.businessEntityId, b.entityId),
                eq(serviceRequests.serviceId, b.serviceKey)
              )
            )
            .limit(1);
          
          if (existingOrder.length > 0) continue;
        }

        // Compute due date using rules
        const ruleJson = d?.ruleJson ? JSON.parse(d.ruleJson) : this.getDefaultRule(periodicity);
        const metaData = b.metaJson ? JSON.parse(b.metaJson) : {};
        const dueDate = this.computeDueDate(ruleJson, today, metaData);
        
        // Generate period label
        const periodLabel = this.generatePeriodLabel(periodicity, today);

        // Check if order already exists for this period
        const existingOrder = await db
          .select()
          .from(serviceRequests)
          .where(
            and(
              eq(serviceRequests.businessEntityId, b.entityId),
              eq(serviceRequests.serviceId, b.serviceKey),
              eq(serviceRequests.periodLabel, periodLabel)
            )
          )
          .limit(1);

        if (existingOrder.length > 0) {
          console.log(`⏭️ Order already exists: ${e.name} - ${s.name} (${periodLabel})`);
          continue;
        }

        // Create new service order
        const [newOrder] = await db
          .insert(serviceRequests)
          .values({
            businessEntityId: b.entityId,
            entityId: b.entityId,
            serviceId: b.serviceKey,
            serviceType: b.serviceKey,
            totalAmount: 0,
            periodicity,
            periodLabel,
            dueDate: new Date(dueDate),
            status: 'initiated',
            priority: this.determinePriority(dueDate, today),
            description: `${s.name} for ${periodLabel}`
          })
          .returning();

        spawnedCount++;
        console.log(`✅ Spawned: ${e.name} - ${s.name} (${periodLabel}) due ${dueDate}`);

        // TODO: Trigger workflow initialization if template exists
        // await this.initializeWorkflow(newOrder.id, b.serviceKey);
      }

      console.log(`🎉 Spawning complete: ${spawnedCount} new service orders created`);
      
      // Generate summary report
      await this.generateSpawningSummary(spawnedCount, bindings.length);

    } catch (error) {
      console.error('❌ Error spawning periodic services:', error);
      throw error;
    }
  }

  private computeDueDate(ruleJson: any, baseDate = new Date(), meta: any = {}): string {
    const r = typeof ruleJson === 'string' ? JSON.parse(ruleJson) : ruleJson;

    if (r?.dueInDays || r?.days_after) {
      const days = Number(r.dueInDays ?? r.days_after ?? 0);
      const due = new Date(baseDate);
      due.setDate(due.getDate() + days);
      return due.toISOString().slice(0, 10);
    }

    if (r?.day && r?.month) {
      const monthIndex = Number(r.month) - 1;
      let year = baseDate.getFullYear();
      const candidate = new Date(year, monthIndex, Number(r.day));
      if (candidate < baseDate) {
        year += 1;
      }
      const due = new Date(year, monthIndex, Number(r.day));
      return due.toISOString().slice(0, 10);
    }

    if (r?.day && r?.month_offset !== undefined) {
      const offset = Number(r.month_offset);
      const baseMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + offset, 1);
      const due = new Date(baseMonth.getFullYear(), baseMonth.getMonth(), Number(r.day));
      return due.toISOString().slice(0, 10);
    }

    // MONTHLY
    if (r.periodicity === 'MONTHLY') {
      const currentMonth = baseDate.getMonth();
      const currentYear = baseDate.getFullYear();
      
      // For current month or next month based on current date
      let targetMonth = currentMonth;
      let targetYear = currentYear;
      
      // If we're past the due day for this month, target next month
      if (baseDate.getDate() > (r.dueDayOfMonth || 20)) {
        targetMonth = currentMonth + 1;
        if (targetMonth > 11) {
          targetMonth = 0;
          targetYear++;
        }
      }
      
      const due = new Date(targetYear, targetMonth, r.dueDayOfMonth || 20);
      return due.toISOString().slice(0, 10);
    }

    // QUARTERLY
    if (r.periodicity === 'QUARTERLY') {
      const currentMonth = baseDate.getMonth();
      const currentYear = baseDate.getFullYear();
      
      if (r.quarterDue) {
        // Financial year quarters (Apr-Mar)
        const fyMonth = currentMonth >= 3 ? currentMonth - 3 : currentMonth + 9;
        const q = Math.floor(fyMonth / 3) + 1;
        const quarterKey = `Q${q}`;
        
        if (r.quarterDue[quarterKey]) {
          const [MM, DD] = r.quarterDue[quarterKey].split('-');
          let year = currentYear;
          if (currentMonth < 3 && q > 2) year--; // Previous FY
          return `${year}-${MM.padStart(2, '0')}-${DD.padStart(2, '0')}`;
        }
      }
      
      if (r.dueDayOfQuarter) {
        const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
        const due = new Date(currentYear, quarterStartMonth + 2, r.dueDayOfQuarter);
        return due.toISOString().slice(0, 10);
      }
    }

    // ANNUAL
    if (r.periodicity === 'ANNUAL') {
      if (r.fallbackDue) {
        const [MM, DD] = r.fallbackDue.split('-');
        let year = baseDate.getFullYear();
        
        // If we're past the annual due date, target next year
        const thisYearDue = new Date(year, parseInt(MM) - 1, parseInt(DD));
        if (baseDate > thisYearDue) {
          year++;
        }
        
        return `${year}-${MM.padStart(2, '0')}-${DD.padStart(2, '0')}`;
      }
      
      if (r.basedOnFSApproval) {
        // Default to March 31st for FY end
        const fyEndYear = baseDate.getMonth() >= 3 ? baseDate.getFullYear() + 1 : baseDate.getFullYear();
        return `${fyEndYear}-03-31`;
      }
    }

    // Default: 20th of current month or next month
    let targetDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 20);
    if (baseDate.getDate() > 20) {
      targetDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 20);
    }
    
    return targetDate.toISOString().slice(0, 10);
  }

  private generatePeriodLabel(periodicity: string, baseDate: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Kolkata'
    };

    switch (periodicity) {
      case 'MONTHLY':
        return baseDate.toLocaleString('en-IN', { 
          month: 'short', 
          year: 'numeric',
          ...options 
        });
      
      case 'QUARTERLY':
        const quarter = Math.floor(baseDate.getMonth() / 3) + 1;
        return `Q${quarter} ${baseDate.getFullYear()}`;
      
      case 'ANNUAL':
        const fyStartYear = baseDate.getMonth() >= 3 ? baseDate.getFullYear() : baseDate.getFullYear() - 1;
        return `FY ${fyStartYear}-${(fyStartYear + 1).toString().slice(-2)}`;
      
      case 'ONE_TIME':
        return 'One-time';
      
      default:
        return baseDate.toLocaleString('en-IN', { 
          month: 'short', 
          year: 'numeric',
          ...options 
        });
    }
  }

  private getDefaultRule(periodicity: string): any {
    const defaultRules = {
      'MONTHLY': {
        periodicity: 'MONTHLY',
        dueDayOfMonth: 20,
        nudges: { tMinus: [7, 3, 1], fixedDays: [1, 2] }
      },
      'QUARTERLY': {
        periodicity: 'QUARTERLY',
        dueDayOfQuarter: 30,
        nudges: { tMinus: [10, 5, 2] }
      },
      'ANNUAL': {
        periodicity: 'ANNUAL',
        fallbackDue: '03-31',
        nudges: { tMinus: [30, 7, 1] }
      },
      'ONGOING': {
        periodicity: 'ONGOING',
        dueInDays: 7,
        nudges: { tMinus: [3, 1] }
      },
      'ONE_TIME': {
        periodicity: 'ONE_TIME',
        dueInDays: 14,
        nudges: { tMinus: [7, 3, 1] }
      }
    };

    return defaultRules[periodicity] || defaultRules['MONTHLY'];
  }

  private determinePriority(dueDate: string, currentDate: Date): string {
    const due = new Date(dueDate);
    const daysDiff = Math.ceil((due.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 3) return 'high';
    if (daysDiff <= 7) return 'medium';
    return 'low';
  }

  private async generateSpawningSummary(spawnedCount: number, totalBindings: number) {
    try {
      // Get today's spawned orders by service type
      const todaySpawned = await db
        .select({
          serviceKey: sql<string>`coalesce(${serviceRequests.serviceId}, ${serviceRequests.serviceType})`,
          count: sql`count(*)`
        })
        .from(serviceRequests)
        .where(sql`date(created_at) = date('now')`)
        .groupBy(sql`coalesce(${serviceRequests.serviceId}, ${serviceRequests.serviceType})`);

      const summary = {
        date: new Date().toISOString().slice(0, 10),
        spawnedCount,
        totalBindings,
        spawnedByService: todaySpawned.map(s => ({
          serviceType: s.serviceKey,
          count: Number(s.count)
        }))
      };

      console.log('📊 Spawning Summary:', JSON.stringify(summary, null, 2));
      
      // TODO: Store summary in database or send notification to admin
      
    } catch (error) {
      console.error('❌ Error generating spawning summary:', error);
    }
  }

  // Manual trigger for testing
  async manualSpawn(entityId?: number, serviceKey?: string): Promise<any[]> {
    console.log('🔧 Manual spawning triggered');
    this.isRunning = true;

    try {
      let query = db
        .select({
          binding: entityServices,
          entity: businessEntities,
          service: servicesCatalog,
          dueRule: dueDateMaster
        })
        .from(entityServices)
        .leftJoin(businessEntities, eq(entityServices.entityId, businessEntities.id))
        .leftJoin(servicesCatalog, eq(entityServices.serviceKey, servicesCatalog.serviceKey))
        .leftJoin(dueDateMaster, 
          and(
            eq(dueDateMaster.serviceKey, entityServices.serviceKey),
            eq(dueDateMaster.isActive, true)
          )
        )
        .where(
          and(
            eq(entityServices.isActive, true),
            eq(servicesCatalog.isActive, true)
          )
        );

      if (entityId) {
        query = query.where(eq(entityServices.entityId, entityId));
      }

      if (serviceKey) {
        query = query.where(eq(entityServices.serviceKey, serviceKey));
      }

      const bindings = await query;
      const spawned = [];

      for (const binding of bindings) {
        const { binding: b, entity: e, service: s, dueRule: d } = binding;
        
        if (!e || !s) continue;

        const periodicity = b.periodicityOverride || s.periodicity;
        const ruleJson = d?.ruleJson ? JSON.parse(d.ruleJson) : this.getDefaultRule(periodicity);
        const metaData = b.metaJson ? JSON.parse(b.metaJson) : {};
        const dueDate = this.computeDueDate(ruleJson, new Date(), metaData);
        const periodLabel = this.generatePeriodLabel(periodicity, new Date());

        // Force create for manual spawn (skip duplicate check)
        const [newOrder] = await db
          .insert(serviceRequests)
          .values({
            businessEntityId: b.entityId,
            entityId: b.entityId,
            serviceId: b.serviceKey,
            serviceType: b.serviceKey,
            totalAmount: 0,
            periodicity,
            periodLabel,
            dueDate: new Date(dueDate),
            status: 'initiated',
            priority: this.determinePriority(dueDate, new Date()),
            description: `${s.name} for ${periodLabel} (Manual)`
          })
          .returning();

        spawned.push({
          entityName: e.name,
          serviceName: s.name,
          serviceKey: b.serviceKey,
          periodLabel,
          dueDate,
          orderId: newOrder.id
        });
      }

      return spawned;
    } finally {
      this.isRunning = false;
    }
  }

  // Get spawner status
  getStatus() {
    return {
      isRunning: this.isRunning,
      nextRun: '06:30 IST daily',
      timezone: 'Asia/Kolkata'
    };
  }
}

// Global service spawner instance
export const serviceSpawner = new ServiceSpawner();
