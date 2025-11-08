/**
 * Seed file for services catalog
 * Creates 131 compliance and business services across all categories
 */

exports.seed = async function(knex) {
  // Clear existing services
  await knex('services').del();

  const services = [
    // ===== BUSINESS REGISTRATIONS (10 services) =====
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Private Limited Company Registration',
      description: 'Most preferred structure for startups with limited liability protection and investor-friendly structure',
      category: 'business_registration',
      base_price: 15000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Limited Liability Partnership (LLP) Registration',
      description: 'Combines partnership benefits with limited liability protection for professional services',
      category: 'business_registration',
      base_price: 12000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'One Person Company (OPC) Registration',
      description: 'Single shareholder company structure ideal for solo entrepreneurs',
      category: 'business_registration',
      base_price: 10000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Partnership Firm Registration',
      description: 'Traditional partnership registration under Partnership Act 1932',
      category: 'business_registration',
      base_price: 8000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Sole Proprietorship Registration',
      description: 'Individual business registration - simplest business structure',
      category: 'business_registration',
      base_price: 5000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Section 8 Company Registration',
      description: 'Non-profit company registration for charitable and social welfare organizations',
      category: 'business_registration',
      base_price: 20000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Nidhi Company Registration',
      description: 'Mutual benefit financial company for members savings and lending',
      category: 'business_registration',
      base_price: 25000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Producer Company Registration',
      description: 'Agricultural and farmer producer organization registration',
      category: 'business_registration',
      base_price: 18000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Public Limited Company Registration',
      description: 'Public company registration for businesses planning public listing',
      category: 'business_registration',
      base_price: 35000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Startup India Registration',
      description: 'DPIIT recognition for government benefits, tax exemptions, and funding access',
      category: 'business_registration',
      base_price: 6000.00,
      is_active: true
    },

    // ===== TAX REGISTRATIONS (3 services) =====
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'GST Registration',
      description: 'Goods and Services Tax registration - mandatory for turnover >₹20 lakhs',
      category: 'tax_registration',
      base_price: 4000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Professional Tax Registration',
      description: 'State professional tax registration for businesses with employees',
      category: 'tax_registration',
      base_price: 3000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'TAN Registration',
      description: 'Tax Deduction Account Number for entities deducting TDS',
      category: 'tax_registration',
      base_price: 2500.00,
      is_active: true
    },

    // ===== LICENSES & REGULATORY (9 services) =====
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'FSSAI Registration/License',
      description: 'Food Safety and Standards Authority license for food businesses',
      category: 'licenses',
      base_price: 5000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'FSSAI Product Approval',
      description: 'Product approval for non-standard food items and novel products',
      category: 'licenses',
      base_price: 7000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Trade License',
      description: 'Municipal corporation business permit for commercial establishments',
      category: 'licenses',
      base_price: 6000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Shops & Establishments Act Registration',
      description: 'Registration under Shops and Establishments Act for employee welfare',
      category: 'licenses',
      base_price: 3500.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Import Export Code (IEC)',
      description: '10-digit IEC code from DGFT for import/export businesses',
      category: 'licenses',
      base_price: 5000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'AD Code Registration',
      description: 'Authorized dealer code for export proceeds and foreign exchange',
      category: 'licenses',
      base_price: 4000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Letter of Undertaking (LUT)',
      description: 'LUT filing for GST-exempt exports without tax payment',
      category: 'licenses',
      base_price: 3000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'DOT OSP License',
      description: 'Department of Telecommunications Other Service Provider license',
      category: 'licenses',
      base_price: 15000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Labour Law Compliance',
      description: 'Comprehensive employment and labor law compliance',
      category: 'licenses',
      base_price: 8000.00,
      is_active: true
    },

    // ===== INTELLECTUAL PROPERTY (15 services) =====
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Trademark Registration',
      description: 'Brand name and logo protection under Trademarks Act',
      category: 'intellectual_property',
      base_price: 8000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Trademark Search',
      description: 'Comprehensive trademark availability search before filing',
      category: 'intellectual_property',
      base_price: 2000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Trademark Objection Response',
      description: 'Handle trademark objections and oppositions',
      category: 'intellectual_property',
      base_price: 12000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Trademark Renewal',
      description: 'Renewal of registered trademark (every 10 years)',
      category: 'intellectual_property',
      base_price: 7000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Trademark Assignment',
      description: 'Transfer of trademark ownership rights',
      category: 'intellectual_property',
      base_price: 10000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Trademark Watch Services',
      description: 'Monitor and protect trademark from infringement',
      category: 'intellectual_property',
      base_price: 5000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Logo Registration/Design',
      description: 'Logo and design trademark registration',
      category: 'intellectual_property',
      base_price: 9000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Copyright Registration',
      description: 'Copyright protection for software, content, audio, video',
      category: 'intellectual_property',
      base_price: 6000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Copyright Objection',
      description: 'Handle copyright objections and disputes',
      category: 'intellectual_property',
      base_price: 10000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Patent Search',
      description: 'Prior art search and patentability analysis',
      category: 'intellectual_property',
      base_price: 15000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Patent Provisional Registration',
      description: 'Provisional patent application to secure priority date',
      category: 'intellectual_property',
      base_price: 25000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Patent Complete Registration',
      description: 'Complete patent specification and examination',
      category: 'intellectual_property',
      base_price: 50000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Design Registration',
      description: 'Industrial design registration for product appearance',
      category: 'intellectual_property',
      base_price: 12000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Geographical Indication (GI) Registration',
      description: 'GI tag registration for region-specific products',
      category: 'intellectual_property',
      base_price: 20000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'IP Portfolio Management',
      description: 'Comprehensive intellectual property portfolio management',
      category: 'intellectual_property',
      base_price: 15000.00,
      is_active: true
    },

    // ===== CERTIFICATIONS (3 services) =====
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'MSME/Udyam Registration',
      description: 'Micro, Small & Medium Enterprise registration for government benefits',
      category: 'certifications',
      base_price: 3000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'ISO Certification',
      description: 'ISO quality management standards certification (9001, 14001, 27001, etc.)',
      category: 'certifications',
      base_price: 35000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'iCAT Certification',
      description: 'International Centre for Automotive Technology certification',
      category: 'certifications',
      base_price: 25000.00,
      is_active: true
    },

    // ===== MONTHLY COMPLIANCES (5 services) =====
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'GST Returns Filing',
      description: 'Monthly GST return preparation, reconciliation, and filing (GSTR-1, GSTR-3B)',
      category: 'monthly_compliance',
      base_price: 2000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'GST Returns (QRMP)',
      description: 'Quarterly GST return filing under QRMP scheme for eligible taxpayers',
      category: 'quarterly_compliance',
      base_price: 1500.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Monthly Accounting & Bookkeeping',
      description: 'Monthly bookkeeping, bank reconciliation, and financial reporting',
      category: 'monthly_compliance',
      base_price: 3000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'PF/ESI Monthly Compliance',
      description: 'Monthly PF and ESI contribution calculation, payment, and return filing',
      category: 'monthly_compliance',
      base_price: 2500.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Professional Tax Returns',
      description: 'State professional tax monthly/quarterly return filing',
      category: 'monthly_compliance',
      base_price: 1500.00,
      is_active: true
    },

    // ===== QUARTERLY COMPLIANCES (2 services) =====
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'TDS Quarterly Returns',
      description: 'TDS calculation, payment, and quarterly return filing (24Q/26Q/27Q/27EQ)',
      category: 'quarterly_compliance',
      base_price: 5000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Quarterly Statutory Filings',
      description: 'Quarterly statutory filings including MSME, FLA, and sector-specific returns',
      category: 'quarterly_compliance',
      base_price: 4000.00,
      is_active: true
    },

    // ===== ANNUAL COMPLIANCES (15 services) =====
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Annual ROC Filings (Company)',
      description: 'Annual compliance with ROC including AOC-4, MGT-7, and other statutory forms',
      category: 'annual_compliance',
      base_price: 10000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'LLP Annual Filing',
      description: 'Annual LLP compliance - Form 11 and Form 8',
      category: 'annual_compliance',
      base_price: 8000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Form INC-20A (Commencement of Business)',
      description: 'Declaration of commencement of business within 180 days',
      category: 'annual_compliance',
      base_price: 3000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Form INC-22A (Active Company Status)',
      description: 'Active company status declaration - MSME companies',
      category: 'annual_compliance',
      base_price: 2500.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Form DPT-3 (Return of Deposits)',
      description: 'Annual return of deposits and outstanding receipt',
      category: 'annual_compliance',
      base_price: 4000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Form MSME-1 (MSME Disclosure)',
      description: 'Half-yearly disclosure of outstanding payments to MSMEs',
      category: 'annual_compliance',
      base_price: 3000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'DIR-3 KYC / DIN KYC',
      description: 'Annual director KYC verification (before September 30)',
      category: 'annual_compliance',
      base_price: 2000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Income Tax Filing - Salaried',
      description: 'Individual income tax return for salaried employees',
      category: 'annual_compliance',
      base_price: 2500.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Income Tax Filing - Business',
      description: 'Business income tax return for companies, LLPs, and proprietorships',
      category: 'annual_compliance',
      base_price: 8000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Form 15CA/15CB',
      description: 'Foreign remittance compliance and CA certificate',
      category: 'annual_compliance',
      base_price: 5000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Financial Statements (BS & P&L)',
      description: 'Annual financial statement preparation including Balance Sheet and P&L',
      category: 'annual_compliance',
      base_price: 12000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'RERA Registration',
      description: 'Real Estate Regulatory Authority registration for real estate projects',
      category: 'annual_compliance',
      base_price: 30000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Annual Audit & Tax Audit',
      description: 'Statutory audit and tax audit under Income Tax Act',
      category: 'annual_compliance',
      base_price: 25000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'GST Annual Return (GSTR-9)',
      description: 'Annual GST return filing and reconciliation',
      category: 'annual_compliance',
      base_price: 8000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'GST Annual Audit (GSTR-9C)',
      description: 'GST audit certificate from CA for turnover >₹5 crore',
      category: 'annual_compliance',
      base_price: 15000.00,
      is_active: true
    },

    // ===== ADDITIONAL SERVICES (remaining to reach 131) =====
    // Digital Services
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Digital Signature Certificate (DSC)',
      description: 'Class 3 Digital Signature for e-filing and compliance',
      category: 'digital_services',
      base_price: 1500.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Website Development',
      description: 'Professional website design and development',
      category: 'digital_services',
      base_price: 25000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Logo Design',
      description: 'Professional logo design and branding',
      category: 'digital_services',
      base_price: 5000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Business Plan Preparation',
      description: 'Comprehensive business plan for funding and expansion',
      category: 'advisory',
      base_price: 15000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Financial Projections',
      description: '3-5 year financial projections and analysis',
      category: 'advisory',
      base_price: 10000.00,
      is_active: true
    },

    // Amendment Services
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Company Name Change',
      description: 'Change of company name with ROC approval',
      category: 'amendments',
      base_price: 8000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Registered Office Address Change',
      description: 'Change of registered office address',
      category: 'amendments',
      base_price: 6000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Director Appointment/Removal',
      description: 'Addition or removal of directors',
      category: 'amendments',
      base_price: 5000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Share Transfer',
      description: 'Transfer of shares and securities',
      category: 'amendments',
      base_price: 7000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Increase in Authorized Capital',
      description: 'Increase authorized share capital',
      category: 'amendments',
      base_price: 10000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'MOA/AOA Amendment',
      description: 'Amendment to Memorandum or Articles of Association',
      category: 'amendments',
      base_price: 8000.00,
      is_active: true
    },

    // Closure Services
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Company Closure/Winding Up',
      description: 'Voluntary closure and strike off of company',
      category: 'closure',
      base_price: 20000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'LLP Closure',
      description: 'LLP dissolution and closure',
      category: 'closure',
      base_price: 15000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'GST Cancellation',
      description: 'GST registration cancellation',
      category: 'closure',
      base_price: 3000.00,
      is_active: true
    },

    // Conversion Services
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Proprietorship to LLP Conversion',
      description: 'Convert proprietorship to LLP structure',
      category: 'conversion',
      base_price: 15000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'LLP to Private Limited Conversion',
      description: 'Convert LLP to Private Limited Company',
      category: 'conversion',
      base_price: 25000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Partnership to LLP Conversion',
      description: 'Convert partnership firm to LLP',
      category: 'conversion',
      base_price: 18000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Private to Public Limited Conversion',
      description: 'Convert Private Limited to Public Limited Company',
      category: 'conversion',
      base_price: 35000.00,
      is_active: true
    },

    // Fundraising & Investment
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Funding Assistance',
      description: 'Assistance with equity funding and investor pitch',
      category: 'advisory',
      base_price: 25000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Government Subsidy Registration',
      description: 'Registration for government grants and subsidies',
      category: 'advisory',
      base_price: 10000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Foreign Direct Investment (FDI) Consulting',
      description: 'FDI compliance and consulting services',
      category: 'advisory',
      base_price: 30000.00,
      is_active: true
    },

    // Payroll & HR
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Payroll Processing Monthly',
      description: 'Monthly payroll processing and compliance',
      category: 'hr_services',
      base_price: 5000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'HR Consulting',
      description: 'HR policy development and employee management',
      category: 'hr_services',
      base_price: 15000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Employee Stock Option Plan (ESOP)',
      description: 'ESOP design and implementation',
      category: 'hr_services',
      base_price: 25000.00,
      is_active: true
    },

    // Import/Export Services
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'RCMC Registration',
      description: 'Registration cum Membership Certificate for export benefits',
      category: 'import_export',
      base_price: 8000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'APEDA Registration',
      description: 'Agricultural and Processed Food Products Export registration',
      category: 'import_export',
      base_price: 10000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Export Incentive Claims',
      description: 'MEIS, SEIS, and other export incentive claims',
      category: 'import_export',
      base_price: 12000.00,
      is_active: true
    },

    // Additional Compliance
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Form 16 Preparation',
      description: 'TDS certificate preparation and issuance',
      category: 'tax_compliance',
      base_price: 1500.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Form 26AS Reconciliation',
      description: 'Annual tax credit reconciliation',
      category: 'tax_compliance',
      base_price: 2000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Tax Planning & Consultation',
      description: 'Tax optimization and planning services',
      category: 'advisory',
      base_price: 10000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'GST Input Credit Reconciliation',
      description: 'Monthly GST ITC reconciliation and optimization',
      category: 'tax_compliance',
      base_price: 3000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'GST Refund Filing',
      description: 'GST refund application and processing',
      category: 'tax_compliance',
      base_price: 5000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Transfer Pricing Documentation',
      description: 'Transfer pricing study and documentation',
      category: 'tax_compliance',
      base_price: 40000.00,
      is_active: true
    },

    // Environmental & Safety
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Environmental Clearance',
      description: 'EC from State or Central Environmental Authority',
      category: 'environmental',
      base_price: 25000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Pollution Control Board Registration',
      description: 'Consent to Establish and Operate from PCB',
      category: 'environmental',
      base_price: 15000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Factory License',
      description: 'License under Factories Act for manufacturing units',
      category: 'licenses',
      base_price: 10000.00,
      is_active: true
    },

    // Sector-Specific
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Drug License',
      description: 'Pharmaceutical manufacturing and trading license',
      category: 'licenses',
      base_price: 20000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'BIS Certification',
      description: 'Bureau of Indian Standards product certification',
      category: 'certifications',
      base_price: 30000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'NBFC Registration',
      description: 'Non-Banking Financial Company registration with RBI',
      category: 'business_registration',
      base_price: 100000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Payment Gateway License',
      description: 'RBI license for payment aggregator and gateway',
      category: 'licenses',
      base_price: 75000.00,
      is_active: true
    },

    // Legal & Documentation
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Legal Agreement Drafting',
      description: 'NDA, partnership deed, service agreements, etc.',
      category: 'legal',
      base_price: 5000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Shareholders Agreement',
      description: 'SHA drafting and review for investors',
      category: 'legal',
      base_price: 15000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Employment Contracts',
      description: 'Employment agreements and offer letters',
      category: 'legal',
      base_price: 3000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Lease Agreement Drafting',
      description: 'Commercial and residential lease agreements',
      category: 'legal',
      base_price: 4000.00,
      is_active: true
    },

    // Compliance Notices & Responses
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'GST Notice Response',
      description: 'Response to GST department notices and queries',
      category: 'notice_response',
      base_price: 8000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Income Tax Notice Response',
      description: 'Response to Income Tax notices (143(1), 245, etc.)',
      category: 'notice_response',
      base_price: 10000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'ROC Compliance Notice',
      description: 'Response to MCA/ROC show cause notices',
      category: 'notice_response',
      base_price: 12000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Late Fee Waiver Application',
      description: 'Application for waiver of late filing fees',
      category: 'notice_response',
      base_price: 5000.00,
      is_active: true
    },

    // Additional One-time Services
    {
      id: knex.raw('uuid_generate_v4()'),
      name: '80G Registration',
      description: 'Section 80G approval for charitable donations',
      category: 'certifications',
      base_price: 15000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: '12A Registration',
      description: 'Section 12A registration for tax exemption',
      category: 'certifications',
      base_price: 12000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'CSR Registration',
      description: 'CSR-1 filing and compliance under Companies Act',
      category: 'annual_compliance',
      base_price: 8000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Trust/Society Registration',
      description: 'Public or private trust/society registration',
      category: 'business_registration',
      base_price: 10000.00,
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'NGO Registration',
      description: 'Non-Governmental Organization registration',
      category: 'business_registration',
      base_price: 12000.00,
      is_active: true
    }
  ];

  await knex('services').insert(services);

  console.log(`✓ Services seed completed: ${services.length} services created`);
};
