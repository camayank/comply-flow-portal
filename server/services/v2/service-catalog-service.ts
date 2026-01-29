/**
 * Service Catalog Service - V2
 * 
 * Bridges the 96-service catalog with compliance tracking
 * Following Vanta/Drata pattern: Services generate compliance requirements
 * 
 * Architecture:
 * - services_catalog: 96 available services (GST, TDS, Accounting, etc.)
 * - entity_services: Client's subscribed services
 * - compliance_actions: Tasks generated from subscribed services
 * - client_compliance_state: Aggregated health from all services
 */

import { pool } from '../../db';
import * as ComplianceService from './compliance-service';

export interface ServiceCatalogEntry {
  serviceKey: string;
  name: string;
  periodicity: 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'ONGOING';
  description: string;
  category: string;
}

export interface EntityService {
  id: number;
  entityId: number;
  serviceKey: string;
  isActive: boolean;
  periodicityOverride?: string;
  jurisdiction?: string;
  metaJson?: any;
  createdAt: Date;
}

/**
 * Get all available services from catalog
 * Used for service marketplace/selection
 */
export async function getAllServices(): Promise<ServiceCatalogEntry[]> {
  const result = await pool.query(
    `SELECT 
      service_key,
      name,
      periodicity,
      description,
      category
    FROM services_catalog
    ORDER BY category, name`
  );

  return result.rows.map(row => ({
    serviceKey: row.service_key,
    name: row.name,
    periodicity: row.periodicity,
    description: row.description,
    category: row.category
  }));
}

/**
 * Get services by category
 * Categories: business_registration, tax_registration, licenses, 
 *            tax_compliance, statutory_compliance, financial_services
 */
export async function getServicesByCategory(category: string): Promise<ServiceCatalogEntry[]> {
  const result = await pool.query(
    `SELECT 
      service_key,
      name,
      periodicity,
      description,
      category
    FROM services_catalog
    WHERE category = $1
    ORDER BY name`,
    [category]
  );

  return result.rows.map(row => ({
    serviceKey: row.service_key,
    name: row.name,
    periodicity: row.periodicity,
    description: row.description,
    category: row.category
  }));
}

/**
 * Get client's subscribed services
 * Returns active services the client is enrolled in
 */
export async function getClientServices(clientId: number): Promise<EntityService[]> {
  const result = await pool.query(
    `SELECT 
      es.id,
      es.entity_id,
      es.service_key,
      es.is_active,
      es.periodicity_override,
      es.jurisdiction,
      es.meta_json,
      es.created_at,
      sc.name as service_name,
      sc.periodicity,
      sc.category
    FROM entity_services es
    JOIN services_catalog sc ON es.service_key = sc.service_key
    WHERE es.entity_id = $1 AND es.is_active = true
    ORDER BY es.created_at DESC`,
    [clientId]
  );

  return result.rows.map(row => ({
    id: row.id,
    entityId: row.entity_id,
    serviceKey: row.service_key,
    isActive: row.is_active,
    periodicityOverride: row.periodicity_override,
    jurisdiction: row.jurisdiction,
    metaJson: row.meta_json ? JSON.parse(row.meta_json) : null,
    createdAt: row.created_at
  }));
}

/**
 * Subscribe client to a service
 * Creates entity_service binding and generates initial compliance actions
 */
export async function subscribeClientToService(
  clientId: number,
  serviceKey: string,
  startDate: Date = new Date()
): Promise<number> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get service details from catalog
    const serviceResult = await client.query(
      'SELECT * FROM services_catalog WHERE service_key = $1',
      [serviceKey]
    );

    if (serviceResult.rows.length === 0) {
      throw new Error(`Service ${serviceKey} not found in catalog`);
    }

    const service = serviceResult.rows[0];

    // Create entity_service binding
    const bindingResult = await client.query(
      `INSERT INTO entity_services 
       (entity_id, service_key, is_active, meta_json)
       VALUES ($1, $2, true, $3)
       RETURNING id`,
      [
        clientId,
        serviceKey,
        JSON.stringify({ subscribed_at: startDate })
      ]
    );

    const entityServiceId = bindingResult.rows[0].id;

    // Generate initial compliance action based on service
    await generateComplianceActionsForService(clientId, service, client);

    await client.query('COMMIT');
    return entityServiceId;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Calculate next due date based on periodicity
 * Used for recurring services
 */
function calculateNextDueDate(periodicity: string, startDate: Date): Date | null {
  if (periodicity === 'ONE_TIME') {
    return null; // One-time services don't have recurring due dates
  }

  const nextDate = new Date(startDate);

  switch (periodicity) {
    case 'MONTHLY':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'QUARTERLY':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'ANNUAL':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    case 'ONGOING':
      // For ongoing services, set next review to 1 month
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
  }

  return nextDate;
}

