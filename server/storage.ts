import { 
  users, services, serviceRequests, payments,
  type User, type InsertUser,
  type Service, type InsertService,
  type ServiceRequest, type InsertServiceRequest,
  type Payment, type InsertPayment
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Service methods
  getAllServices(): Promise<Service[]>;
  getService(serviceId: string): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  
  // Service Request methods
  getServiceRequest(id: number): Promise<ServiceRequest | undefined>;
  createServiceRequest(request: InsertServiceRequest): Promise<ServiceRequest>;
  updateServiceRequest(id: number, updates: Partial<ServiceRequest>): Promise<ServiceRequest | undefined>;
  getServiceRequestsByUser(userId: number): Promise<ServiceRequest[]>;
  
  // Payment methods
  getPayment(paymentId: string): Promise<Payment | undefined>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(paymentId: string, updates: Partial<Payment>): Promise<Payment | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private services: Map<string, Service>;
  private serviceRequests: Map<number, ServiceRequest>;
  private payments: Map<string, Payment>;
  private userIdCounter: number;
  private requestIdCounter: number;

  constructor() {
    this.users = new Map();
    this.services = new Map();
    this.serviceRequests = new Map();
    this.payments = new Map();
    this.userIdCounter = 1;
    this.requestIdCounter = 1;
    this.initializeServices();
  }

  private initializeServices() {
    // KOSHIKA Services SOPs - configured from Excel worksheets
    const defaultServices: InsertService[] = [
      // Incorporation Services (from Index worksheet)
      { serviceId: 'company-incorporation', name: 'Company Incorporation', type: 'Incorporation', category: 'business-setup', price: 15000, deadline: '20 days', description: 'Private Limited Company incorporation using SPICE Part B form', requiredDocs: ['unique_company_names', 'director_pan_aadhaar', 'address_proof', 'moa_aoa'], isActive: true },
      { serviceId: 'llp-incorporation', name: 'LLP Incorporation', type: 'Incorporation', category: 'business-setup', price: 12000, deadline: '3 months', description: 'Limited Liability Partnership incorporation using FiLLiP form', requiredDocs: ['unique_name', 'designated_partners', 'llp_agreement'], isActive: true },
      { serviceId: 'opc-incorporation', name: 'OPC Incorporation', type: 'Incorporation', category: 'business-setup', price: 13000, deadline: '20 days', description: 'One Person Company incorporation using SPICE Part B form', requiredDocs: ['unique_names', 'director_details', 'nominee_details'], isActive: true },
      { serviceId: 'section8-incorporation', name: 'Section 8 Company Incorporation', type: 'Incorporation', category: 'business-setup', price: 18000, deadline: '20 days', description: 'Non-profit company incorporation under Section 8', requiredDocs: ['charitable_objects', 'license_application'], isActive: true },
      
      // Director Change Services
      { serviceId: 'director-appointment', name: 'Director Appointment', type: 'Change', category: 'director-services', price: 4000, deadline: 'Within 1 month of board meeting', description: 'Appointment of new director using DIR-12 form', requiredDocs: ['director_pan', 'aadhaar', 'board_resolution', 'consent_letter'], isActive: true },
      { serviceId: 'director-resignation', name: 'Director Resignation', type: 'Change', category: 'director-services', price: 3500, deadline: 'Within 1 month of board meeting', description: 'Director resignation filing using DIR-11 & DIR-12 forms', requiredDocs: ['board_resolution', 'resignation_letter'], isActive: true },
      
      // Annual Compliance Services
      { serviceId: 'commencement-business', name: 'Commencement of Business', type: 'Compliance', category: 'annual-compliance', price: 3000, deadline: 'Within 180 days after incorporation', description: 'Filing INC-20A for commencement of business', requiredDocs: ['director_declaration', 'office_verification'], isActive: true },
      { serviceId: 'auditor-appointment', name: 'Auditor Appointment', type: 'Compliance', category: 'annual-compliance', price: 2500, deadline: 'Within 15 days after appointment', description: 'Filing ADT-1 for auditor appointment', requiredDocs: ['auditor_consent', 'board_resolution'], isActive: true },
      { serviceId: 'director-kyc', name: 'Director KYC', type: 'Compliance', category: 'annual-compliance', price: 2000, deadline: 'Before 30th September every year', description: 'Annual director KYC filing using DIR-3 KYC', requiredDocs: ['director_pan', 'aadhaar', 'address_proof'], isActive: true },
      { serviceId: 'aoc-4', name: 'AOC-4 Filing', type: 'Compliance', category: 'annual-compliance', price: 5000, deadline: 'Before 30th September every year', description: 'Annual filing of financial statements using AOC-4 form', requiredDocs: ['balance_sheet', 'pl_statement', 'auditor_report', 'board_resolution'], isActive: true },
      { serviceId: 'mgt-7a', name: 'MGT-7A Filing (Small Companies)', type: 'Compliance', category: 'annual-compliance', price: 3500, deadline: 'Before 30th September every year', description: 'Abridged annual return for OPCs and small companies', requiredDocs: ['annual_return_draft', 'board_resolution'], isActive: true },
      { serviceId: 'mgt-7', name: 'MGT-7 Filing (Foundation)', type: 'Compliance', category: 'annual-compliance', price: 4000, deadline: 'Before 30th September every year', description: 'Annual return filing for foundation companies', requiredDocs: ['annual_return', 'board_resolution', 'member_details'], isActive: true },
      { serviceId: 'dpt-3', name: 'DPT-3 Filing', type: 'Compliance', category: 'annual-compliance', price: 3000, deadline: '30th June every year', description: 'Annual return on deposits', requiredDocs: ['deposit_details', 'board_resolution'], isActive: true },
      { serviceId: 'itr-filing', name: 'ITR Filing (Companies)', type: 'Tax', category: 'tax-compliance', price: 8000, deadline: '31st October every year', description: 'Income tax return filing using ITR-6 & ITR-7', requiredDocs: ['financial_statements', 'tax_computation', 'audit_report'], isActive: true },
      
      // LLP Annual Compliance
      { serviceId: 'llp-form3', name: 'LLP Form-3 Filing', type: 'Compliance', category: 'llp-compliance', price: 2500, deadline: 'Within 1 month of LLP incorporation', description: 'Information filing with regard to LLP', requiredDocs: ['llp_agreement', 'partner_details'], isActive: true },
      { serviceId: 'llp-form11', name: 'LLP Form-11 Filing', type: 'Compliance', category: 'llp-compliance', price: 4000, deadline: '30th May every year', description: 'Annual return of LLP', requiredDocs: ['annual_accounts', 'llp_agreement'], isActive: true },
      { serviceId: 'llp-form8', name: 'LLP Form-8 Filing', type: 'Compliance', category: 'llp-compliance', price: 5000, deadline: '30th October every year', description: 'Statement of account & solvency filing', requiredDocs: ['statement_accounts', 'solvency_certificate'], isActive: true },
      
      // Additional Change Services
      { serviceId: 'company-address-change', name: 'Company Address Change', type: 'Change', category: 'company-changes', price: 4500, deadline: 'Within 1 month of board meeting', description: 'Registered office address change using INC-22', requiredDocs: ['new_address_proof', 'board_resolution', 'noc_landlord'], isActive: true },
      { serviceId: 'llp-address-change', name: 'LLP Address Change', type: 'Change', category: 'llp-changes', price: 4000, deadline: 'Within 1 month of resolution', description: 'LLP registered office change using Form-15 & Form-3', requiredDocs: ['new_address_proof', 'partner_resolution'], isActive: true },
      { serviceId: 'llp-partner-change', name: 'LLP Partner Change', type: 'Change', category: 'llp-changes', price: 4500, deadline: 'Within 1 month of change', description: 'Partner change in LLP using Form-4 & Form-3', requiredDocs: ['new_partner_details', 'partner_agreement', 'consent_letter'], isActive: true },
      
      // Conversion Services
      { serviceId: 'pvt-to-opc-conversion', name: 'Private Limited to OPC Conversion', type: 'Conversion', category: 'conversion-services', price: 12000, deadline: '45 days', description: 'Conversion of private limited company to OPC with eligibility criteria check', requiredDocs: ['financial_statements', 'board_resolution', 'member_consent', 'compliance_certificate'], isActive: true },
    ];

    defaultServices.forEach((service, index) => {
      const fullService: Service = {
        ...service,
        id: index + 1,
        createdAt: new Date(),
      };
      this.services.set(service.serviceId, fullService);
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Service methods
  async getAllServices(): Promise<Service[]> {
    return Array.from(this.services.values()).filter(service => service.isActive);
  }

  async getService(serviceId: string): Promise<Service | undefined> {
    return this.services.get(serviceId);
  }

  async createService(service: InsertService): Promise<Service> {
    const id = this.services.size + 1;
    const fullService: Service = {
      ...service,
      id,
      createdAt: new Date(),
    };
    this.services.set(service.serviceId, fullService);
    return fullService;
  }

  // Service Request methods
  async getServiceRequest(id: number): Promise<ServiceRequest | undefined> {
    return this.serviceRequests.get(id);
  }

  async createServiceRequest(request: InsertServiceRequest): Promise<ServiceRequest> {
    const id = this.requestIdCounter++;
    const fullRequest: ServiceRequest = {
      ...request,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.serviceRequests.set(id, fullRequest);
    return fullRequest;
  }

  async updateServiceRequest(id: number, updates: Partial<ServiceRequest>): Promise<ServiceRequest | undefined> {
    const existing = this.serviceRequests.get(id);
    if (!existing) return undefined;
    
    const updated: ServiceRequest = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.serviceRequests.set(id, updated);
    return updated;
  }

  async getServiceRequestsByUser(userId: number): Promise<ServiceRequest[]> {
    return Array.from(this.serviceRequests.values()).filter(req => req.userId === userId);
  }

  // Payment methods
  async getPayment(paymentId: string): Promise<Payment | undefined> {
    return this.payments.get(paymentId);
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const id = this.payments.size + 1;
    const fullPayment: Payment = {
      ...payment,
      id,
      createdAt: new Date(),
      completedAt: null,
    };
    this.payments.set(payment.paymentId, fullPayment);
    return fullPayment;
  }

  async updatePayment(paymentId: string, updates: Partial<Payment>): Promise<Payment | undefined> {
    const existing = this.payments.get(paymentId);
    if (!existing) return undefined;
    
    const updated: Payment = {
      ...existing,
      ...updates,
      completedAt: updates.status === 'completed' ? new Date() : existing.completedAt,
    };
    this.payments.set(paymentId, updated);
    return updated;
  }
}

export const storage = new MemStorage();
