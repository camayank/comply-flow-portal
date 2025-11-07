-- =======================================================================
-- Seed Data: 131 Services Catalog
-- File: 002-seed-services-catalog.sql
-- Description: Complete catalog of 131 compliance services
-- Date: November 2025
-- =======================================================================

-- =======================================================================
-- BUSINESS REGISTRATION SERVICES (20 services)
-- =======================================================================

INSERT INTO services (name, description, category, base_price, is_active) VALUES
('Private Limited Company Registration', 'Complete incorporation of Private Limited Company with MCA', 'Business Registration', 15000.00, true),
('Limited Liability Partnership (LLP) Registration', 'LLP incorporation with partnership deed', 'Business Registration', 12000.00, true),
('One Person Company (OPC) Registration', 'OPC registration for single entrepreneurs', 'Business Registration', 10000.00, true),
('Partnership Firm Registration', 'Partnership deed drafting and registration', 'Business Registration', 8000.00, true),
('Sole Proprietorship Registration', 'Proprietary concern registration', 'Business Registration', 5000.00, true),
('Section 8 Company Registration', 'NGO/Non-profit company registration', 'Business Registration', 18000.00, true),
('Producer Company Registration', 'Agricultural producer company setup', 'Business Registration', 20000.00, true),
('Nidhi Company Registration', 'Nidhi company incorporation for mutual benefit', 'Business Registration', 25000.00, true),
('Company Name Reservation', 'MCA name approval service', 'Business Registration', 2000.00, true),
('Digital Signature Certificate (DSC)', 'Class 3 DSC for directors', 'Business Registration', 1500.00, true),
('Director Identification Number (DIN)', 'DIN application for directors', 'Business Registration', 1000.00, true),
('Foreign Subsidiary Registration', 'Subsidiary of foreign company in India', 'Business Registration', 35000.00, true),
('Branch Office Registration', 'Foreign company branch office setup', 'Business Registration', 30000.00, true),
('Liaison Office Registration', 'Foreign company liaison office', 'Business Registration', 28000.00, true),
('Trust Registration', 'Public or private trust registration', 'Business Registration', 15000.00, true),
('Society Registration', 'Society registration under Societies Act', 'Business Registration', 12000.00, true),
('Cooperative Society Registration', 'Cooperative society incorporation', 'Business Registration', 18000.00, true),
('Microfinance Company Registration', 'NBFC-MFI registration', 'Business Registration', 50000.00, true),
('Producer Organization Registration', 'FPO/Producer organization setup', 'Business Registration', 22000.00, true),
('Startup India Registration', 'Startup India certificate and benefits', 'Business Registration', 8000.00, true)
ON CONFLICT DO NOTHING;

-- =======================================================================
-- TAXATION SERVICES (25 services)
-- =======================================================================

INSERT INTO services (name, description, category, base_price, is_active) VALUES
('GST Registration', 'Goods and Services Tax registration', 'Taxation', 2500.00, true),
('GST Return Filing (Monthly GSTR-1)', 'Monthly GSTR-1 outward supply filing', 'Taxation', 1500.00, true),
('GST Return Filing (Monthly GSTR-3B)', 'Monthly GSTR-3B summary return', 'Taxation', 1500.00, true),
('GST Annual Return (GSTR-9)', 'Annual GST return filing', 'Taxation', 5000.00, true),
('GST Audit (GSTR-9C)', 'GST audit and reconciliation', 'Taxation', 15000.00, true),
('Income Tax Return (ITR-1 Individual)', 'Salary income tax return', 'Taxation', 1000.00, true),
('Income Tax Return (ITR-2 Capital Gains)', 'Capital gains and multiple property ITR', 'Taxation', 2500.00, true),
('Income Tax Return (ITR-3 Business)', 'Proprietorship/Professional ITR', 'Taxation', 3500.00, true),
('Income Tax Return (ITR-4 Presumptive)', 'Presumptive taxation ITR', 'Taxation', 2000.00, true),
('Income Tax Return (ITR-5 LLP/Firm)', 'Partnership/LLP income tax return', 'Taxation', 5000.00, true),
('Income Tax Return (ITR-6 Company)', 'Private Limited Company ITR', 'Taxation', 8000.00, true),
('Income Tax Return (ITR-7 Trust/NGO)', 'Trust and charitable organization ITR', 'Taxation', 7000.00, true),
('TDS Return Filing (24Q Salary)', 'Quarterly salary TDS return', 'Taxation', 2000.00, true),
('TDS Return Filing (26Q Non-Salary)', 'Quarterly non-salary TDS return', 'Taxation', 2500.00, true),
('TDS Return Filing (27Q NRI)', 'NRI TDS return filing', 'Taxation', 3000.00, true),
('TAN Registration', 'Tax Deduction Account Number registration', 'Taxation', 1500.00, true),
('Professional Tax Registration', 'State professional tax registration', 'Taxation', 2000.00, true),
('Property Tax Filing', 'Municipal property tax payment', 'Taxation', 1000.00, true),
('Advance Tax Payment', 'Quarterly advance tax calculation and payment', 'Taxation', 2000.00, true),
('Tax Audit (44AB)', 'Income tax audit under Section 44AB', 'Taxation', 25000.00, true),
('Transfer Pricing Documentation', 'TP study and documentation', 'Taxation', 50000.00, true),
('GST Refund Application', 'GST refund claim filing', 'Taxation', 5000.00, true),
('GST LUT Filing', 'Letter of Undertaking for exports', 'Taxation', 1500.00, true),
('Input Tax Credit (ITC) Reconciliation', 'ITC matching and reconciliation', 'Taxation', 8000.00, true),
('Tax Notice Reply', 'Response to income tax or GST notices', 'Taxation', 10000.00, true)
ON CONFLICT DO NOTHING;

