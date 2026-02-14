/**
 * Service Catalog Seed Script
 *
 * Seeds the services table with 96 comprehensive Indian compliance services.
 * Uses the existing database connection and SERVICE_CATALOG from server.
 *
 * Run: npx tsx scripts/seed-service-catalog.ts
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import { services, servicesCatalog, serviceDefinitions } from "../shared/schema";

const DATABASE_URL = process.env.DATABASE_URL || "postgres://rakeshanita@localhost:5432/complyflow_dev";

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle({ client: pool });

// ============================================
// SERVICE CATEGORIES
// ============================================

type ServiceCategory =
  | "incorporation"
  | "gst"
  | "income_tax"
  | "tds"
  | "roc"
  | "fssai"
  | "msme"
  | "iec"
  | "trademark"
  | "labour"
  | "environmental"
  | "accounting"
  | "audit"
  | "advisory"
  | "annual_compliance"
  | "legal";

type Periodicity = "ONE_TIME" | "MONTHLY" | "QUARTERLY" | "ANNUAL" | "AS_NEEDED";
type ServiceType = "INCORPORATION" | "COMPLIANCE" | "TAX" | "ADVISORY" | "AUDIT";

interface ServiceData {
  serviceId: string;
  name: string;
  type: ServiceType;
  category: ServiceCategory;
  price: number;
  deadline: string;
  description: string;
  periodicity: Periodicity;
  requiredDocs: string[];
  slaHours: number;
}

// ============================================
// 96+ INDIAN COMPLIANCE SERVICES
// ============================================

const SERVICES: ServiceData[] = [
  // ========================================
  // INCORPORATION & SETUP (15 services)
  // ========================================
  {
    serviceId: "INC001",
    name: "Private Limited Company Registration",
    type: "INCORPORATION",
    category: "incorporation",
    price: 14999,
    deadline: "15 days",
    description: "Complete Pvt Ltd company incorporation including DSC, DIN, Name Approval, MoA/AoA drafting, and Certificate of Incorporation",
    periodicity: "ONE_TIME",
    requiredDocs: ["PAN Card", "Aadhaar Card", "Address Proof", "Passport Photo", "Utility Bill"],
    slaHours: 360
  },
  {
    serviceId: "INC002",
    name: "LLP Registration",
    type: "INCORPORATION",
    category: "incorporation",
    price: 9999,
    deadline: "12 days",
    description: "Limited Liability Partnership registration including DPIN, Name Approval, LLP Agreement, and Certificate",
    periodicity: "ONE_TIME",
    requiredDocs: ["PAN Card", "Aadhaar Card", "Address Proof", "Passport Photo"],
    slaHours: 288
  },
  {
    serviceId: "INC003",
    name: "One Person Company (OPC) Registration",
    type: "INCORPORATION",
    category: "incorporation",
    price: 11999,
    deadline: "12 days",
    description: "OPC registration for single entrepreneurs with nominee director appointment",
    periodicity: "ONE_TIME",
    requiredDocs: ["PAN Card", "Aadhaar Card", "Address Proof", "Nominee Consent"],
    slaHours: 288
  },
  {
    serviceId: "INC004",
    name: "Partnership Firm Registration",
    type: "INCORPORATION",
    category: "incorporation",
    price: 5999,
    deadline: "7 days",
    description: "Partnership deed drafting and firm registration with Registrar of Firms",
    periodicity: "ONE_TIME",
    requiredDocs: ["PAN Card", "Aadhaar Card", "Address Proof"],
    slaHours: 168
  },
  {
    serviceId: "INC005",
    name: "Sole Proprietorship Registration",
    type: "INCORPORATION",
    category: "incorporation",
    price: 2999,
    deadline: "5 days",
    description: "Sole proprietorship setup with GST, Shop Act, and trade license assistance",
    periodicity: "ONE_TIME",
    requiredDocs: ["PAN Card", "Aadhaar Card", "Address Proof"],
    slaHours: 120
  },
  {
    serviceId: "INC006",
    name: "Section 8 Company (NGO)",
    type: "INCORPORATION",
    category: "incorporation",
    price: 24999,
    deadline: "45 days",
    description: "Non-profit Section 8 company registration with MCA license",
    periodicity: "ONE_TIME",
    requiredDocs: ["PAN Card", "Aadhaar Card", "MOA/AOA Draft", "Projected Financials"],
    slaHours: 1080
  },
  {
    serviceId: "INC007",
    name: "Producer Company Registration",
    type: "INCORPORATION",
    category: "incorporation",
    price: 19999,
    deadline: "30 days",
    description: "Farmer Producer Company (FPC) registration under Companies Act",
    periodicity: "ONE_TIME",
    requiredDocs: ["PAN Card", "Aadhaar Card", "Land Records", "Member List"],
    slaHours: 720
  },
  {
    serviceId: "INC008",
    name: "Digital Signature Certificate (DSC)",
    type: "INCORPORATION",
    category: "incorporation",
    price: 1499,
    deadline: "2 days",
    description: "Class 3 Digital Signature Certificate for company filings",
    periodicity: "ONE_TIME",
    requiredDocs: ["PAN Card", "Aadhaar Card", "Passport Photo"],
    slaHours: 48
  },
  {
    serviceId: "INC009",
    name: "Director Identification Number (DIN)",
    type: "INCORPORATION",
    category: "incorporation",
    price: 999,
    deadline: "3 days",
    description: "DIN application for new directors",
    periodicity: "ONE_TIME",
    requiredDocs: ["PAN Card", "Address Proof", "Passport Photo"],
    slaHours: 72
  },
  {
    serviceId: "INC010",
    name: "Company Name Change",
    type: "INCORPORATION",
    category: "incorporation",
    price: 7999,
    deadline: "15 days",
    description: "MCA filing for company name change with new COI",
    periodicity: "ONE_TIME",
    requiredDocs: ["Board Resolution", "Shareholder Resolution", "Existing COI"],
    slaHours: 360
  },
  {
    serviceId: "INC011",
    name: "Registered Office Change",
    type: "INCORPORATION",
    category: "incorporation",
    price: 4999,
    deadline: "10 days",
    description: "Change of registered office within same state/different state",
    periodicity: "ONE_TIME",
    requiredDocs: ["Board Resolution", "Utility Bill", "NOC from Owner"],
    slaHours: 240
  },
  {
    serviceId: "INC012",
    name: "Director Appointment/Resignation",
    type: "INCORPORATION",
    category: "incorporation",
    price: 3999,
    deadline: "7 days",
    description: "MCA filing for director appointment or resignation (DIR-12)",
    periodicity: "ONE_TIME",
    requiredDocs: ["Board Resolution", "Director Consent", "DIN"],
    slaHours: 168
  },
  {
    serviceId: "INC013",
    name: "Share Transfer",
    type: "INCORPORATION",
    category: "incorporation",
    price: 4999,
    deadline: "7 days",
    description: "Share transfer documentation and filing with ROC",
    periodicity: "ONE_TIME",
    requiredDocs: ["Share Transfer Deed", "Board Resolution", "Share Certificate"],
    slaHours: 168
  },
  {
    serviceId: "INC014",
    name: "Authorized Capital Increase",
    type: "INCORPORATION",
    category: "incorporation",
    price: 5999,
    deadline: "10 days",
    description: "Increase authorized share capital with MCA filing",
    periodicity: "ONE_TIME",
    requiredDocs: ["Board Resolution", "Shareholder Resolution", "MGT-14"],
    slaHours: 240
  },
  {
    serviceId: "INC015",
    name: "Company Closure/Strike Off",
    type: "INCORPORATION",
    category: "incorporation",
    price: 14999,
    deadline: "90 days",
    description: "Voluntary company closure/strike off filing (STK-2)",
    periodicity: "ONE_TIME",
    requiredDocs: ["Board Resolution", "Shareholder Resolution", "ITR", "GST Closure"],
    slaHours: 2160
  },

  // ========================================
  // GST COMPLIANCE (12 services)
  // ========================================
  {
    serviceId: "GST001",
    name: "GST Registration",
    type: "COMPLIANCE",
    category: "gst",
    price: 2499,
    deadline: "7 days",
    description: "New GST registration for businesses crossing ₹40L threshold",
    periodicity: "ONE_TIME",
    requiredDocs: ["PAN Card", "Aadhaar Card", "Bank Statement", "Address Proof"],
    slaHours: 168
  },
  {
    serviceId: "GST002",
    name: "GSTR-1 Filing (Monthly)",
    type: "COMPLIANCE",
    category: "gst",
    price: 999,
    deadline: "11th of next month",
    description: "Monthly outward supplies return filing",
    periodicity: "MONTHLY",
    requiredDocs: ["Sales Register", "E-way Bills", "Credit Notes"],
    slaHours: 24
  },
  {
    serviceId: "GST003",
    name: "GSTR-3B Filing (Monthly)",
    type: "COMPLIANCE",
    category: "gst",
    price: 999,
    deadline: "20th of next month",
    description: "Monthly summary return with tax payment",
    periodicity: "MONTHLY",
    requiredDocs: ["GSTR-1", "Purchase Register", "Input Tax Details"],
    slaHours: 24
  },
  {
    serviceId: "GST004",
    name: "GSTR-1 Filing (Quarterly - QRMP)",
    type: "COMPLIANCE",
    category: "gst",
    price: 1999,
    deadline: "13th of next quarter",
    description: "Quarterly return for businesses under ₹5Cr turnover",
    periodicity: "QUARTERLY",
    requiredDocs: ["Sales Register", "E-way Bills", "Credit Notes"],
    slaHours: 48
  },
  {
    serviceId: "GST005",
    name: "GSTR-9 Annual Return",
    type: "COMPLIANCE",
    category: "gst",
    price: 4999,
    deadline: "December 31st",
    description: "Annual GST return consolidating all monthly filings",
    periodicity: "ANNUAL",
    requiredDocs: ["All GSTR-1", "All GSTR-3B", "Books of Accounts"],
    slaHours: 72
  },
  {
    serviceId: "GST006",
    name: "GSTR-9C Reconciliation Statement",
    type: "COMPLIANCE",
    category: "gst",
    price: 7999,
    deadline: "December 31st",
    description: "GST audit reconciliation for turnover above ₹5Cr",
    periodicity: "ANNUAL",
    requiredDocs: ["Audited Financials", "GSTR-9", "Tax Reconciliation"],
    slaHours: 120
  },
  {
    serviceId: "GST007",
    name: "GST Amendment",
    type: "COMPLIANCE",
    category: "gst",
    price: 1499,
    deadline: "15 days",
    description: "Amendment in GST registration details (core/non-core)",
    periodicity: "AS_NEEDED",
    requiredDocs: ["Supporting Documents", "Board Resolution"],
    slaHours: 72
  },
  {
    serviceId: "GST008",
    name: "GST Cancellation",
    type: "COMPLIANCE",
    category: "gst",
    price: 1999,
    deadline: "30 days",
    description: "Voluntary GST registration cancellation",
    periodicity: "ONE_TIME",
    requiredDocs: ["Final GSTR-10", "Stock Statement", "Board Resolution"],
    slaHours: 168
  },
  {
    serviceId: "GST009",
    name: "GST Refund Application",
    type: "COMPLIANCE",
    category: "gst",
    price: 3999,
    deadline: "2 years from date",
    description: "ITC refund, export refund, or excess payment refund",
    periodicity: "AS_NEEDED",
    requiredDocs: ["Refund Statement", "Export Documents", "Bank Realization"],
    slaHours: 96
  },
  {
    serviceId: "GST010",
    name: "E-Way Bill Management",
    type: "COMPLIANCE",
    category: "gst",
    price: 499,
    deadline: "Before goods movement",
    description: "E-Way bill generation for goods movement above ₹50,000",
    periodicity: "AS_NEEDED",
    requiredDocs: ["Invoice", "Transporter Details", "Vehicle Number"],
    slaHours: 4
  },
  {
    serviceId: "GST011",
    name: "GST LUT Filing",
    type: "COMPLIANCE",
    category: "gst",
    price: 1499,
    deadline: "March 31st annually",
    description: "Letter of Undertaking for exporters to claim zero-rated supplies",
    periodicity: "ANNUAL",
    requiredDocs: ["Export Details", "GST Certificate", "Bank Account"],
    slaHours: 24
  },
  {
    serviceId: "GST012",
    name: "ITC-04 Filing",
    type: "COMPLIANCE",
    category: "gst",
    price: 1999,
    deadline: "25th of next month",
    description: "Job work return for goods sent to/received from job worker",
    periodicity: "QUARTERLY",
    requiredDocs: ["Challan Details", "Job Worker GSTIN", "Stock Register"],
    slaHours: 48
  },

  // ========================================
  // INCOME TAX (10 services)
  // ========================================
  {
    serviceId: "ITR001",
    name: "ITR-1 Filing (Salaried)",
    type: "TAX",
    category: "income_tax",
    price: 999,
    deadline: "July 31st",
    description: "Income tax return for salaried individuals",
    periodicity: "ANNUAL",
    requiredDocs: ["Form 16", "Bank Statement", "Investment Proofs"],
    slaHours: 24
  },
  {
    serviceId: "ITR002",
    name: "ITR-2 Filing (Capital Gains)",
    type: "TAX",
    category: "income_tax",
    price: 2499,
    deadline: "July 31st",
    description: "ITR for individuals with capital gains from stocks/property",
    periodicity: "ANNUAL",
    requiredDocs: ["Form 16", "Capital Gain Statement", "Property Documents"],
    slaHours: 48
  },
  {
    serviceId: "ITR003",
    name: "ITR-3 Filing (Business Income)",
    type: "TAX",
    category: "income_tax",
    price: 3999,
    deadline: "July 31st",
    description: "ITR for individuals/HUFs with business income",
    periodicity: "ANNUAL",
    requiredDocs: ["P&L Statement", "Balance Sheet", "Bank Statement"],
    slaHours: 72
  },
  {
    serviceId: "ITR004",
    name: "ITR-4 Filing (Presumptive)",
    type: "TAX",
    category: "income_tax",
    price: 1999,
    deadline: "July 31st",
    description: "Presumptive taxation return for small businesses",
    periodicity: "ANNUAL",
    requiredDocs: ["Sales Summary", "Bank Statement", "GST Returns"],
    slaHours: 24
  },
  {
    serviceId: "ITR005",
    name: "ITR-5 Filing (LLP/AOP)",
    type: "TAX",
    category: "income_tax",
    price: 4999,
    deadline: "July 31st",
    description: "Income tax return for LLPs, AOPs, and BOIs",
    periodicity: "ANNUAL",
    requiredDocs: ["Audited Financials", "Partner Details", "Tax Computation"],
    slaHours: 72
  },
  {
    serviceId: "ITR006",
    name: "ITR-6 Filing (Companies)",
    type: "TAX",
    category: "income_tax",
    price: 7999,
    deadline: "October 31st",
    description: "Corporate income tax return for private/public companies",
    periodicity: "ANNUAL",
    requiredDocs: ["Audited Financials", "Tax Audit Report", "MAT Computation"],
    slaHours: 120
  },
  {
    serviceId: "ITR007",
    name: "Advance Tax Calculation & Payment",
    type: "TAX",
    category: "income_tax",
    price: 1999,
    deadline: "15th of due month",
    description: "Quarterly advance tax computation and challan generation",
    periodicity: "QUARTERLY",
    requiredDocs: ["Estimated Income", "Previous Year Data", "Tax Projections"],
    slaHours: 24
  },
  {
    serviceId: "ITR008",
    name: "Income Tax Notice Response",
    type: "TAX",
    category: "income_tax",
    price: 4999,
    deadline: "As per notice",
    description: "Response to IT scrutiny, defective return, or demand notices",
    periodicity: "AS_NEEDED",
    requiredDocs: ["IT Notice", "Supporting Documents", "Previous Returns"],
    slaHours: 72
  },
  {
    serviceId: "ITR009",
    name: "Revised Return Filing",
    type: "TAX",
    category: "income_tax",
    price: 1999,
    deadline: "December 31st",
    description: "Revised ITR filing to correct errors in original return",
    periodicity: "AS_NEEDED",
    requiredDocs: ["Original Return", "Correction Details", "Supporting Docs"],
    slaHours: 24
  },
  {
    serviceId: "ITR010",
    name: "Belated Return Filing",
    type: "TAX",
    category: "income_tax",
    price: 2999,
    deadline: "December 31st",
    description: "ITR filing after due date with applicable penalties",
    periodicity: "AS_NEEDED",
    requiredDocs: ["Income Documents", "Bank Statement", "Investment Proofs"],
    slaHours: 48
  },

  // ========================================
  // TDS COMPLIANCE (8 services)
  // ========================================
  {
    serviceId: "TDS001",
    name: "TAN Application",
    type: "TAX",
    category: "tds",
    price: 999,
    deadline: "7 days",
    description: "Tax Deduction Account Number application for businesses",
    periodicity: "ONE_TIME",
    requiredDocs: ["PAN Card", "Address Proof", "ID Proof"],
    slaHours: 72
  },
  {
    serviceId: "TDS002",
    name: "TDS Return - 24Q (Quarterly)",
    type: "TAX",
    category: "tds",
    price: 1999,
    deadline: "31st of next month",
    description: "TDS return for salary payments",
    periodicity: "QUARTERLY",
    requiredDocs: ["Salary Register", "Form 16 Data", "PAN of Employees"],
    slaHours: 48
  },
  {
    serviceId: "TDS003",
    name: "TDS Return - 26Q (Quarterly)",
    type: "TAX",
    category: "tds",
    price: 1999,
    deadline: "31st of next month",
    description: "TDS return for non-salary payments (rent, professional fees)",
    periodicity: "QUARTERLY",
    requiredDocs: ["Payment Register", "Vendor PANs", "TDS Certificates"],
    slaHours: 48
  },
  {
    serviceId: "TDS004",
    name: "TDS Return - 27Q (NRI)",
    type: "TAX",
    category: "tds",
    price: 2999,
    deadline: "31st of next month",
    description: "TDS return for payments to non-residents",
    periodicity: "QUARTERLY",
    requiredDocs: ["NRI Payment Details", "Form 15CA/15CB", "DTAA Benefits"],
    slaHours: 72
  },
  {
    serviceId: "TDS005",
    name: "Form 16 Generation",
    type: "TAX",
    category: "tds",
    price: 299,
    deadline: "June 15th",
    description: "Annual TDS certificate generation for employees",
    periodicity: "ANNUAL",
    requiredDocs: ["24Q Returns", "Salary Details", "Employee PAN"],
    slaHours: 24
  },
  {
    serviceId: "TDS006",
    name: "Form 16A Generation",
    type: "TAX",
    category: "tds",
    price: 199,
    deadline: "15 days from filing",
    description: "TDS certificate for non-salary deductions",
    periodicity: "QUARTERLY",
    requiredDocs: ["26Q Returns", "Deductee Details"],
    slaHours: 24
  },
  {
    serviceId: "TDS007",
    name: "Lower TDS Certificate (13/15G/15H)",
    type: "TAX",
    category: "tds",
    price: 1499,
    deadline: "Before payment",
    description: "Application for lower/nil TDS deduction certificate",
    periodicity: "ANNUAL",
    requiredDocs: ["ITR", "Estimated Income", "Form 13 Application"],
    slaHours: 72
  },
  {
    serviceId: "TDS008",
    name: "TDS Correction Statement",
    type: "TAX",
    category: "tds",
    price: 999,
    deadline: "As needed",
    description: "Correction in filed TDS returns for errors",
    periodicity: "AS_NEEDED",
    requiredDocs: ["Original Return", "Correction Details", "Supporting Docs"],
    slaHours: 24
  },

  // ========================================
  // ROC FILINGS (10 services)
  // ========================================
  {
    serviceId: "ROC001",
    name: "AOC-4 (Financial Statements)",
    type: "COMPLIANCE",
    category: "roc",
    price: 2999,
    deadline: "October 30th",
    description: "Annual financial statements filing with MCA",
    periodicity: "ANNUAL",
    requiredDocs: ["Audited Financials", "Director Report", "Auditor Report"],
    slaHours: 72
  },
  {
    serviceId: "ROC002",
    name: "MGT-7 (Annual Return)",
    type: "COMPLIANCE",
    category: "roc",
    price: 2999,
    deadline: "November 29th",
    description: "Annual return filing with shareholder and director details",
    periodicity: "ANNUAL",
    requiredDocs: ["Shareholder List", "Director Details", "Minutes Book"],
    slaHours: 72
  },
  {
    serviceId: "ROC003",
    name: "ADT-1 (Auditor Appointment)",
    type: "COMPLIANCE",
    category: "roc",
    price: 1999,
    deadline: "15 days from AGM",
    description: "Filing for statutory auditor appointment",
    periodicity: "ANNUAL",
    requiredDocs: ["Auditor Consent", "Board Resolution", "AGM Minutes"],
    slaHours: 48
  },
  {
    serviceId: "ROC004",
    name: "DIR-3 KYC",
    type: "COMPLIANCE",
    category: "roc",
    price: 499,
    deadline: "September 30th",
    description: "Annual KYC for all directors",
    periodicity: "ANNUAL",
    requiredDocs: ["Aadhaar", "PAN", "Mobile OTP", "Email OTP"],
    slaHours: 24
  },
  {
    serviceId: "ROC005",
    name: "DPT-3 (Deposit Return)",
    type: "COMPLIANCE",
    category: "roc",
    price: 1999,
    deadline: "June 30th",
    description: "Return of deposits/exempted deposits",
    periodicity: "ANNUAL",
    requiredDocs: ["Deposit Details", "Exempted Deposit List", "Bank Statements"],
    slaHours: 48
  },
  {
    serviceId: "ROC006",
    name: "MSME-1 (Half-yearly Return)",
    type: "COMPLIANCE",
    category: "roc",
    price: 1499,
    deadline: "April 30th / Oct 31st",
    description: "Return for outstanding payments to MSMEs",
    periodicity: "ANNUAL",
    requiredDocs: ["MSME Vendor List", "Outstanding Payments", "Invoice Details"],
    slaHours: 48
  },
  {
    serviceId: "ROC007",
    name: "Form 11 (LLP Annual Return)",
    type: "COMPLIANCE",
    category: "roc",
    price: 2499,
    deadline: "May 30th",
    description: "LLP annual return filing",
    periodicity: "ANNUAL",
    requiredDocs: ["Partner Details", "Contribution Details", "LLP Agreement"],
    slaHours: 48
  },
  {
    serviceId: "ROC008",
    name: "Form 8 (LLP Statement of Account)",
    type: "COMPLIANCE",
    category: "roc",
    price: 2499,
    deadline: "October 30th",
    description: "LLP financial statement filing",
    periodicity: "ANNUAL",
    requiredDocs: ["Statement of Account", "Solvency Certificate"],
    slaHours: 48
  },
  {
    serviceId: "ROC009",
    name: "INC-20A (Business Commencement)",
    type: "COMPLIANCE",
    category: "roc",
    price: 1999,
    deadline: "180 days from incorporation",
    description: "Declaration for commencement of business",
    periodicity: "ONE_TIME",
    requiredDocs: ["Bank Statement", "Paid-up Capital Proof", "Director Declaration"],
    slaHours: 48
  },
  {
    serviceId: "ROC010",
    name: "BEN-2 (Beneficial Ownership)",
    type: "COMPLIANCE",
    category: "roc",
    price: 1999,
    deadline: "30 days from declaration",
    description: "Declaration of significant beneficial ownership",
    periodicity: "AS_NEEDED",
    requiredDocs: ["BEN-1 from SBO", "Holding Pattern", "Director Details"],
    slaHours: 48
  },

  // ========================================
  // FSSAI (Food Safety) (6 services)
  // ========================================
  {
    serviceId: "FSSAI001",
    name: "FSSAI Basic Registration",
    type: "COMPLIANCE",
    category: "fssai",
    price: 2999,
    deadline: "60 days",
    description: "Basic FSSAI registration for turnover up to ₹12 lakhs",
    periodicity: "ONE_TIME",
    requiredDocs: ["ID Proof", "Address Proof", "Food Category Details"],
    slaHours: 168
  },
  {
    serviceId: "FSSAI002",
    name: "FSSAI State License",
    type: "COMPLIANCE",
    category: "fssai",
    price: 7999,
    deadline: "60 days",
    description: "State license for turnover ₹12L to ₹20Cr",
    periodicity: "ONE_TIME",
    requiredDocs: ["Food Safety Plan", "Layout Plan", "Water Test Report"],
    slaHours: 360
  },
  {
    serviceId: "FSSAI003",
    name: "FSSAI Central License",
    type: "COMPLIANCE",
    category: "fssai",
    price: 14999,
    deadline: "60 days",
    description: "Central license for turnover above ₹20Cr or importers/exporters",
    periodicity: "ONE_TIME",
    requiredDocs: ["FSMS Plan", "Recall Plan", "Production Capacity Details"],
    slaHours: 720
  },
  {
    serviceId: "FSSAI004",
    name: "FSSAI License Renewal",
    type: "COMPLIANCE",
    category: "fssai",
    price: 2999,
    deadline: "30 days before expiry",
    description: "Renewal of existing FSSAI license",
    periodicity: "ANNUAL",
    requiredDocs: ["Existing License", "Updated Documents", "Fee Receipt"],
    slaHours: 168
  },
  {
    serviceId: "FSSAI005",
    name: "FSSAI License Modification",
    type: "COMPLIANCE",
    category: "fssai",
    price: 1999,
    deadline: "As needed",
    description: "Modification in existing FSSAI license details",
    periodicity: "AS_NEEDED",
    requiredDocs: ["Existing License", "Change Details", "Supporting Documents"],
    slaHours: 120
  },
  {
    serviceId: "FSSAI006",
    name: "FSSAI Annual Return",
    type: "COMPLIANCE",
    category: "fssai",
    price: 999,
    deadline: "May 31st",
    description: "Annual return filing for FSSAI license holders",
    periodicity: "ANNUAL",
    requiredDocs: ["Production Details", "Sales Data", "Compliance Declaration"],
    slaHours: 24
  },

  // ========================================
  // MSME & UDYAM (4 services)
  // ========================================
  {
    serviceId: "MSME001",
    name: "Udyam Registration",
    type: "COMPLIANCE",
    category: "msme",
    price: 999,
    deadline: "7 days",
    description: "MSME/Udyam registration for micro, small, medium enterprises",
    periodicity: "ONE_TIME",
    requiredDocs: ["Aadhaar", "PAN", "Bank Account", "Business Details"],
    slaHours: 48
  },
  {
    serviceId: "MSME002",
    name: "Udyam Registration Update",
    type: "COMPLIANCE",
    category: "msme",
    price: 499,
    deadline: "As needed",
    description: "Update Udyam registration with changed details",
    periodicity: "AS_NEEDED",
    requiredDocs: ["Udyam Number", "Updated Details", "Supporting Documents"],
    slaHours: 24
  },
  {
    serviceId: "MSME003",
    name: "NSIC Registration",
    type: "COMPLIANCE",
    category: "msme",
    price: 4999,
    deadline: "30 days",
    description: "National Small Industries Corporation registration",
    periodicity: "ONE_TIME",
    requiredDocs: ["Udyam Certificate", "Financial Statements", "Unit Photos"],
    slaHours: 240
  },
  {
    serviceId: "MSME004",
    name: "GeM Seller Registration",
    type: "COMPLIANCE",
    category: "msme",
    price: 2999,
    deadline: "15 days",
    description: "Government e-Marketplace seller registration",
    periodicity: "ONE_TIME",
    requiredDocs: ["GSTIN", "PAN", "Bank Account", "Product Catalog"],
    slaHours: 168
  },

  // ========================================
  // IMPORT/EXPORT (IEC) (5 services)
  // ========================================
  {
    serviceId: "IEC001",
    name: "IEC Code Registration",
    type: "COMPLIANCE",
    category: "iec",
    price: 3999,
    deadline: "7 days",
    description: "Import Export Code for international trade",
    periodicity: "ONE_TIME",
    requiredDocs: ["PAN", "Aadhaar", "Bank Certificate", "GST Certificate"],
    slaHours: 72
  },
  {
    serviceId: "IEC002",
    name: "IEC Modification",
    type: "COMPLIANCE",
    category: "iec",
    price: 1499,
    deadline: "7 days",
    description: "Modification in IEC details",
    periodicity: "AS_NEEDED",
    requiredDocs: ["Existing IEC", "Updated Details", "Supporting Documents"],
    slaHours: 48
  },
  {
    serviceId: "IEC003",
    name: "AD Code Registration",
    type: "COMPLIANCE",
    category: "iec",
    price: 999,
    deadline: "7 days",
    description: "Authorized Dealer code for foreign exchange transactions",
    periodicity: "ONE_TIME",
    requiredDocs: ["IEC", "Bank Account", "GSTIN"],
    slaHours: 48
  },
  {
    serviceId: "IEC004",
    name: "RCMC Registration",
    type: "COMPLIANCE",
    category: "iec",
    price: 4999,
    deadline: "15 days",
    description: "Registration Cum Membership Certificate from Export Promotion Council",
    periodicity: "ONE_TIME",
    requiredDocs: ["IEC", "Export Invoices", "Company Documents"],
    slaHours: 168
  },
  {
    serviceId: "IEC005",
    name: "Form 15CA/15CB",
    type: "COMPLIANCE",
    category: "iec",
    price: 2999,
    deadline: "Before remittance",
    description: "CA certificate for foreign remittances above ₹5 lakhs",
    periodicity: "AS_NEEDED",
    requiredDocs: ["Invoice", "Agreement", "DTAA Details", "PAN of Recipient"],
    slaHours: 48
  },

  // ========================================
  // TRADEMARK & IP (6 services)
  // ========================================
  {
    serviceId: "TM001",
    name: "Trademark Registration",
    type: "COMPLIANCE",
    category: "trademark",
    price: 7999,
    deadline: "6-12 months",
    description: "Trademark application filing and prosecution",
    periodicity: "ONE_TIME",
    requiredDocs: ["Logo/Wordmark", "Business Details", "ID Proof", "Authorization"],
    slaHours: 720
  },
  {
    serviceId: "TM002",
    name: "Trademark Search & Opinion",
    type: "ADVISORY",
    category: "trademark",
    price: 1999,
    deadline: "3 days",
    description: "Comprehensive trademark search with registrability opinion",
    periodicity: "ONE_TIME",
    requiredDocs: ["Proposed Mark", "Class Details"],
    slaHours: 72
  },
  {
    serviceId: "TM003",
    name: "Trademark Renewal",
    type: "COMPLIANCE",
    category: "trademark",
    price: 4999,
    deadline: "Before expiry",
    description: "Trademark renewal for next 10 years",
    periodicity: "AS_NEEDED",
    requiredDocs: ["Registration Certificate", "Authorization"],
    slaHours: 168
  },
  {
    serviceId: "TM004",
    name: "Trademark Opposition",
    type: "COMPLIANCE",
    category: "trademark",
    price: 14999,
    deadline: "4 months from publication",
    description: "Filing opposition against conflicting trademark",
    periodicity: "AS_NEEDED",
    requiredDocs: ["Notice of Opposition", "Evidence", "Authorization"],
    slaHours: 480
  },
  {
    serviceId: "TM005",
    name: "Copyright Registration",
    type: "COMPLIANCE",
    category: "trademark",
    price: 5999,
    deadline: "3-6 months",
    description: "Copyright registration for artistic/literary works",
    periodicity: "ONE_TIME",
    requiredDocs: ["Work Sample", "Author Details", "NOC (if applicable)"],
    slaHours: 360
  },
  {
    serviceId: "TM006",
    name: "Patent Filing (Provisional)",
    type: "COMPLIANCE",
    category: "trademark",
    price: 19999,
    deadline: "12 months to complete",
    description: "Provisional patent application filing",
    periodicity: "ONE_TIME",
    requiredDocs: ["Invention Description", "Drawings", "Inventor Details"],
    slaHours: 720
  },

  // ========================================
  // LABOUR COMPLIANCE (8 services)
  // ========================================
  {
    serviceId: "LAB001",
    name: "PF Registration (EPFO)",
    type: "COMPLIANCE",
    category: "labour",
    price: 2999,
    deadline: "Within 1 month of hiring",
    description: "Employees Provident Fund registration",
    periodicity: "ONE_TIME",
    requiredDocs: ["PAN", "COI", "Bank Statement", "Employee List"],
    slaHours: 168
  },
  {
    serviceId: "LAB002",
    name: "ESI Registration",
    type: "COMPLIANCE",
    category: "labour",
    price: 2999,
    deadline: "Within 15 days",
    description: "Employees State Insurance registration",
    periodicity: "ONE_TIME",
    requiredDocs: ["PAN", "COI", "Employee List", "Salary Details"],
    slaHours: 168
  },
  {
    serviceId: "LAB003",
    name: "PF Return Filing (Monthly)",
    type: "COMPLIANCE",
    category: "labour",
    price: 999,
    deadline: "15th of next month",
    description: "Monthly PF contribution and return filing",
    periodicity: "MONTHLY",
    requiredDocs: ["Salary Register", "Attendance", "New Joiner/Exit List"],
    slaHours: 24
  },
  {
    serviceId: "LAB004",
    name: "ESI Return Filing (Half-yearly)",
    type: "COMPLIANCE",
    category: "labour",
    price: 1499,
    deadline: "May 11 / Nov 11",
    description: "Half-yearly ESI contribution return",
    periodicity: "ANNUAL",
    requiredDocs: ["Salary Register", "Contribution Challan", "Employee Details"],
    slaHours: 48
  },
  {
    serviceId: "LAB005",
    name: "Professional Tax Registration",
    type: "COMPLIANCE",
    category: "labour",
    price: 1999,
    deadline: "30 days from liability",
    description: "Professional tax registration (state-specific)",
    periodicity: "ONE_TIME",
    requiredDocs: ["PAN", "Employee Salary Details", "Address Proof"],
    slaHours: 120
  },
  {
    serviceId: "LAB006",
    name: "Shop & Establishment Registration",
    type: "COMPLIANCE",
    category: "labour",
    price: 2999,
    deadline: "30 days from setup",
    description: "Shop Act license/registration",
    periodicity: "ONE_TIME",
    requiredDocs: ["Rent Agreement", "ID Proof", "Employee List"],
    slaHours: 168
  },
  {
    serviceId: "LAB007",
    name: "Labour Welfare Fund",
    type: "COMPLIANCE",
    category: "labour",
    price: 999,
    deadline: "January 15 / July 15",
    description: "Labour welfare fund contribution filing",
    periodicity: "ANNUAL",
    requiredDocs: ["Employee List", "Salary Details"],
    slaHours: 24
  },
  {
    serviceId: "LAB008",
    name: "Gratuity Compliance",
    type: "COMPLIANCE",
    category: "labour",
    price: 1999,
    deadline: "As needed",
    description: "Gratuity calculation and compliance advisory",
    periodicity: "AS_NEEDED",
    requiredDocs: ["Employee Details", "Service Records", "Salary History"],
    slaHours: 48
  },

  // ========================================
  // ACCOUNTING & BOOKKEEPING (6 services)
  // ========================================
  {
    serviceId: "ACC001",
    name: "Monthly Bookkeeping",
    type: "COMPLIANCE",
    category: "accounting",
    price: 4999,
    deadline: "10th of next month",
    description: "Complete monthly bookkeeping and reconciliation",
    periodicity: "MONTHLY",
    requiredDocs: ["Bank Statements", "Invoices", "Expense Bills"],
    slaHours: 72
  },
  {
    serviceId: "ACC002",
    name: "Quarterly Financial Review",
    type: "COMPLIANCE",
    category: "accounting",
    price: 7999,
    deadline: "End of quarter",
    description: "Quarterly MIS, financial statements, and variance analysis",
    periodicity: "QUARTERLY",
    requiredDocs: ["Monthly Books", "Budget", "Bank Reconciliation"],
    slaHours: 120
  },
  {
    serviceId: "ACC003",
    name: "Annual Financial Statements",
    type: "COMPLIANCE",
    category: "accounting",
    price: 14999,
    deadline: "September 30th",
    description: "Year-end financials preparation for audit",
    periodicity: "ANNUAL",
    requiredDocs: ["Monthly Books", "Fixed Asset Register", "Inventory Details"],
    slaHours: 240
  },
  {
    serviceId: "ACC004",
    name: "Payroll Processing",
    type: "COMPLIANCE",
    category: "accounting",
    price: 2999,
    deadline: "Last day of month",
    description: "Monthly payroll calculation, slips, and statutory deductions",
    periodicity: "MONTHLY",
    requiredDocs: ["Attendance", "Leave Records", "New Joiner Details"],
    slaHours: 48
  },
  {
    serviceId: "ACC005",
    name: "Accounts Receivable Management",
    type: "COMPLIANCE",
    category: "accounting",
    price: 1999,
    deadline: "Weekly",
    description: "Invoice tracking, follow-ups, and aging analysis",
    periodicity: "MONTHLY",
    requiredDocs: ["Invoice List", "Customer Details", "Payment Records"],
    slaHours: 24
  },
  {
    serviceId: "ACC006",
    name: "Virtual CFO Services",
    type: "ADVISORY",
    category: "accounting",
    price: 24999,
    deadline: "Monthly",
    description: "Strategic financial planning, MIS, and investor reporting",
    periodicity: "MONTHLY",
    requiredDocs: ["Financial Statements", "Business Plan", "KPIs"],
    slaHours: 168
  },

  // ========================================
  // AUDIT & CERTIFICATION (6 services)
  // ========================================
  {
    serviceId: "AUD001",
    name: "Statutory Audit",
    type: "AUDIT",
    category: "audit",
    price: 29999,
    deadline: "September 30th",
    description: "Annual statutory audit by practicing CA",
    periodicity: "ANNUAL",
    requiredDocs: ["Financial Statements", "Ledgers", "Bank Statements", "Vouchers"],
    slaHours: 480
  },
  {
    serviceId: "AUD002",
    name: "Tax Audit (44AB)",
    type: "AUDIT",
    category: "audit",
    price: 14999,
    deadline: "September 30th",
    description: "Tax audit for businesses with turnover above threshold",
    periodicity: "ANNUAL",
    requiredDocs: ["Financial Statements", "ITR", "Tax Reconciliation"],
    slaHours: 240
  },
  {
    serviceId: "AUD003",
    name: "Internal Audit",
    type: "AUDIT",
    category: "audit",
    price: 19999,
    deadline: "Quarterly",
    description: "Quarterly internal audit and controls review",
    periodicity: "QUARTERLY",
    requiredDocs: ["Process Documents", "Prior Reports", "Management Accounts"],
    slaHours: 168
  },
  {
    serviceId: "AUD004",
    name: "GST Audit",
    type: "AUDIT",
    category: "audit",
    price: 14999,
    deadline: "December 31st",
    description: "GST audit for turnover above ₹5 crore",
    periodicity: "ANNUAL",
    requiredDocs: ["GST Returns", "Financial Statements", "Reconciliations"],
    slaHours: 240
  },
  {
    serviceId: "AUD005",
    name: "Stock Audit",
    type: "AUDIT",
    category: "audit",
    price: 9999,
    deadline: "As needed",
    description: "Physical verification and stock audit",
    periodicity: "AS_NEEDED",
    requiredDocs: ["Stock Register", "Purchase Records", "Sales Records"],
    slaHours: 120
  },
  {
    serviceId: "AUD006",
    name: "Due Diligence",
    type: "AUDIT",
    category: "audit",
    price: 49999,
    deadline: "As per engagement",
    description: "Financial and legal due diligence for M&A/funding",
    periodicity: "ONE_TIME",
    requiredDocs: ["3 Year Financials", "Contracts", "Legal Documents"],
    slaHours: 720
  },

  // ========================================
  // ANNUAL COMPLIANCE (6 services)
  // ========================================
  {
    serviceId: "ANN001",
    name: "Annual Compliance Bundle - Pvt Ltd",
    type: "COMPLIANCE",
    category: "annual_compliance",
    price: 19999,
    deadline: "Various",
    description: "Complete annual compliance: AOC-4, MGT-7, ADT-1, DIR-3 KYC",
    periodicity: "ANNUAL",
    requiredDocs: ["Audited Financials", "Director Details", "Shareholder List"],
    slaHours: 240
  },
  {
    serviceId: "ANN002",
    name: "Annual Compliance Bundle - LLP",
    type: "COMPLIANCE",
    category: "annual_compliance",
    price: 14999,
    deadline: "Various",
    description: "Complete LLP annual compliance: Form 8, Form 11, ITR",
    periodicity: "ANNUAL",
    requiredDocs: ["Statement of Account", "Partner Details", "LLP Agreement"],
    slaHours: 168
  },
  {
    serviceId: "ANN003",
    name: "Annual Compliance Bundle - OPC",
    type: "COMPLIANCE",
    category: "annual_compliance",
    price: 14999,
    deadline: "Various",
    description: "OPC annual compliance: AOC-4, MGT-7A, ADT-1",
    periodicity: "ANNUAL",
    requiredDocs: ["Audited Financials", "Director Details"],
    slaHours: 168
  },
  {
    serviceId: "ANN004",
    name: "Registered Agent Services",
    type: "COMPLIANCE",
    category: "annual_compliance",
    price: 9999,
    deadline: "Annual",
    description: "Registered office address and mail forwarding services",
    periodicity: "ANNUAL",
    requiredDocs: ["Company Documents"],
    slaHours: 24
  },
  {
    serviceId: "ANN005",
    name: "Compliance Calendar Management",
    type: "COMPLIANCE",
    category: "annual_compliance",
    price: 4999,
    deadline: "Annual",
    description: "Custom compliance calendar with reminders and tracking",
    periodicity: "ANNUAL",
    requiredDocs: ["Company Profile", "Service List"],
    slaHours: 48
  },
  {
    serviceId: "ANN006",
    name: "Board Meeting Compliance",
    type: "COMPLIANCE",
    category: "annual_compliance",
    price: 2999,
    deadline: "Quarterly",
    description: "Board meeting notice, agenda, minutes, and resolutions",
    periodicity: "QUARTERLY",
    requiredDocs: ["Previous Minutes", "Director Availability"],
    slaHours: 48
  },

  // ========================================
  // LEGAL SERVICES (4 services)
  // ========================================
  {
    serviceId: "LEG001",
    name: "Founders Agreement",
    type: "ADVISORY",
    category: "legal",
    price: 9999,
    deadline: "7 days",
    description: "Comprehensive founders/co-founders agreement drafting",
    periodicity: "ONE_TIME",
    requiredDocs: ["Founder Details", "Equity Split", "Roles Description"],
    slaHours: 168
  },
  {
    serviceId: "LEG002",
    name: "Employment Agreement",
    type: "ADVISORY",
    category: "legal",
    price: 2999,
    deadline: "3 days",
    description: "Standard employment contract with NDA and IP assignment",
    periodicity: "AS_NEEDED",
    requiredDocs: ["Job Description", "Compensation Details"],
    slaHours: 72
  },
  {
    serviceId: "LEG003",
    name: "NDA / Confidentiality Agreement",
    type: "ADVISORY",
    category: "legal",
    price: 1999,
    deadline: "2 days",
    description: "Non-disclosure agreement for business relationships",
    periodicity: "AS_NEEDED",
    requiredDocs: ["Party Details", "Purpose Description"],
    slaHours: 48
  },
  {
    serviceId: "LEG004",
    name: "Shareholder Agreement",
    type: "ADVISORY",
    category: "legal",
    price: 14999,
    deadline: "10 days",
    description: "SHA covering voting rights, drag/tag along, exit clauses",
    periodicity: "ONE_TIME",
    requiredDocs: ["Shareholder Details", "Investment Terms", "Board Composition"],
    slaHours: 240
  },
];

// ============================================
// SEED FUNCTIONS
// ============================================

async function seedServices() {
  console.log("🌱 Seeding services table...");

  const serviceRecords = SERVICES.map(s => ({
    serviceId: s.serviceId,
    name: s.name,
    type: s.type,
    category: s.category,
    price: s.price,
    deadline: s.deadline,
    description: s.description,
    requiredDocs: s.requiredDocs,
    isActive: true,
  }));

  await db.insert(services).values(serviceRecords).onConflictDoNothing();
  console.log(`✅ Inserted ${serviceRecords.length} services`);
}

async function seedServicesCatalog() {
  console.log("🌱 Seeding services_catalog table...");

  const catalogRecords = SERVICES.map(s => ({
    serviceKey: s.serviceId.toLowerCase(),
    name: s.name,
    periodicity: s.periodicity,
    description: s.description,
    category: s.category,
    isActive: true,
  }));

  await db.insert(servicesCatalog).values(catalogRecords).onConflictDoNothing();
  console.log(`✅ Inserted ${catalogRecords.length} catalog entries`);
}

async function seedServiceDefinitions() {
  console.log("🌱 Seeding service_definitions table...");

  const definitionRecords = SERVICES.map(s => ({
    serviceCode: s.serviceId,
    name: s.name,
    description: s.description,
    detailedDescription: s.description,
    category: s.category,
    subcategory: null,
    businessLine: s.type.toLowerCase(),
    serviceType: "standard" as const,
    basePrice: String(s.price),
    pricingModel: "fixed" as const,
    currency: "INR",
    slaHours: s.slaHours,
    complexityLevel: s.slaHours > 200 ? "high" : s.slaHours > 72 ? "medium" : "low",
    documentRequirements: s.requiredDocs,
    isAutomated: false,
    automationLevel: "manual" as const,
  }));

  await db.insert(serviceDefinitions).values(definitionRecords).onConflictDoNothing();
  console.log(`✅ Inserted ${definitionRecords.length} service definitions`);
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  console.log("🚀 Starting Service Catalog Seed...\n");
  console.log(`📊 Total services to seed: ${SERVICES.length}\n`);

  try {
    await seedServices();
    await seedServicesCatalog();
    await seedServiceDefinitions();

    console.log("\n✨ Service Catalog Seed Complete!");
    console.log(`
📈 Summary:
   - Services: ${SERVICES.length}
   - Categories: ${new Set(SERVICES.map(s => s.category)).size}
   - Service Types: ${new Set(SERVICES.map(s => s.type)).size}

🏷️ Categories:
${Array.from(new Set(SERVICES.map(s => s.category)))
  .map(cat => `   - ${cat}: ${SERVICES.filter(s => s.category === cat).length} services`)
  .join('\n')}
    `);

  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