/**
 * Generate compliance actions from service subscription
 * Following Vanta pattern: Each service generates compliance requirements
 */
async function generateComplianceActionsForService(
  clientId: number,
  service: any,
  client: any
): Promise<void> {
  // Map service keys to compliance actions
  const actionMapping: Record<string, any> = {
    'gst_returns': {
      actionType: 'upload',
      title: `Upload GST documents for ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`,
      description: 'Upload sales register, purchase register, and GST return documents',
      documentType: 'GST Return Documents',
      priority: 'high',
      estimatedMinutes: 15,
      benefits: [
        'Complete your GST filing before deadline',
        'Avoid late filing penalties',
        'Maintain good compliance record',
        'Enable ITC claims'
      ],
      instructions: [
        'Gather all sales invoices',
        'Prepare purchase invoices and ITC documents',
        'Ensure all documents are in PDF format',
        'Upload files through the portal',
        'Review and submit for processing'
      ]
    },
    'tds_quarterly': {
      actionType: 'pay',
      title: 'File and Pay TDS for current quarter',
      description: 'Submit TDS returns and payment',
      documentType: 'TDS Return',
      priority: 'high',
      estimatedMinutes: 20,
      benefits: [
        'Avoid TDS late filing penalties',
        'Generate Form 16/16A for payees',
        'Maintain compliance with Income Tax Act',
        'Enable smooth ITR filing'
      ]
    },
    'accounting_monthly': {
      actionType: 'review',
      title: 'Monthly accounting books closure',
      description: 'Review and finalize monthly accounting books',
      documentType: 'Monthly Financial Statements',
      priority: 'medium',
      estimatedMinutes: 30,
      benefits: [
        'Accurate financial visibility',
        'Timely management reporting',
        'Smoother year-end closing',
        'Better business decisions'
      ]
    }
  };

  const actionConfig = actionMapping[service.service_key];
  
  if (actionConfig) {
    // Calculate due date based on service periodicity
    const dueDate = calculateNextDueDate(service.periodicity, new Date()) || 
                    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days default

    await client.query(
      `INSERT INTO compliance_actions 
       (client_id, action_type, title, description, document_type, 
        due_date, priority, status, estimated_time_minutes, benefits, instructions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, $10)`,
      [
        clientId,
        actionConfig.actionType,
        actionConfig.title,
        actionConfig.description,
        actionConfig.documentType,
        dueDate,
        actionConfig.priority,
        actionConfig.estimatedMinutes,
        actionConfig.benefits,
        actionConfig.instructions
      ]
    );
  }
}

/**
 * Get compliance summary grouped by service
 * Shows which services are compliant and which need attention
 */
export async function getServiceComplianceSummary(clientId: number): Promise<any[]> {
  const result = await pool.query(
    `SELECT 
      sc.service_key,
      sc.name,
      sc.category,
      es.status as subscription_status,
      es.next_due_date,
      COUNT(ca.id) FILTER (WHERE ca.status = 'pending') as pending_actions,
      COUNT(ca.id) FILTER (WHERE ca.status = 'completed') as completed_actions,
      MAX(ca.due_date) FILTER (WHERE ca.status = 'pending') as next_action_due
    FROM entity_services es
    JOIN services_catalog sc ON es.service_key = sc.service_key
    LEFT JOIN compliance_actions ca ON ca.client_id = $1 
      AND ca.metadata->>'service_key' = sc.service_key
    WHERE es.entity_id = $1
    GROUP BY sc.service_key, sc.name, sc.category, es.status, es.next_due_date
    ORDER BY pending_actions DESC, next_action_due ASC`,
    [clientId]
  );

  return result.rows;
}

/**
 * Get service statistics
 * Total services available, subscribed, active, etc.
 */
export async function getServiceStats(clientId?: number): Promise<any> {
  const catalogCountResult = await pool.query(
    'SELECT COUNT(*) as total FROM services_catalog'
  );

  const stats: any = {
    totalAvailable: parseInt(catalogCountResult.rows[0].total),
    byCategory: {}
  };

  // Get breakdown by category
  const categoryResult = await pool.query(
    `SELECT category, COUNT(*) as count 
     FROM services_catalog 
     GROUP BY category`
  );

  categoryResult.rows.forEach(row => {
    stats.byCategory[row.category] = parseInt(row.count);
  });

  // If client specified, get their subscription stats
  if (clientId) {
    const subscriptionResult = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE is_active = true) as active,
        COUNT(*) FILTER (WHERE is_active = false) as inactive
       FROM entity_services
       WHERE entity_id = $1`,
      [clientId]
    );

    if (subscriptionResult.rows.length > 0) {
      stats.subscribed = {
        active: parseInt(subscriptionResult.rows[0].active),
        inactive: parseInt(subscriptionResult.rows[0].inactive)
      };
    }
  }

  return stats;
}
