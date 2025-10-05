import { Express, Request, Response } from 'express';
import { db } from './db';
import {
  servicesCatalog,
  serviceDocTypes,
  workflowTemplatesAdmin,
  aiDocuments,
  documentsUploads,
  serviceOrders,
} from '@shared/schema';
import { eq, and, inArray } from 'drizzle-orm';

// ============================================================================
// SERVICE-DOCUMENT INTEGRATION
// Comprehensive document checklists and workflows for all 131 services
// ============================================================================

// Service-specific document requirements mapped to all 131 services
const SERVICE_DOCUMENT_REQUIREMENTS: Record<string, {
  requiredDocuments: string[];
  generatableDocuments: string[]; // Documents that can be AI-generated
  signatureRequired: string[]; // Documents requiring signatures
  dscRequired: string[]; // Documents requiring DSC
}> = {
  // Business Registrations (10)
  'pvt_ltd_incorporation': {
    requiredDocuments: ['pan_card', 'aadhar_card', 'address_proof', 'photo', 'bank_statement', 'moa', 'aoa'],
    generatableDocuments: ['moa', 'aoa', 'board_resolution', 'declaration', 'consent_letter'],
    signatureRequired: ['moa', 'aoa', 'declaration', 'consent_letter'],
    dscRequired: ['spice_forms', 'inc_forms']
  },
  'llp_incorporation': {
    requiredDocuments: ['pan_card', 'aadhar_card', 'address_proof', 'photo', 'llp_agreement'],
    generatableDocuments: ['llp_agreement', 'consent_of_partners', 'declaration'],
    signatureRequired: ['llp_agreement', 'consent_of_partners'],
    dscRequired: ['fillip_forms']
  },
  'opc_incorporation': {
    requiredDocuments: ['pan_card', 'aadhar_card', 'address_proof', 'photo', 'moa', 'aoa', 'nominee_consent'],
    generatableDocuments: ['moa', 'aoa', 'nominee_consent', 'declaration'],
    signatureRequired: ['moa', 'aoa', 'nominee_consent'],
    dscRequired: ['spice_forms']
  },
  
  // Tax Registrations (3)
  'gst_registration': {
    requiredDocuments: ['pan_card', 'aadhar_card', 'business_address_proof', 'bank_statement', 'incorporation_certificate'],
    generatableDocuments: ['authorization_letter', 'board_resolution'],
    signatureRequired: ['authorization_letter', 'gst_application'],
    dscRequired: []
  },
  
  // Licenses (9)
  'fssai_registration': {
    requiredDocuments: ['pan_card', 'identity_proof', 'premises_proof', 'business_registration', 'list_of_products'],
    generatableDocuments: ['declaration', 'noc', 'authorization_letter'],
    signatureRequired: ['declaration', 'authorization_letter'],
    dscRequired: []
  },
  
  // Monthly Compliances (15)
  'gst_returns': {
    requiredDocuments: ['sales_register', 'purchase_register', 'bank_statements', 'gstr1_data', 'gstr3b_data'],
    generatableDocuments: ['reconciliation_statement', 'explanatory_notes'],
    signatureRequired: ['gstr1', 'gstr3b'],
    dscRequired: ['gstr1', 'gstr3b']
  },
  'tds_quarterly': {
    requiredDocuments: ['salary_register', 'vendor_payments', 'form_16', 'form_16a'],
    generatableDocuments: ['tds_computation', 'challan_summary'],
    signatureRequired: ['tds_return'],
    dscRequired: ['tds_return']
  },
  'pf_esi_monthly': {
    requiredDocuments: ['salary_register', 'attendance_records', 'employee_master'],
    generatableDocuments: ['pf_challan', 'esi_challan', 'employee_contribution_statement'],
    signatureRequired: ['pf_return', 'esi_return'],
    dscRequired: []
  },
  
  // Annual Compliances (20)
  'annual_filings_roc': {
    requiredDocuments: ['audited_financials', 'directors_report', 'audit_report', 'board_resolution', 'agm_notice'],
    generatableDocuments: ['directors_report', 'agm_notice', 'agm_minutes', 'board_resolution'],
    signatureRequired: ['aoc4', 'mgt7', 'directors_report', 'agm_minutes'],
    dscRequired: ['aoc4', 'mgt7']
  },
  'income_tax_return': {
    requiredDocuments: ['financial_statements', 'tax_computation', 'audit_report', 'bank_statements'],
    generatableDocuments: ['tax_computation', 'explanatory_notes'],
    signatureRequired: ['itr_form'],
    dscRequired: ['itr_form']
  },
};

