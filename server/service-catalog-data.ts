export interface ServiceCatalogEntry {
  serviceKey: string;
  name: string;
  periodicity: 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'ONGOING';
  description: string;
  category: string;
}

export const SERVICE_CATALOG: ServiceCatalogEntry[] = [
      // ===== BUSINESS REGISTRATIONS (10 services) =====
      {
        serviceKey: 'pvt_ltd_incorporation',
        name: 'Private Limited Company Registration',
        periodicity: 'ONE_TIME',
        description: 'Most preferred structure for startups with limited liability protection and investor-friendly structure',
        category: 'business_registration'
      },
      {
        serviceKey: 'llp_incorporation',
        name: 'Limited Liability Partnership (LLP) Registration',
        periodicity: 'ONE_TIME',
        description: 'Combines partnership benefits with limited liability protection for professional services',
        category: 'business_registration'
      },
      {
        serviceKey: 'opc_incorporation',
        name: 'One Person Company (OPC) Registration',
        periodicity: 'ONE_TIME',
        description: 'Single shareholder company structure ideal for solo entrepreneurs',
        category: 'business_registration'
      },
      {
        serviceKey: 'partnership_registration',
        name: 'Partnership Firm Registration',
        periodicity: 'ONE_TIME',
        description: 'Traditional partnership registration under Partnership Act 1932',
        category: 'business_registration'
      },
      {
        serviceKey: 'proprietorship_registration',
        name: 'Sole Proprietorship Registration',
        periodicity: 'ONE_TIME',
        description: 'Individual business registration - simplest business structure',
        category: 'business_registration'
      },
      {
        serviceKey: 'section8_company',
        name: 'Section 8 Company Registration',
        periodicity: 'ONE_TIME',
        description: 'Non-profit company registration for charitable and social welfare organizations',
        category: 'business_registration'
      },
      {
        serviceKey: 'nidhi_company',
        name: 'Nidhi Company Registration',
        periodicity: 'ONE_TIME',
        description: 'Mutual benefit financial company for members savings and lending',
        category: 'business_registration'
      },
      {
        serviceKey: 'producer_company',
        name: 'Producer Company Registration',
        periodicity: 'ONE_TIME',
        description: 'Agricultural and farmer producer organization registration',
        category: 'business_registration'
      },
      {
        serviceKey: 'public_limited_company',
        name: 'Public Limited Company Registration',
        periodicity: 'ONE_TIME',
        description: 'Public company registration for businesses planning public listing',
        category: 'business_registration'
      },
      {
        serviceKey: 'startup_india_registration',
        name: 'Startup India Registration',
        periodicity: 'ONE_TIME',
        description: 'DPIIT recognition for government benefits, tax exemptions, and funding access',
        category: 'business_registration'
      },

      // ===== TAX REGISTRATIONS (3 services) =====
      {
        serviceKey: 'gst_registration',
        name: 'GST Registration',
        periodicity: 'ONE_TIME',
        description: 'Goods and Services Tax registration - mandatory for turnover >₹20 lakhs',
        category: 'tax_registration'
      },
      {
        serviceKey: 'professional_tax_registration',
        name: 'Professional Tax Registration',
        periodicity: 'ONE_TIME',
        description: 'State professional tax registration for businesses with employees',
        category: 'tax_registration'
      },
      {
        serviceKey: 'tan_registration',
        name: 'TAN Registration',
        periodicity: 'ONE_TIME',
        description: 'Tax Deduction Account Number for entities deducting TDS',
        category: 'tax_registration'
      },

      // ===== LICENSES & REGULATORY (9 services) =====
      {
        serviceKey: 'fssai_registration',
        name: 'FSSAI Registration/License',
        periodicity: 'ONE_TIME',
        description: 'Food Safety and Standards Authority license for food businesses',
        category: 'licenses'
      },
      {
        serviceKey: 'fssai_product_approval',
        name: 'FSSAI Product Approval',
        periodicity: 'ONE_TIME',
        description: 'Product approval for non-standard food items and novel products',
        category: 'licenses'
      },
      {
        serviceKey: 'trade_license',
        name: 'Trade License',
        periodicity: 'ONE_TIME',
        description: 'Municipal corporation business permit for commercial establishments',
        category: 'licenses'
      },
      {
        serviceKey: 'shops_establishments',
        name: 'Shops & Establishments Act Registration',
        periodicity: 'ONE_TIME',
        description: 'Registration under Shops and Establishments Act for employee welfare',
        category: 'licenses'
      },
      {
        serviceKey: 'iec_registration',
        name: 'Import Export Code (IEC)',
        periodicity: 'ONE_TIME',
        description: '10-digit IEC code from DGFT for import/export businesses',
        category: 'licenses'
      },
      {
        serviceKey: 'ad_code_registration',
        name: 'AD Code Registration',
        periodicity: 'ONE_TIME',
        description: 'Authorized dealer code for export proceeds and foreign exchange',
        category: 'licenses'
      },
      {
        serviceKey: 'lut_filing',
        name: 'Letter of Undertaking (LUT)',
        periodicity: 'ANNUAL',
        description: 'LUT filing for GST-exempt exports without tax payment',
        category: 'licenses'
      },
      {
        serviceKey: 'dot_osp_license',
        name: 'DOT OSP License',
        periodicity: 'ONE_TIME',
        description: 'Department of Telecommunications Other Service Provider license',
        category: 'licenses'
      },
      {
        serviceKey: 'labour_law_compliance',
        name: 'Labour Law Compliance',
        periodicity: 'ONGOING',
        description: 'Comprehensive employment and labor law compliance',
        category: 'licenses'
      },

      // ===== INTELLECTUAL PROPERTY (15 services) =====
      {
        serviceKey: 'trademark_registration',
        name: 'Trademark Registration',
        periodicity: 'ONE_TIME',
        description: 'Brand name and logo protection under Trademarks Act',
        category: 'intellectual_property'
      },
      {
        serviceKey: 'trademark_search',
        name: 'Trademark Search',
        periodicity: 'ONE_TIME',
        description: 'Comprehensive trademark availability search before filing',
        category: 'intellectual_property'
      },
      {
        serviceKey: 'trademark_objection',
        name: 'Trademark Objection Response',
        periodicity: 'ONE_TIME',
        description: 'Handle trademark objections and oppositions',
        category: 'intellectual_property'
      },
      {
        serviceKey: 'trademark_renewal',
        name: 'Trademark Renewal',
        periodicity: 'ONE_TIME',
        description: 'Renewal of registered trademark (every 10 years)',
        category: 'intellectual_property'
      },
      {
        serviceKey: 'trademark_assignment',
        name: 'Trademark Assignment',
        periodicity: 'ONE_TIME',
        description: 'Transfer of trademark ownership rights',
        category: 'intellectual_property'
      },
      {
        serviceKey: 'trademark_watch',
        name: 'Trademark Watch Services',
        periodicity: 'ONGOING',
        description: 'Monitor and protect trademark from infringement',
        category: 'intellectual_property'
      },
      {
        serviceKey: 'logo_registration',
        name: 'Logo Registration/Design',
        periodicity: 'ONE_TIME',
        description: 'Logo and design trademark registration',
        category: 'intellectual_property'
      },
      {
        serviceKey: 'copyright_registration',
        name: 'Copyright Registration',
        periodicity: 'ONE_TIME',
        description: 'Copyright protection for software, content, audio, video',
        category: 'intellectual_property'
      },
      {
        serviceKey: 'copyright_objection',
        name: 'Copyright Objection',
        periodicity: 'ONE_TIME',
        description: 'Handle copyright objections and disputes',
        category: 'intellectual_property'
      },
      {
        serviceKey: 'patent_search',
        name: 'Patent Search',
        periodicity: 'ONE_TIME',
        description: 'Prior art search and patentability analysis',
        category: 'intellectual_property'
      },
      {
        serviceKey: 'patent_provisional',
        name: 'Patent Provisional Registration',
        periodicity: 'ONE_TIME',
        description: 'Provisional patent application to secure priority date',
        category: 'intellectual_property'
      },
      {
        serviceKey: 'patent_complete',
        name: 'Patent Complete Registration',
        periodicity: 'ONE_TIME',
        description: 'Complete patent specification and examination',
        category: 'intellectual_property'
      },
      {
        serviceKey: 'design_registration',
        name: 'Design Registration',
        periodicity: 'ONE_TIME',
        description: 'Industrial design registration for product appearance',
        category: 'intellectual_property'
      },
      {
        serviceKey: 'geographical_indication',
        name: 'Geographical Indication (GI) Registration',
        periodicity: 'ONE_TIME',
        description: 'GI tag registration for region-specific products',
        category: 'intellectual_property'
      },
      {
        serviceKey: 'ip_portfolio_management',
        name: 'IP Portfolio Management',
        periodicity: 'ONGOING',
        description: 'Comprehensive intellectual property portfolio management',
        category: 'intellectual_property'
      },

      // ===== CERTIFICATIONS (3 services - excluding environment) =====
      {
        serviceKey: 'msme_registration',
        name: 'MSME/Udyam Registration',
        periodicity: 'ONE_TIME',
        description: 'Micro, Small & Medium Enterprise registration for government benefits',
        category: 'certifications'
      },
      {
        serviceKey: 'iso_certification',
        name: 'ISO Certification',
        periodicity: 'ONE_TIME',
        description: 'ISO quality management standards certification (9001, 14001, 27001, etc.)',
        category: 'certifications'
      },
      {
        serviceKey: 'icat_certification',
        name: 'iCAT Certification',
        periodicity: 'ONE_TIME',
        description: 'International Centre for Automotive Technology certification',
        category: 'certifications'
      },

      // ===== MONTHLY COMPLIANCES (5 services) =====
      {
        serviceKey: 'gst_returns',
        name: 'GST Returns Filing',
        periodicity: 'MONTHLY',
        description: 'Monthly GST return preparation, reconciliation, and filing (GSTR-1, GSTR-3B)',
        category: 'monthly_compliance'
      },
      {
        serviceKey: 'gst_returns_qrmp',
        name: 'GST Returns (QRMP)',
        periodicity: 'QUARTERLY',
        description: 'Quarterly GST return filing under QRMP scheme for eligible taxpayers',
        category: 'monthly_compliance'
      },
      {
        serviceKey: 'accounting_monthly',
        name: 'Monthly Accounting & Bookkeeping',
        periodicity: 'MONTHLY',
        description: 'Monthly bookkeeping, bank reconciliation, and financial reporting',
        category: 'monthly_compliance'
      },
      {
        serviceKey: 'pf_esi_monthly',
        name: 'PF/ESI Monthly Compliance',
        periodicity: 'MONTHLY',
        description: 'Monthly PF and ESI contribution calculation, payment, and return filing',
        category: 'monthly_compliance'
      },
      {
        serviceKey: 'professional_tax_returns',
        name: 'Professional Tax Returns',
        periodicity: 'MONTHLY',
        description: 'State professional tax monthly/quarterly return filing',
        category: 'monthly_compliance'
      },

      // ===== QUARTERLY COMPLIANCES (2 services) =====
      {
        serviceKey: 'tds_quarterly',
        name: 'TDS Quarterly Returns',
        periodicity: 'QUARTERLY',
        description: 'TDS calculation, payment, and quarterly return filing (24Q/26Q/27Q/27EQ)',
        category: 'quarterly_compliance'
      },
      {
        serviceKey: 'quarterly_statutory',
        name: 'Quarterly Statutory Filings',
        periodicity: 'QUARTERLY',
        description: 'Quarterly statutory filings including MSME, FLA, and sector-specific returns',
        category: 'quarterly_compliance'
      },

      // ===== ANNUAL COMPLIANCES (15 services) =====
      {
        serviceKey: 'annual_filings_roc',
        name: 'Annual ROC Filings (Company)',
        periodicity: 'ANNUAL',
        description: 'Annual compliance with ROC including AOC-4, MGT-7, and other statutory forms',
        category: 'annual_compliance'
      },
      {
        serviceKey: 'llp_annual_filing',
        name: 'LLP Annual Filing',
        periodicity: 'ANNUAL',
        description: 'Annual LLP compliance - Form 11 and Form 8',
        category: 'annual_compliance'
      },
      {
        serviceKey: 'inc_20a',
        name: 'Form INC-20A (Commencement of Business)',
        periodicity: 'ONE_TIME',
        description: 'Declaration of commencement of business within 180 days',
        category: 'annual_compliance'
      },
      {
        serviceKey: 'inc_22a',
        name: 'Form INC-22A (Active Company Status)',
        periodicity: 'ANNUAL',
        description: 'Active company status declaration - MSME companies',
        category: 'annual_compliance'
      },
      {
        serviceKey: 'dpt_3',
        name: 'Form DPT-3 (Return of Deposits)',
        periodicity: 'ANNUAL',
        description: 'Annual return of deposits and outstanding receipt',
        category: 'annual_compliance'
      },
      {
        serviceKey: 'msme_1',
        name: 'Form MSME-1 (MSME Disclosure)',
        periodicity: 'HALF_YEARLY',
        description: 'Half-yearly disclosure of outstanding payments to MSMEs',
        category: 'annual_compliance'
      },
      {
        serviceKey: 'dir_3_kyc',
        name: 'DIR-3 KYC / DIN KYC',
        periodicity: 'ANNUAL',
        description: 'Annual director KYC verification (before September 30)',
        category: 'annual_compliance'
      },
      {
        serviceKey: 'itr_salaried',
        name: 'Income Tax Filing - Salaried',
        periodicity: 'ANNUAL',
        description: 'Individual income tax return for salaried employees',
        category: 'annual_compliance'
      },
      {
        serviceKey: 'itr_business',
        name: 'Income Tax Filing - Business',
        periodicity: 'ANNUAL',
        description: 'Business income tax return for companies, LLPs, and proprietorships',
        category: 'annual_compliance'
      },
      {
        serviceKey: 'form_15ca_cb',
        name: 'Form 15CA/15CB',
        periodicity: 'ONE_TIME',
        description: 'Foreign remittance compliance and CA certificate',
        category: 'annual_compliance'
      },
      {
        serviceKey: 'bs_pl_annual',
        name: 'Financial Statements (BS & P&L)',
        periodicity: 'ANNUAL',
        description: 'Annual financial statement preparation including Balance Sheet and P&L',
        category: 'annual_compliance'
      },
      {
        serviceKey: 'rera_registration',
        name: 'RERA Registration',
        periodicity: 'ONE_TIME',
        description: 'Real estate project registration with RERA authority',
        category: 'annual_compliance'
      },
      {
        serviceKey: 'rera_compliance',
        name: 'RERA Compliance',
        periodicity: 'QUARTERLY',
        description: 'RERA quarterly updates, annual filing, and audit compliance',
        category: 'annual_compliance'
      },
      {
        serviceKey: 'gst_annual_return',
        name: 'GST Annual Return (GSTR-9)',
        periodicity: 'ANNUAL',
        description: 'Annual GST return consolidation and filing',
        category: 'annual_compliance'
      },
      {
        serviceKey: 'gst_audit',
        name: 'GST Audit (GSTR-9C)',
        periodicity: 'ANNUAL',
        description: 'GST audit and reconciliation for turnover >₹5 Cr',
        category: 'annual_compliance'
      },

      // ===== CHANGE/MODIFICATION SERVICES (6 services) =====
      {
        serviceKey: 'add_remove_director',
        name: 'Add/Remove Director',
        periodicity: 'ONE_TIME',
        description: 'Director appointment or resignation with ROC filing',
        category: 'change_services'
      },
      {
        serviceKey: 'change_llp_agreement',
        name: 'Change in LLP Agreement',
        periodicity: 'ONE_TIME',
        description: 'Amendment to LLP partnership agreement',
        category: 'change_services'
      },
      {
        serviceKey: 'add_designated_partner',
        name: 'Add Designated Partner',
        periodicity: 'ONE_TIME',
        description: 'Addition of designated partner in LLP',
        category: 'change_services'
      },
      {
        serviceKey: 'change_company_name',
        name: 'Change Company Name',
        periodicity: 'ONE_TIME',
        description: 'Company name change with ROC approval',
        category: 'change_services'
      },
      {
        serviceKey: 'change_registered_office',
        name: 'Change Registered Office Address',
        periodicity: 'ONE_TIME',
        description: 'Registered office address change filing',
        category: 'change_services'
      },
      {
        serviceKey: 'increase_authorized_capital',
        name: 'Increase Authorized Capital',
        periodicity: 'ONE_TIME',
        description: 'Increase in authorized share capital with ROC',
        category: 'change_services'
      },

      // ===== CONVERSION SERVICES (4 services) =====
      {
        serviceKey: 'partnership_to_llp',
        name: 'Partnership to LLP Conversion',
        periodicity: 'ONE_TIME',
        description: 'Convert partnership firm to Limited Liability Partnership',
        category: 'conversion_services'
      },
      {
        serviceKey: 'proprietorship_to_pvt_ltd',
        name: 'Sole Proprietorship to Pvt Ltd Conversion',
        periodicity: 'ONE_TIME',
        description: 'Convert sole proprietorship to private limited company',
        category: 'conversion_services'
      },
      {
        serviceKey: 'pvt_ltd_to_opc',
        name: 'Private Limited to OPC Conversion',
        periodicity: 'ONE_TIME',
        description: 'Convert private limited company to one person company',
        category: 'conversion_services'
      },
      {
        serviceKey: 'business_conversion_others',
        name: 'Other Business Structure Conversions',
        periodicity: 'ONE_TIME',
        description: 'Various business structure conversion services',
        category: 'conversion_services'
      },

      // ===== CLOSURE SERVICES (3 services) =====
      {
        serviceKey: 'llp_closure',
        name: 'Closure of LLP',
        periodicity: 'ONE_TIME',
        description: 'LLP winding up and closure process',
        category: 'closure_services'
      },
      {
        serviceKey: 'company_closure',
        name: 'Closure of Private Limited Company',
        periodicity: 'ONE_TIME',
        description: 'Private limited company closure and liquidation',
        category: 'closure_services'
      },
      {
        serviceKey: 'company_strike_off',
        name: 'Company Strike-off',
        periodicity: 'ONE_TIME',
        description: 'Fast-track company closure through strike-off (STK-2)',
        category: 'closure_services'
      },

      // ===== LEGAL DOCUMENTATION (7 services) =====
      {
        serviceKey: 'shareholders_agreement',
        name: 'Shareholders Agreement',
        periodicity: 'ONE_TIME',
        description: 'Draft shareholders agreement for equity distribution',
        category: 'legal_documentation'
      },
      {
        serviceKey: 'founders_agreement',
        name: 'Founders Agreement',
        periodicity: 'ONE_TIME',
        description: 'Founders agreement for startup equity and roles',
        category: 'legal_documentation'
      },
      {
        serviceKey: 'nda_agreement',
        name: 'Non-Disclosure Agreement (NDA)',
        periodicity: 'ONE_TIME',
        description: 'Confidentiality and non-disclosure agreement drafting',
        category: 'legal_documentation'
      },
      {
        serviceKey: 'terms_privacy_policy',
        name: 'Terms of Service & Privacy Policy',
        periodicity: 'ONE_TIME',
        description: 'Website terms of service and privacy policy drafting',
        category: 'legal_documentation'
      },
      {
        serviceKey: 'vendor_agreements',
        name: 'Vendor/Employee Agreements',
        periodicity: 'ONE_TIME',
        description: 'Vendor contracts and employment agreement drafting',
        category: 'legal_documentation'
      },
      {
        serviceKey: 'consumer_complaint',
        name: 'Consumer Complaint Filing',
        periodicity: 'ONE_TIME',
        description: 'Consumer forum complaint filing and representation',
        category: 'legal_documentation'
      },
      {
        serviceKey: 'legal_advisory',
        name: 'Legal Advisory & Consultation',
        periodicity: 'ONGOING',
        description: 'Comprehensive legal consultation and advisory services',
        category: 'legal_documentation'
      },

      // ===== DIGITAL SIGNATURE (2 services) =====
      {
        serviceKey: 'dsc_registration',
        name: 'Digital Signature Certificate (DSC)',
        periodicity: 'ONE_TIME',
        description: 'Class 3 DSC for company directors and authorized signatories',
        category: 'digital_services'
      },
      {
        serviceKey: 'dsc_foreign',
        name: 'DSC for Foreign Citizens',
        periodicity: 'ONE_TIME',
        description: 'Digital signature certificate for foreign directors',
        category: 'digital_services'
      },

      // ===== FINANCIAL SERVICES (7 services) =====
      {
        serviceKey: 'msme_loans',
        name: 'MSME Loans',
        periodicity: 'ONE_TIME',
        description: 'MSME business loan facilitation and documentation',
        category: 'financial_services'
      },
      {
        serviceKey: 'government_grants',
        name: 'Government Grants',
        periodicity: 'ONE_TIME',
        description: 'Government subsidy and grant application support',
        category: 'financial_services'
      },
      {
        serviceKey: 'fundraising_support',
        name: 'Fundraising Support',
        periodicity: 'ONE_TIME',
        description: 'Startup fundraising and investor pitch support',
        category: 'financial_services'
      },
      {
        serviceKey: 'cma_report',
        name: 'CMA Report Preparation',
        periodicity: 'ONE_TIME',
        description: 'Credit Monitoring Arrangement report for bank loans',
        category: 'financial_services'
      },
      {
        serviceKey: 'huf_services',
        name: 'Hindu Undivided Family (HUF) Services',
        periodicity: 'ONE_TIME',
        description: 'HUF formation and tax planning services',
        category: 'financial_services'
      },
      {
        serviceKey: 'auditing_services',
        name: 'Auditing Services',
        periodicity: 'ANNUAL',
        description: 'Statutory audit, tax audit, and internal audit services',
        category: 'financial_services'
      },
      {
        serviceKey: 'financial_projection',
        name: 'Financial Projection & Business Plan',
        periodicity: 'ONE_TIME',
        description: 'Business plan and financial projection for investors',
        category: 'financial_services'
      },

      // ===== TAX SERVICES (5 services) =====
      {
        serviceKey: 'gst_cancellation',
        name: 'GST Cancellation',
        periodicity: 'ONE_TIME',
        description: 'GST registration cancellation and closure',
        category: 'tax_services'
      },
      {
        serviceKey: 'tax_refunds',
        name: 'Tax Refunds',
        periodicity: 'ONE_TIME',
        description: 'Income tax, GST, and customs duty refund claims',
        category: 'tax_services'
      },
      {
        serviceKey: 'tax_advisory',
        name: 'Tax Advisory',
        periodicity: 'ONGOING',
        description: 'Comprehensive tax planning and advisory services',
        category: 'tax_services'
      },
      {
        serviceKey: 'tax_planning',
        name: 'Tax Planning & Optimization',
        periodicity: 'ANNUAL',
        description: 'Annual tax planning for individuals and businesses',
        category: 'tax_services'
      },
      {
        serviceKey: 'transfer_pricing',
        name: 'Transfer Pricing Services',
        periodicity: 'ANNUAL',
        description: 'Transfer pricing documentation and compliance',
        category: 'tax_services'
      }
    ];
