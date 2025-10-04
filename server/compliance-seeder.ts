import { db } from './db';
import { complianceTracking } from '@shared/schema';

export async function seedComplianceData() {
  try {
    // Check if data already exists
    const existing = await db.select().from(complianceTracking).limit(1);
    if (existing.length > 0) {
      console.log('✅ Compliance tracking data already seeded');
      return;
    }

    const today = new Date();
    const sampleCompliance = [
      // Overdue items
      {
        userId: 1,
        serviceId: 'GST-001',
        complianceType: 'monthly',
        dueDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        status: 'overdue',
        priority: 'high',
        healthScore: 60,
        penaltyRisk: true,
        estimatedPenalty: 10000
      },
      {
        userId: 1,
        serviceId: 'TDS-001',
        complianceType: 'quarterly',
        dueDate: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        status: 'overdue',
        priority: 'critical',
        healthScore: 40,
        penaltyRisk: true,
        estimatedPenalty: 25000
      },
      
      // Due this week
      {
        userId: 1,
        serviceId: 'PF-001',
        complianceType: 'monthly',
        dueDate: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        status: 'pending',
        priority: 'high',
        healthScore: 75,
        penaltyRisk: false
      },
      {
        userId: 1,
        serviceId: 'PT-001',
        complianceType: 'monthly',
        dueDate: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        status: 'pending',
        priority: 'medium',
        healthScore: 85,
        penaltyRisk: false
      },
      {
        userId: 1,
        serviceId: 'GST-RET-001',
        complianceType: 'monthly',
        dueDate: new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
        status: 'pending',
        priority: 'medium',
        healthScore: 90,
        penaltyRisk: false
      },
      
      // Upcoming (>7 days)
      {
        userId: 1,
        serviceId: 'ITR-001',
        complianceType: 'annual',
        dueDate: new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        status: 'pending',
        priority: 'medium',
        healthScore: 95,
        penaltyRisk: false
      },
      {
        userId: 1,
        serviceId: 'ROC-001',
        complianceType: 'annual',
        dueDate: new Date(today.getTime() + 20 * 24 * 60 * 60 * 1000), // 20 days from now
        status: 'pending',
        priority: 'low',
        healthScore: 100,
        penaltyRisk: false
      },
      {
        userId: 1,
        serviceId: 'GST-AUD-001',
        complianceType: 'annual',
        dueDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: 'pending',
        priority: 'low',
        healthScore: 100,
        penaltyRisk: false
      },
      {
        userId: 1,
        serviceId: 'DIR-KYC-001',
        complianceType: 'annual',
        dueDate: new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
        status: 'pending',
        priority: 'low',
        healthScore: 100,
        penaltyRisk: false
      },
      
      // Completed items
      {
        userId: 1,
        serviceId: 'GST-PREV-001',
        complianceType: 'monthly',
        dueDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        status: 'completed',
        priority: 'medium',
        healthScore: 100,
        penaltyRisk: false,
        lastCompleted: new Date(today.getTime() - 28 * 24 * 60 * 60 * 1000)
      },
      {
        userId: 1,
        serviceId: 'TDS-PREV-001',
        complianceType: 'quarterly',
        dueDate: new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
        status: 'completed',
        priority: 'medium',
        healthScore: 100,
        penaltyRisk: false,
        lastCompleted: new Date(today.getTime() - 55 * 24 * 60 * 60 * 1000)
      }
    ];

    await db.insert(complianceTracking).values(sampleCompliance);
    
    console.log('✅ Successfully seeded compliance tracking data with', sampleCompliance.length, 'items');
  } catch (error) {
    console.error('❌ Error seeding compliance data:', error);
  }
}
