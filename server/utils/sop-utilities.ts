/**
 * SOP Services Utilities
 * Helper functions for common SOP operations
 */

import { database as db } from '../db';

// ===== SERVICE UTILITIES =====

/**
 * Get service with all related data (forms, documents, authorities)
 */
export async function getServiceComplete(serviceId: number) {
  const service = await db('services').where('service_id', serviceId).first();
  if (!service) return null;

  const forms = await db('service_forms_mapping')
    .join('forms', 'service_forms_mapping.form_id', 'forms.form_id')
    .where('service_forms_mapping.service_id', serviceId)
    .orderBy('service_forms_mapping.form_sequence', 'asc')
    .select();

  const documents = await db('document_requirements')
    .where('service_id', serviceId)
    .select();

  const authorities = await db('service_authorities')
    .where('service_id', serviceId)
    .select();

  return {
    ...service,
    forms,
    documents,
    authorities
  };
}

/**
 * Get all services in a category with count
 */
export async function getServicesByCategory(categoryId: number) {
  const services = await db('services')
    .where('category_id', categoryId)
    .where('is_active', true)
    .select();

  return {
    count: services.length,
    services
  };
}

/**
 * Search services by name or description
 */
export async function searchServices(searchTerm: string, complexity?: string) {
  let query = db('services').where('is_active', true);

  if (searchTerm) {
    query = query.whereRaw(
      '(service_name LIKE ? OR description LIKE ?)',
      [`%${searchTerm}%`, `%${searchTerm}%`]
    );
  }

  if (complexity) {
    query = query.where('complexity_level', complexity);
  }

  return await query.select();
}

/**
 * Get service by code (form code)
 */
export async function getServiceByCode(formCode: string) {
  return await db('services')
    .join('service_forms_mapping', 'services.service_id', 'service_forms_mapping.service_id')
    .join('forms', 'service_forms_mapping.form_id', 'forms.form_id')
    .where('forms.form_code', formCode)
    .select('services.*')
    .first();
}

/**
 * Get all related/recommended services for a service
 */
export async function getRelatedServices(serviceId: number, limit: number = 5) {
  const service = await db('services').where('service_id', serviceId).first();
  if (!service) return [];

  return await db('services')
    .where('category_id', service.category_id)
    .where('service_id', '!=', serviceId)
    .where('is_active', true)
    .limit(limit)
    .select();
}

// ===== FORM UTILITIES =====

/**
 * Get all forms for a service
 */
export async function getServiceForms(serviceId: number) {
  return await db('service_forms_mapping')
    .join('forms', 'service_forms_mapping.form_id', 'forms.form_id')
    .where('service_forms_mapping.service_id', serviceId)
    .orderBy('service_forms_mapping.form_sequence', 'asc')
    .select('forms.*', 'service_forms_mapping.is_mandatory', 'service_forms_mapping.form_sequence');
}

/**
 * Get all services requiring a specific form
 */
export async function getServicesRequiringForm(formCode: string) {
  return await db('service_forms_mapping')
    .join('forms', 'service_forms_mapping.form_id', 'forms.form_id')
    .join('services', 'service_forms_mapping.service_id', 'services.service_id')
    .where('forms.form_code', formCode)
    .select('services.*');
}

/**
 * Check if a service requires a specific form
 */
export async function serviceRequiresForm(serviceId: number, formCode: string): Promise<boolean> {
  const result = await db('service_forms_mapping')
    .join('forms', 'service_forms_mapping.form_id', 'forms.form_id')
    .where('service_forms_mapping.service_id', serviceId)
    .where('forms.form_code', formCode)
    .count('* as count')
    .first();

  return (result?.count || 0) > 0;
}

// ===== DOCUMENT UTILITIES =====

/**
 * Get all document requirements for a service
 */
export async function getServiceDocuments(serviceId: number) {
  return await db('document_requirements')
    .where('service_id', serviceId)
    .select();
}

/**
 * Get mandatory documents for a service
 */
export async function getMandatoryDocuments(serviceId: number) {
  return await db('document_requirements')
    .where('service_id', serviceId)
    .where('is_mandatory', true)
    .select();
}

/**
 * Get optional documents for a service
 */
export async function getOptionalDocuments(serviceId: number) {
  return await db('document_requirements')
    .where('service_id', serviceId)
    .where('is_mandatory', false)
    .select();
}

/**
 * Check if document requirements are complete for a service
 */