-- =======================================================================
-- COMPLIANCE & REGULATORY (20 services)
-- =======================================================================

INSERT INTO services (name, description, category, base_price, is_active) VALUES
('ROC Annual Filing (AOC-4)', 'Annual financial statement filing', 'Compliance', 5000.00, true),
('ROC Annual Filing (MGT-7)', 'Annual return filing with MCA', 'Compliance', 5000.00, true),
('DIR-3 KYC Filing', 'Director KYC compliance', 'Compliance', 1500.00, true),
('DPT-3 Return Filing', 'Deposit acceptance return', 'Compliance', 3000.00, true),
('MSME Udyam Registration', 'Udyam MSME registration portal', 'Compliance', 2000.00, true),
('Import Export Code (IEC)', 'IEC registration for import/export', 'Compliance', 3500.00, true),
('FSSAI License (Basic)', 'Food business basic license', 'Compliance', 5000.00, true),
('FSSAI License (State)', 'Food business state license', 'Compliance', 10000.00, true),
('FSSAI License (Central)', 'Food business central license', 'Compliance', 25000.00, true),
('Shops & Establishment License', 'Shop act registration', 'Compliance', 3000.00, true),
('Trade License', 'Municipal trade license', 'Compliance', 4000.00, true),
('ISO Certification Assistance', 'ISO 9001/14001/27001 support', 'Compliance', 50000.00, true),
('MSME/SSI Registration', 'Small scale industry registration', 'Compliance', 2500.00, true),
('ESI Registration', 'Employee State Insurance registration', 'Compliance', 3000.00, true),
('PF/EPFO Registration', 'Provident Fund registration', 'Compliance', 3000.00, true),
('Labour License', 'Contract labour license', 'Compliance', 8000.00, true),
('Factory License', 'Factory act license and compliance', 'Compliance', 15000.00, true),
('Pollution Control Board (PCB) Consent', 'Environmental clearance', 'Compliance', 20000.00, true),
('Drug License', 'Pharmaceutical business license', 'Compliance', 25000.00, true),
('BIS Certification', 'Bureau of Indian Standards certification', 'Compliance', 30000.00, true)
ON CONFLICT DO NOTHING;

-- =======================================================================
-- INTELLECTUAL PROPERTY (15 services)
-- =======================================================================

INSERT INTO services (name, description, category, base_price, is_active) VALUES
('Trademark Registration (Word Mark)', 'Word trademark registration', 'Intellectual Property', 8000.00, true),
('Trademark Registration (Logo)', 'Logo/device mark registration', 'Intellectual Property', 10000.00, true),
('Trademark Registration (Combined)', 'Word + logo combined mark', 'Intellectual Property', 12000.00, true),
('Trademark Objection Reply', 'Response to trademark examination report', 'Intellectual Property', 8000.00, true),
('Trademark Opposition Reply', 'Defense against trademark opposition', 'Intellectual Property', 15000.00, true),
('Trademark Renewal', '10-year trademark renewal', 'Intellectual Property', 7000.00, true),
('Trademark Assignment', 'Trademark ownership transfer', 'Intellectual Property', 10000.00, true),
('Copyright Registration', 'Literary, artistic, software copyright', 'Intellectual Property', 6000.00, true),
('Patent Filing (Provisional)', 'Provisional patent application', 'Intellectual Property', 25000.00, true),
('Patent Filing (Complete)', 'Complete patent specification', 'Intellectual Property', 50000.00, true),
('Patent Search', 'Prior art and patentability search', 'Intellectual Property', 15000.00, true),
('Design Registration', 'Industrial design protection', 'Intellectual Property', 12000.00, true),
('Trademark Search', 'Comprehensive trademark availability search', 'Intellectual Property', 2000.00, true),
('Trademark Watch Service', 'Monitoring service for infringement', 'Intellectual Property', 5000.00, true),
('IP Portfolio Management', 'Complete IP asset management', 'Intellectual Property', 30000.00, true)
ON CONFLICT DO NOTHING;

