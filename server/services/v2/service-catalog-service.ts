/**
 * Service Catalog Service - V2
 * 
 * Bridges the 96-service catalog with compliance tracking
 * Following Vanta/Drata pattern: Services generate compliance requirements
 * 
 * Architecture:
 * - services_catalog: 96 available services (GST, TDS, Accounting, etc.)
 * - entity_services: Client's subscribed services
 * - compliance_tracking: Compliance obligations generated from the rules engine
 * - client_compliance_state: Aggregated health from all services
 */

import { pool } from '../../db';
import { syncComplianceTracking } from '../../compliance-tracking-sync';

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
 * Creates entity_service binding and syncs compliance tracking
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

    // Ensure compliance tracking is synced for the entity
    await syncComplianceTracking({ entityIds: [clientId] });

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
 * Get compliance summary grouped by service
 * Shows which services are compliant and which need attention
 */
export async function getServiceComplianceSummary(clientId: number): Promise<any[]> {
  const servicesResult = await pool.query(
    `SELECT es.service_key, es.is_active, sc.name, sc.category
     FROM entity_services es
     JOIN services_catalog sc ON es.service_key = sc.service_key
     WHERE es.entity_id = $1`,
    [clientId]
  );

  const trackingResult = await pool.query(
    `SELECT cr.regulation_category, ct.status, ct.due_date
     FROM compliance_tracking ct
     JOIN compliance_rules cr ON ct.compliance_rule_id = cr.id
     WHERE ct.business_entity_id = $1`,
    [clientId]
  );

  const categoryStats = new Map<string, { pending: number; completed: number; overdue: number; nextDue?: Date }>();
  trackingResult.rows.forEach((row: any) => {
    const category = row.regulation_category || 'other';
    const bucket = categoryStats.get(category) || { pending: 0, completed: 0, overdue: 0 };
    const status = String(row.status || '').toLowerCase();
    if (status === 'completed') bucket.completed += 1;
    else if (status === 'overdue') bucket.overdue += 1;
    else bucket.pending += 1;
    if (row.due_date && (status === 'pending' || status === 'overdue')) {
      const dueDate = new Date(row.due_date);
      if (!bucket.nextDue || dueDate < bucket.nextDue) {
        bucket.nextDue = dueDate;
      }
    }
    categoryStats.set(category, bucket);
  });

  const mapServiceToCategories = (serviceKey: string, serviceCategory: string | null): string[] => {
    const key = serviceKey.toLowerCase();
    const categories: string[] = [];

    if (key.includes('gst')) categories.push('gst');
    if (key.includes('tds') || key.includes('itr') || key.includes('income_tax')) categories.push('income_tax');
    if (key.includes('roc') || key.includes('companies') || key.includes('mca')) categories.push('companies_act');
    if (key.includes('pf') || key.includes('esi')) categories.push('pf_esi');
    if (key.includes('pt') || key.includes('professional')) categories.push('professional_tax');
    if (key.includes('license') || key.includes('fssai') || key.includes('shops')) categories.push('licenses');
    if (key.includes('registration') || key.includes('incorp') || key.includes('formation')) categories.push('business_registration');
    if (key.includes('funding') || key.includes('cap_table')) categories.push('funding_readiness');
    if (key.includes('payroll') && !categories.includes('pf_esi')) categories.push('pf_esi', 'professional_tax');

    if (categories.length > 0) return categories;

    switch ((serviceCategory || '').toLowerCase()) {
      case 'business_registration':
        return ['business_registration'];
      case 'tax_registration':
        return ['gst', 'income_tax'];
      case 'tax_compliance':
        return ['gst', 'income_tax'];
      case 'statutory_compliance':
        return ['companies_act', 'pf_esi', 'professional_tax', 'licenses'];
      case 'licenses':
        return ['licenses'];
      case 'payroll':
        return ['pf_esi', 'professional_tax'];
      case 'financial_services':
        return ['funding_readiness'];
      default:
        return [];
    }
  };

  const summaries = servicesResult.rows.map((service: any) => {
    const mappedCategories = mapServiceToCategories(service.service_key, service.category);
    let pending = 0;
    let completed = 0;
    let overdue = 0;
    let nextDue: Date | undefined;

    mappedCategories.forEach((category) => {
      const stats = categoryStats.get(category);
      if (!stats) return;
      pending += stats.pending;
      completed += stats.completed;
      overdue += stats.overdue;
      if (stats.nextDue && (!nextDue || stats.nextDue < nextDue)) {
        nextDue = stats.nextDue;
      }
    });

    return {
      service_key: service.service_key,
      name: service.name,
      category: service.category,
      subscription_status: service.is_active ? 'active' : 'inactive',
      next_due_date: nextDue || null,
      pending_actions: pending + overdue,
      completed_actions: completed,
      overdue_actions: overdue,
      mapped_categories: mappedCategories
    };
  });

  return summaries;
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