export async function checkDocumentCompleteness(
  serviceId: number,
  uploadedDocuments: string[]
): Promise<{ complete: boolean; missing: string[] }> {
  const required = await getMandatoryDocuments(serviceId);
  const missing = required
    .filter(doc => !uploadedDocuments.includes(doc.document_name))
    .map(doc => doc.document_name);

  return {
    complete: missing.length === 0,
    missing
  };
}

// ===== COMPLIANCE TRACKING =====

/**
 * Initialize compliance tracking for a client
 */
export async function initializeClientCompliance(clientId: string) {
  const services = await db('services').where('is_active', true).select();

  const records = services.map(service => ({
    client_id: clientId,
    service_id: service.service_id,
    status: 'pending' as const,
    created_at: new Date(),
    updated_at: new Date()
  }));

  await db('sop_compliance_tracking').insert(records);

  return {
    success: true,
    clientId,
    servicesInitialized: services.length
  };
}

/**
 * Get client's compliance status
 */
export async function getClientComplianceStatus(clientId: string) {
  const records = await db('sop_compliance_tracking')
    .join('services', 'sop_compliance_tracking.service_id', 'services.service_id')
    .where('sop_compliance_tracking.client_id', clientId)
    .select();

  const completed = records.filter(r => r.status === 'completed').length;
  const percentage = records.length > 0 ? Math.round((completed / records.length) * 100) : 0;

  return {
    clientId,
    totalServices: records.length,
    completed,
    completionPercentage: percentage,
    statusBreakdown: {
      completed: records.filter(r => r.status === 'completed').length,
      inProgress: records.filter(r => r.status === 'in_progress').length,
      pending: records.filter(r => r.status === 'pending').length,
      overdue: records.filter(r => r.status === 'overdue').length
    },
    records
  };
}

/**
 * Update service compliance status
 */
export async function updateComplianceStatus(
  clientId: string,
  serviceId: number,
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'not_applicable',
  notes?: string,
  updatedBy?: number
) {
  const completionDate = status === 'completed' ? new Date() : null;

  await db('sop_compliance_tracking')
    .where('client_id', clientId)
    .where('service_id', serviceId)
    .update({
      status,
      completion_date: completionDate,
      notes,
      updated_by: updatedBy,
      updated_at: new Date()
    });

  // Log to audit log
  const oldRecord = await db('sop_compliance_tracking')
    .where('client_id', clientId)
    .where('service_id', serviceId)
    .first();

  await db('sop_audit_log').insert({
    client_id: clientId,
    service_id: serviceId,
    action: 'status_update',
    new_status: status,
    changed_by: updatedBy,
    change_reason: notes,
    changed_at: new Date()
  });

  return { success: true };
}

/**
 * Get overdue services for a client
 */
export async function getOverdueServices(clientId: string) {
  return await db('sop_compliance_tracking')
    .join('services', 'sop_compliance_tracking.service_id', 'services.service_id')
    .where('sop_compliance_tracking.client_id', clientId)
    .where('sop_compliance_tracking.status', 'overdue')
    .select();
}

/**
 * Get pending services for a client
 */
export async function getPendingServices(clientId: string) {
  return await db('sop_compliance_tracking')
    .join('services', 'sop_compliance_tracking.service_id', 'services.service_id')
    .where('sop_compliance_tracking.client_id', clientId)
    .where('sop_compliance_tracking.status', 'pending')
    .select();
}

// ===== TIMELINE & DEADLINE UTILITIES =====

/**
 * Get applicable timelines for a service
 */
export async function getServiceTimelines(serviceId: number) {
  return await db('service_timelines')
    .where('service_id', serviceId)
    .orderBy('days_from_trigger', 'asc')
    .select();
}

/**
 * Calculate deadline based on trigger date
 */
export function calculateDeadline(triggerDate: Date, daysOffset: number): Date {
  const deadline = new Date(triggerDate);
  deadline.setDate(deadline.getDate() + daysOffset);
  return deadline;
}

/**
 * Get all upcoming deadlines for a client
 */
export async function getUpcomingDeadlines(clientId: string, daysLookahead: number = 30) {
  const today = new Date();
  const futureDate = new Date(today.getTime() + daysLookahead * 24 * 60 * 60 * 1000);

  const pending = await db('sop_compliance_tracking')
    .where('client_id', clientId)
    .where('status', '!=', 'completed')
    .select();

  // This is a simplified version - in production, you'd have more sophisticated deadline calculation
  return pending.map(record => ({
    serviceId: record.service_id,
    status: record.status,
    daysUntilDeadline: daysLookahead
  }));
}