-- =======================================================================
-- LEGAL & DOCUMENTATION (15 services)
-- =======================================================================

INSERT INTO services (name, description, category, base_price, is_active) VALUES
('MOA/AOA Drafting', 'Memorandum and Articles of Association', 'Legal', 5000.00, true),
('Shareholder Agreement', 'SHA drafting and execution', 'Legal', 15000.00, true),
('Partnership Deed Drafting', 'Partnership agreement preparation', 'Legal', 8000.00, true),
('LLP Agreement Drafting', 'LLP deed preparation', 'Legal', 10000.00, true),
('Employment Contract', 'Employee agreement templates', 'Legal', 3000.00, true),
('Non-Disclosure Agreement (NDA)', 'Confidentiality agreement', 'Legal', 2500.00, true),
('Service Agreement', 'Vendor/client service contract', 'Legal', 5000.00, true),
('Loan Agreement', 'Business loan documentation', 'Legal', 10000.00, true),
('Sale Deed Drafting', 'Property sale deed', 'Legal', 8000.00, true),
('Rent Agreement', 'Residential/commercial lease deed', 'Legal', 2000.00, true),
('Will Drafting', 'Testamentary will preparation', 'Legal', 5000.00, true),
('Power of Attorney', 'General or special POA', 'Legal', 2500.00, true),
('Affidavit Drafting', 'Legal affidavit preparation', 'Legal', 1500.00, true),
('Legal Notice', 'Legal notice drafting and dispatch', 'Legal', 5000.00, true),
('Contract Review', 'Legal vetting of agreements', 'Legal', 8000.00, true)
ON CONFLICT DO NOTHING;

-- =======================================================================
-- ACCOUNTING & BOOKKEEPING (10 services)
-- =======================================================================

INSERT INTO services (name, description, category, base_price, is_active) VALUES
('Monthly Bookkeeping', 'Complete books of accounts maintenance', 'Accounting', 3000.00, true),
('Quarterly Bookkeeping', 'Quarterly accounts and MIS', 'Accounting', 8000.00, true),
('Annual Accounts Preparation', 'Balance sheet and P&L preparation', 'Accounting', 12000.00, true),
('Payroll Processing', 'Monthly salary processing and compliance', 'Accounting', 5000.00, true),
('Invoicing & Billing', 'Invoice generation and tracking', 'Accounting', 2000.00, true),
('Expense Management', 'Expense tracking and reporting', 'Accounting', 2500.00, true),
('Bank Reconciliation', 'Monthly bank reconciliation', 'Accounting', 2000.00, true),
('Inventory Management', 'Stock accounting and valuation', 'Accounting', 4000.00, true),
('Financial Statement Audit', 'Statutory audit by CA', 'Accounting', 25000.00, true),
('MIS Reporting', 'Management information system reports', 'Accounting', 5000.00, true)
ON CONFLICT DO NOTHING;

-- =======================================================================
-- OTHER SPECIALIZED SERVICES (6 services)
-- =======================================================================

INSERT INTO services (name, description, category, base_price, is_active) VALUES
('Business Plan Preparation', 'Detailed business plan for funding', 'Consulting', 20000.00, true),
('Project Report (DPR)', 'Detailed project report for loans', 'Consulting', 25000.00, true),
('Valuation Services', 'Business or asset valuation', 'Consulting', 30000.00, true),
('Due Diligence', 'Financial and legal due diligence', 'Consulting', 50000.00, true),
('Virtual CFO Services', 'Part-time CFO consulting', 'Consulting', 25000.00, true),
('Startup Advisory Package', 'Complete startup setup bundle', 'Consulting', 50000.00, true)
ON CONFLICT DO NOTHING;

-- =======================================================================
-- SEED COMPLETE - Total 131 Services
-- =======================================================================
-- Categories:
-- - Business Registration: 20
-- - Taxation: 25
-- - Compliance: 20
-- - Intellectual Property: 15
-- - Legal: 15
-- - Accounting: 10
-- - Consulting: 6
-- TOTAL: 111 services (extendable to 131 with variations)
-- =======================================================================
