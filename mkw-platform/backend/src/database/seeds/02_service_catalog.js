/**
 * Seed Service Catalog
 * Creates the complete catalog of MKW services with categories and workflow templates
 */

exports.seed = async function(knex) {
  // Clear existing entries
  await knex('workflow_templates').del();
  await knex('services').del();
  await knex('service_categories').del();
  
  // Insert Service Categories
  const categories = [
    {
      name: 'Corporate Compliance',
      code: 'COMPLIANCE',
      description: 'Company incorporation, regulatory compliance, and corporate governance services',
      icon: 'building',
      color: '#1F2937',
      sort_order: 1
    },
    {
      name: 'Financial Services',
      code: 'FINANCE',
      description: 'Accounting, taxation, financial planning, and audit services',
      icon: 'calculator',
      color: '#059669',
      sort_order: 2
    },
    {
      name: 'Legal Advisory',
      code: 'LEGAL',
      description: 'Legal consultation, contract drafting, and dispute resolution',
      icon: 'scale',
      color: '#7C2D12',
      sort_order: 3
    },
    {
      name: 'Business Advisory',
      code: 'BUSINESS',
      description: 'Strategic consulting, business planning, and growth advisory',
      icon: 'trending-up',
      color: '#1D4ED8',
      sort_order: 4
    }
  ];
  
  await knex('service_categories').insert(categories);
  
  // Get inserted category IDs
  const complianceCategory = await knex('service_categories').where('code', 'COMPLIANCE').first();
  const financeCategory = await knex('service_categories').where('code', 'FINANCE').first();
  const legalCategory = await knex('service_categories').where('code', 'LEGAL').first();
  const businessCategory = await knex('service_categories').where('code', 'BUSINESS').first();
  
  // Insert Services
  const services = [
    // Corporate Compliance Services
    {
      category_id: complianceCategory.id,
      name: 'Private Limited Company Incorporation',
      code: 'PVT_LTD_INC',
      description: 'Complete private limited company incorporation with DIN, DSC, name approval, and incorporation certificate',
      requirements: 'PAN cards of directors, Aadhaar cards, address proof, passport size photos, registered office address proof',
      deliverables: 'Certificate of Incorporation, PAN, TAN, Current Account opening assistance, Compliance Calendar',
      base_price: 9999.00,
      estimated_days: 15,
      sla_hours: 24,
      pricing_tiers: JSON.stringify({
        basic: 9999,
        standard: 14999,
        premium: 19999
      }),
      required_documents: JSON.stringify([
        'PAN Card of Directors',
        'Aadhaar Card of Directors', 
        'Address Proof of Directors',
        'Passport Size Photos',
        'Registered Office Address Proof',
        'Rent Agreement/NOC'
      ]),
      optional_documents: JSON.stringify([
        'Utility Bills',
        'Bank Statements'
      ]),
      requires_consultation: true,
      sort_order: 1
    },
    
    {
      category_id: complianceCategory.id,
      name: 'GST Registration',
      code: 'GST_REG',
      description: 'Complete GST registration for businesses with GSTIN certificate and return filing setup',
      requirements: 'Business registration proof, PAN, address proof, bank account details, authorized signatory details',
      deliverables: 'GST Registration Certificate, GSTIN, Login credentials, Initial return filing guidance',
      base_price: 2499.00,
      estimated_days: 7,
      sla_hours: 48,
      pricing_tiers: JSON.stringify({
        basic: 2499,
        with_filing: 4999
      }),
      required_documents: JSON.stringify([
        'Business Registration Proof',
        'PAN Card',
        'Address Proof',
        'Bank Account Details',
        'Aadhaar Card of Authorized Signatory'
      ]),
      requires_consultation: false,
      sort_order: 2
    },
    
    {
      category_id: complianceCategory.id,
      name: 'Annual ROC Compliance',
      code: 'ROC_ANNUAL',
      description: 'Complete annual ROC filing including AOC-4, MGT-7, and other mandatory forms',
      requirements: 'Financial statements, board resolutions, AGM details, updated shareholding pattern',
      deliverables: 'Filed AOC-4, MGT-7, ADT-1, compliance certificate, penalty calculation if applicable',
      base_price: 5999.00,
      estimated_days: 10,
      sla_hours: 72,
      pricing_tiers: JSON.stringify({
        basic: 5999,
        with_audit: 9999,
        premium: 14999
      }),
      required_documents: JSON.stringify([
        'Audited Financial Statements',
        'Board Resolutions',
        'AGM Minutes',
        'Shareholding Pattern',
        'Director Details'
      ]),
      requires_consultation: true,
      sort_order: 3
    },
    
    // Financial Services
    {
      category_id: financeCategory.id,
      name: 'Income Tax Return Filing',
      code: 'ITR_FILING',
      description: 'Individual and business income tax return filing with maximum refund optimization',
      requirements: 'Form 16, salary slips, investment proofs, bank statements, previous year ITR',
      deliverables: 'Filed ITR, acknowledgment receipt, refund status tracking, tax planning advice',
      base_price: 1499.00,
      estimated_days: 5,
      sla_hours: 24,
      pricing_tiers: JSON.stringify({
        salaried: 1499,
        business: 2999,
        complex: 4999
      }),
      required_documents: JSON.stringify([
        'Form 16/16A',
        'Salary Slips',
        'Bank Statements',
        'Investment Proofs',
        'Previous Year ITR'
      ]),
      requires_consultation: false,
      sort_order: 1
    },
    
    {
      category_id: financeCategory.id,
      name: 'Bookkeeping Services',
      code: 'BOOKKEEPING',
      description: 'Monthly bookkeeping with invoice management, expense tracking, and financial reports',
      requirements: 'Bank statements, invoices, receipts, previous books (if any)',
      deliverables: 'Monthly books, P&L statement, balance sheet, cash flow statement, expense analysis',
      base_price: 3999.00,
      estimated_days: 7,
      sla_hours: 48,
      pricing_tiers: JSON.stringify({
        basic: 3999,
        standard: 6999,
        comprehensive: 9999
      }),
      required_documents: JSON.stringify([
        'Bank Statements',
        'Sales Invoices',
        'Purchase Invoices',
        'Receipts',
        'Expense Bills'
      ]),
      requires_consultation: true,
      sort_order: 2
    },
    
    {
      category_id: financeCategory.id,
      name: 'Financial Audit',
      code: 'AUDIT',
      description: 'Statutory audit services for companies with audit report and compliance certificate',
      requirements: 'Complete books of accounts, trial balance, supporting vouchers, bank statements, fixed asset register',
      deliverables: 'Audit report, management letter, compliance certificate, tax audit report (if applicable)',
      base_price: 15999.00,
      estimated_days: 20,
      sla_hours: 96,
      pricing_tiers: JSON.stringify({
        small_company: 15999,
        medium_company: 25999,
        large_company: 49999
      }),
      required_documents: JSON.stringify([
        'Books of Accounts',
        'Trial Balance',
        'Bank Statements',
        'Fixed Asset Register',
        'Vouchers and Supporting Documents'
      ]),
      requires_consultation: true,
      sort_order: 3
    },
    
    // Legal Advisory Services
    {
      category_id: legalCategory.id,
      name: 'Contract Drafting & Review',
      code: 'CONTRACT_DRAFT',
      description: 'Professional drafting and review of business contracts, agreements, and legal documents',
      requirements: 'Contract requirements, parties details, terms and conditions, reference documents',
      deliverables: 'Drafted contract, legal review report, risk assessment, execution guidance',
      base_price: 4999.00,
      estimated_days: 5,
      sla_hours: 48,
      pricing_tiers: JSON.stringify({
        simple: 4999,
        complex: 9999,
        specialized: 19999
      }),
      required_documents: JSON.stringify([
        'Contract Brief',
        'Party Details',
        'Reference Documents',
        'Terms and Conditions'
      ]),
      requires_consultation: true,
      sort_order: 1
    },
    
    {
      category_id: legalCategory.id,
      name: 'Legal Notice Drafting',
      code: 'LEGAL_NOTICE',
      description: 'Professional legal notice drafting for various matters including recovery, breach of contract, etc.',
      requirements: 'Case details, supporting documents, respondent details, relief sought',
      deliverables: 'Legal notice, service guidelines, follow-up strategy, next steps advice',
      base_price: 2999.00,
      estimated_days: 3,
      sla_hours: 24,
      pricing_tiers: JSON.stringify({
        standard: 2999,
        urgent: 4999
      }),
      required_documents: JSON.stringify([
        'Case Details',
        'Supporting Documents',
        'Respondent Information',
        'Previous Correspondence'
      ]),
      requires_consultation: true,
      sort_order: 2
    },
    
    // Business Advisory Services
    {
      category_id: businessCategory.id,
      name: 'Business Plan Development',
      code: 'BUSINESS_PLAN',
      description: 'Comprehensive business plan development for startups and existing businesses seeking funding or expansion',
      requirements: 'Business idea details, market research, financial projections, team information',
      deliverables: 'Executive summary, market analysis, financial projections, funding requirements, implementation roadmap',
      base_price: 19999.00,
      estimated_days: 15,
      sla_hours: 72,
      pricing_tiers: JSON.stringify({
        startup: 19999,
        expansion: 29999,
        investor_ready: 49999
      }),
      required_documents: JSON.stringify([
        'Business Concept',
        'Market Research',
        'Financial Data',
        'Team Profiles',
        'Competitive Analysis'
      ]),
      requires_consultation: true,
      sort_order: 1
    },
    
    {
      category_id: businessCategory.id,
      name: 'Startup Consultation',
      code: 'STARTUP_CONSULT',
      description: 'Comprehensive startup consultation including business model, compliance, and funding strategy',
      requirements: 'Business idea, target market, revenue model, funding requirements',
      deliverables: 'Business model canvas, compliance checklist, funding strategy, mentor connect',
      base_price: 7999.00,
      estimated_days: 7,
      sla_hours: 48,
      pricing_tiers: JSON.stringify({
        basic: 7999,
        comprehensive: 14999
      }),
      required_documents: JSON.stringify([
        'Business Idea Description',
        'Market Analysis',
        'Revenue Model',
        'Founder Profiles'
      ]),
      requires_consultation: true,
      sort_order: 2
    },
    
    {
      category_id: businessCategory.id,
      name: 'MSME Registration & Certification',
      code: 'MSME_REG',
      description: 'MSME registration and udyam certificate with government benefits guidance',
      requirements: 'Business details, Aadhaar, PAN, business registration proof',
      deliverables: 'Udyam Registration Certificate, benefits guide, subsidy application assistance',
      base_price: 1999.00,
      estimated_days: 3,
      sla_hours: 24,
      pricing_tiers: JSON.stringify({
        registration_only: 1999,
        with_benefits: 3999
      }),
      required_documents: JSON.stringify([
        'Aadhaar Card',
        'PAN Card',
        'Business Registration Proof',
        'Bank Account Details'
      ]),
      requires_consultation: false,
      sort_order: 3
    }
  ];
  
  await knex('services').insert(services);
  
  console.log('✅ Seeded 4 service categories and 12 comprehensive services');
};