// Generate complete document checklist for all services
function generateServiceDocumentChecklists() {
  const allServiceKeys = [
    // Business Registrations (10)
    'pvt_ltd_incorporation', 'llp_incorporation', 'opc_incorporation', 'partnership_registration',
    'proprietorship_registration', 'section8_company', 'nidhi_company', 'producer_company',
    'public_limited_company', 'startup_india_registration',
    
    // Tax Registrations (3)
    'gst_registration', 'professional_tax_registration', 'tan_registration',
    
    // Licenses & Regulatory (9)
    'fssai_registration', 'import_export_code', 'msme_registration', 'shops_establishment',
    'trade_license', 'pollution_clearance', 'fire_noc', 'labour_license', 'factory_license',
    
    // Intellectual Property (6)
    'trademark_registration', 'copyright_registration', 'patent_filing', 'design_registration',
    'trademark_renewal', 'trademark_objection',
    
    // Monthly Compliances (15)
    'gst_returns', 'tds_monthly', 'tds_quarterly', 'pf_esi_monthly', 'gstr1_filing',
    'gstr3b_filing', 'gstr9_annual', 'eway_bill_generation', 'accounting_monthly',
    'payroll_processing', 'mca_form_tracking', 'professional_tax_monthly', 'labour_welfare_monthly',
    'contract_labour_monthly', 'shops_act_monthly',
    
    // Annual Compliances (20)
    'annual_filings_roc', 'income_tax_return', 'tax_audit', 'aoc4_filing', 'mgt7_filing',
    'mgt14_filing', 'dir3_kyc', 'din_kyc', 'statutory_audit', 'agm_compliance',
    'board_meetings', 'annual_return_llp', 'cost_audit', 'secretarial_audit',
    'gst_annual_return', 'pf_annual_return', 'esi_annual_return', 'professional_tax_annual',
    'labour_license_renewal', 'factory_license_renewal',
    
    // Event-Based Compliances (25)
    'director_appointment', 'director_resignation', 'director_din', 'registered_office_change',
    'increase_authorized_capital', 'issue_of_shares', 'transfer_of_shares', 'change_in_object',
    'change_company_name', 'conversion_pvt_to_public', 'conversion_llp_to_company',
    'winding_up_company', 'striking_off_company', 'revival_of_company', 'loan_from_directors',
    'deposit_acceptance', 'charge_creation', 'charge_modification', 'charge_satisfaction',
    'amalgamation', 'merger', 'demerger', 'scheme_of_arrangement', 'buyback_of_shares',
    'reduction_of_capital',
    
    // Accounting & Bookkeeping (8)
    'bookkeeping_monthly', 'financial_statements', 'management_mis', 'cash_flow_statement',
    'ratio_analysis', 'budgeting', 'forecasting', 'variance_analysis',
    
    // Payroll & HR (7)
    'payroll_setup', 'employee_onboarding', 'employee_exit', 'leave_management',
    'attendance_management', 'appraisal_system', 'hr_policies',
    
    // Legal Documentation (8)
    'employment_agreement', 'nda', 'vendor_agreement', 'client_agreement',
    'partnership_deed', 'shareholders_agreement', 'mou', 'service_agreement',
    
    // Funding & Investment (6)
    'seed_funding_documentation', 'series_a_documentation', 'convertible_note',
    'safe_agreement', 'term_sheet', 'shareholders_resolution',
    
    // International (4)
    'fema_compliance', 'rbi_reporting', 'forex_compliance', 'export_documentation',
    
    // Special Services (10)
    'business_plan', 'pitch_deck', 'valuation_report', 'due_diligence',
    'compliance_audit', 'tax_planning', 'transfer_pricing', 'cross_border_taxation',
    'international_taxation', 'litigation_support'
  ];
  
  const checklists: Record<string, any> = {};
  
  allServiceKeys.forEach(serviceKey => {
    if (SERVICE_DOCUMENT_REQUIREMENTS[serviceKey]) {
      checklists[serviceKey] = SERVICE_DOCUMENT_REQUIREMENTS[serviceKey];
    } else {
      // Default document requirements for services not explicitly defined
      checklists[serviceKey] = {
        requiredDocuments: ['supporting_documents', 'authorization_letter', 'identity_proof'],
        generatableDocuments: ['authorization_letter', 'declaration', 'covering_letter'],
        signatureRequired: ['authorization_letter'],
        dscRequired: []
      };
    }
  });
  
  return checklists;
}