// ===== CHECKLIST UTILITIES =====

/**
 * Get step-by-step checklist for a service
 */
export async function getServiceChecklist(serviceId: number) {
  const service = await getServiceComplete(serviceId);
  if (!service) return null;

  const steps = [
    {
      stepNumber: 1,
      title: 'Gather Required Documents',
      items: service.documents.filter(d => d.is_mandatory).map(d => ({
        id: d.doc_req_id,
        name: d.document_name,
        type: d.document_type
      }))
    },
    {
      stepNumber: 2,
      title: 'Obtain Digital Signatures (if needed)',
      items: service.forms.filter(f => f.form_name.includes('DSC')).length > 0
        ? [{ id: 0, name: 'Digital Signature Certificate (DSC)' }]
        : []
    },
    {
      stepNumber: 3,
      title: 'File Required Forms',
      items: service.forms.map((f, idx) => ({
        id: f.form_id,
        name: f.form_code,
        sequence: idx + 1,
        mandatory: f.is_mandatory
      }))
    },
    {
      stepNumber: 4,
      title: 'Submit & Track',
      items: [
        { id: 0, name: 'Submit through government portal' },
        { id: 1, name: 'Receive acknowledgement/confirmation' },
        { id: 2, name: 'Track application status' }
      ]
    }
  ];

  return {
    service: {
      id: service.service_id,
      name: service.service_name,
      complexity: service.complexity_level,
      estimatedDays: service.estimated_duration_days
    },
    steps: steps.filter(s => s.items.length > 0)
  };
}

// ===== CATEGORY UTILITIES =====

/**
 * Get all categories with service counts
 */
export async function getCategoriesWithCounts() {
  const categories = await db('service_categories').select();

  const withCounts = await Promise.all(
    categories.map(async (cat) => {
      const count = await db('services')
        .where('category_id', cat.category_id)
        .where('is_active', true)
        .count('* as count')
        .first();

      return {
        ...cat,
        serviceCount: count?.count || 0
      };
    })
  );

  return withCounts;
}

/**
 * Get category details
 */
export async function getCategoryDetails(categoryId: number) {
  const category = await db('service_categories')
    .where('category_id', categoryId)
    .first();

  if (!category) return null;

  const services = await db('services')
    .where('category_id', categoryId)
    .where('is_active', true)
    .select();

  return {
    ...category,
    services,
    serviceCount: services.length
  };
}

// ===== STATISTICS & REPORTING =====

/**
 * Get SOP implementation statistics
 */
export async function getSOPStatistics() {
  const categories = await db('service_categories').count('* as count').first();
  const services = await db('services').where('is_active', true).count('* as count').first();
  const forms = await db('forms').count('* as count').first();
  const documents = await db('document_requirements').distinctOn('document_name').select().count();

  const avgComplexity = await db('services')
    .where('is_active', true)
    .select(
      db.raw("CASE WHEN complexity_level = 'Easy' THEN 1 WHEN complexity_level = 'Medium' THEN 2 ELSE 3 END as difficulty")
    )
    .avg('difficulty as avgDifficulty')
    .first();

  return {
    totalCategories: categories?.count || 0,
    totalServices: services?.count || 0,
    totalForms: forms?.count || 0,
    totalDocumentTypes: documents || 0,
    averageComplexity: avgComplexity?.avgDifficulty || 0
  };
}

/**
 * Get compliance report for a client
 */
export async function getComplianceReport(clientId: string) {
  const compliance = await getClientComplianceStatus(clientId);

  return {
    clientId,
    generatedDate: new Date(),
    summary: {
      totalServices: compliance.totalServices,
      completionPercentage: compliance.completionPercentage,
      statusBreakdown: compliance.statusBreakdown
    },
    byCat:  {} // Will be populated with detailed analytics
  };
}

export default {
  getServiceComplete,
  getServicesByCategory,
  searchServices,
  getServiceForms,
  getServiceDocuments,
  getMandatoryDocuments,
  checkDocumentCompleteness,
  initializeClientCompliance,
  getClientComplianceStatus,
  updateComplianceStatus,
  getOverdueServices,
  getPendingServices,
  getServiceTimelines,
  calculateDeadline,
  getUpcomingDeadlines,
  getServiceChecklist,
  getCategoriesWithCounts,
  getSOPStatistics,
  getComplianceReport
};
