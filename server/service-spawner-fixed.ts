import cron from 'node-cron';
import { db } from './db';
import { 
  serviceRequests,
  businessEntities,
  servicesCatalog
} from '@shared/schema';
import { eq } from 'drizzle-orm';

// Simplified Service Spawner for Universal Service Provider Platform
export class ServiceSpawner {
  private isRunning = false;

  constructor() {
    this.initializeSpawner();
  }

  private initializeSpawner() {
    // Run daily at 06:30 IST to spawn new service orders
    cron.schedule('30 6 * * *', async () => {
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
      timezone: 'Asia/Kolkata' 
    });

    console.log('✅ Service spawner initialized - runs daily at 06:30 IST');
  }

  async spawnPeriodicServices() {
    try {
      // Get all active business entities
      const entities = await db
        .select()
        .from(businessEntities)
        .where(eq(businessEntities.isActive, true));

      // Get all periodic services from catalog
      const periodicServices = await db
        .select()
        .from(servicesCatalog)
        .where(eq(servicesCatalog.isActive, true));

      console.log(`📊 Found ${entities.length} entities and ${periodicServices.length} services to process`);

      for (const entity of entities) {
        for (const service of periodicServices) {
          // Skip one-time services for spawning
          if (service.periodicity === 'ONE_TIME') continue;

          // Check if this service period already exists for this entity
          const existingOrder = await db
            .select()
            .from(serviceRequests)
            .where(eq(serviceRequests.businessEntityId, entity.id))
            .then(orders => orders.find(o => o.serviceId === service.serviceKey));

          if (!existingOrder) {
            // Create new service request
            await db
              .insert(serviceRequests)
              .values({
                businessEntityId: entity.id,
                serviceId: service.serviceKey,
                status: 'initiated',
                totalAmount: 0,
                priority: 'medium'
              });

            console.log(`✅ Created ${service.serviceKey} order for entity ${entity.id}`);
          }
        }
      }

      console.log('🎯 Service spawning completed successfully');
    } catch (error) {
      console.error('❌ Error in spawning services:', error);
      throw error;
    }
  }

  // Manual trigger for testing
  async manualSpawn() {
    await this.spawnPeriodicServices();
  }
}

// Create and export the spawner instance
export const serviceSpawner = new ServiceSpawner();