export function registerServiceDocumentIntegration(app: Express) {
  
  // Get document checklist for a service
  app.get('/api/services/:serviceKey/documents', async (req: Request, res: Response) => {
    try {
      const { serviceKey } = req.params;
      const allChecklists = generateServiceDocumentChecklists();
      const checklist = allChecklists[serviceKey];
      
      if (!checklist) {
        return res.status(404).json({ error: 'Service not found' });
      }
      
      // Get service details
      const [service] = await db
        .select()
        .from(servicesCatalog)
        .where(eq(servicesCatalog.serviceKey, serviceKey))
        .limit(1);
      
      // Get configured document types for this service
      const docTypes = await db
        .select()
        .from(serviceDocTypes)
        .where(eq(serviceDocTypes.serviceKey, serviceKey));
      
      res.json({
        service,
        checklist,
        configuredDocTypes: docTypes,
        totalRequired: checklist.requiredDocuments.length,
        aiGeneratable: checklist.generatableDocuments.length,
        requiresSignature: checklist.signatureRequired.length,
        requiresDSC: checklist.dscRequired.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get all service document checklists
  app.get('/api/services/documents/checklists', async (req: Request, res: Response) => {
    try {
      const checklists = generateServiceDocumentChecklists();
      
      const summary = {
        totalServices: Object.keys(checklists).length,
        servicesWithAIGeneration: Object.values(checklists).filter(c => c.generatableDocuments.length > 0).length,
        servicesWithDSC: Object.values(checklists).filter(c => c.dscRequired.length > 0).length,
        checklists,
      };
      
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Generate AI document for service
  app.post('/api/services/:serviceKey/generate-document', async (req: Request, res: Response) => {
    try {
      const { serviceKey } = req.params;
      const { documentType, entityData, serviceRequestId } = req.body;
      
      const checklist = generateServiceDocumentChecklists()[serviceKey];
      
      if (!checklist || !checklist.generatableDocuments.includes(documentType)) {
        return res.status(400).json({ 
          error: 'This document type cannot be AI-generated for this service' 
        });
      }
      
      // Get service details
      const [service] = await db
        .select()
        .from(servicesCatalog)
        .where(eq(servicesCatalog.serviceKey, serviceKey))
        .limit(1);
      
      // Build prompt based on service and document type
      const prompt = `Generate a professional ${documentType} document for ${service.name} service. 
      
Entity Details:
${JSON.stringify(entityData, null, 2)}

Document Type: ${documentType}
Service: ${service.name}
Category: ${service.category}

Please generate a complete, legally sound document with all necessary clauses and formatting.`;
      
      res.json({
        success: true,
        prompt,
        documentType,
        serviceKey,
        message: 'Use this prompt with /api/ai-documents/generate endpoint'
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get service order documents with AI document integration
  app.get('/api/service-orders/:orderId/documents', async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.orderId);
      
      // Get uploaded documents
      const uploadedDocs = await db
        .select()
        .from(documentsUploads)
        .where(eq(documentsUploads.serviceOrderId, orderId));
      
      // Get AI-generated documents
      const aiGeneratedDocs = await db
        .select()
        .from(aiDocuments)
        .where(eq(aiDocuments.serviceRequestId, orderId));
      
      res.json({
        uploadedDocuments: uploadedDocs,
        aiGeneratedDocuments: aiGeneratedDocs,
        total: uploadedDocs.length + aiGeneratedDocs.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  console.log('✅ Service-Document Integration routes registered');
}
