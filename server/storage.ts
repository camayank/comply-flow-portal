import { 
  users, services, serviceRequests, payments, leads, salesProposals,
  type User, type InsertUser,
  type Service, type InsertService,
  type ServiceRequest, type InsertServiceRequest,
  type Payment, type InsertPayment,
  type LeadEnhanced, type InsertLeadEnhanced,
  type SalesProposal, type InsertSalesProposal
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
  
  // Lead methods
  getAllLeads(filters?: {
    search?: string;
    stage?: string;
    source?: string;
    executive?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    leads: LeadEnhanced[];
    total: number;
  }>;
  getLead(id: number): Promise<LeadEnhanced | undefined>;
  createLead(lead: InsertLeadEnhanced): Promise<LeadEnhanced>;
  updateLead(id: number, updates: Partial<LeadEnhanced>): Promise<LeadEnhanced | undefined>;
  deleteLead(id: number): Promise<boolean>;
  addLeadInteraction(id: number, interaction: { type: string; notes: string; executive: string }): Promise<LeadEnhanced | undefined>;
  getLeadStats(): Promise<{
    stageDistribution: Record<string, number>;
    sourceDistribution: Record<string, number>;
    totalLeads: number;
    recentLeads: number;
    conversionRate: number;
  }>;
  getPreSalesExecutives(): Promise<string[]>;
  
  // Sales Proposal methods
  getSalesProposalsByLead(leadId: string): Promise<SalesProposal[]>;
  createSalesProposal(proposal: InsertSalesProposal): Promise<SalesProposal>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private services: Map<string, Service>;
  private serviceRequests: Map<number, ServiceRequest>;
  private payments: Map<string, Payment>;
  private leads: Map<number, LeadEnhanced>;
  private salesProposals: Map<number, SalesProposal>;
  private userIdCounter: number;
  private requestIdCounter: number;
  private leadIdCounter: number;
  private proposalIdCounter: number;

  constructor() {
    this.users = new Map();
    this.services = new Map();
    this.serviceRequests = new Map();
    this.payments = new Map();
    this.leads = new Map();
    this.salesProposals = new Map();
    this.userIdCounter = 1;
    this.requestIdCounter = 1;
    this.leadIdCounter = 1;
    this.proposalIdCounter = 1;
    this.initializeServices();
    this.initializeLeads();
  }

  private initializeServices() {
    // KOSHIKA Services SOPs - configured from Excel worksheets
    const defaultServices: InsertService[] = [
      // Incorporation Services (from Index worksheet + detailed DOCX workflow)
      { serviceId: 'company-incorporation', name: 'Company Incorporation', type: 'Incorporation', category: 'business-setup', price: 15000, deadline: '20 days from name approval', description: 'Complete Private Limited Company incorporation: SPICE Part A/B, Agilepro, MOA/AOA, INC-9 with DSC affixing', requiredDocs: ['minimum_2_unique_names', 'minimum_2_directors', 'electricity_bill_not_older_2months', 'moa_objects', 'share_capital_info', 'director_pan_aadhaar_photos', 'unique_email_phone', 'bank_statements', 'noc_property_owner'], isActive: true },
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
        deadline: service.deadline || null,
        description: service.description || null,
        isActive: service.isActive ?? true,
        requiredDocs: service.requiredDocs || [],
      };
      this.services.set(service.serviceId, fullService);
    });
  }

  private initializeLeads() {
    // Sample leads data for testing and development
    const sampleLeads: InsertLeadEnhanced[] = [
      {
        leadId: 'L0001',
        clientName: 'Rajesh Kumar',
        contactEmail: 'rajesh.kumar@email.com',
        contactPhone: '+91-9876543210',
        state: 'Maharashtra',
        entityType: 'pvt_ltd',
        serviceInterested: 'Company Incorporation',
        leadSource: 'Google Ads',
        preSalesExecutive: 'Priya Sharma',
        leadStage: 'hot_lead',
        priority: 'high',
        estimatedValue: '15000.00',
        conversionProbability: 85,
        notes: 'Interested in quick incorporation for new tech startup',
        interactionHistory: [
          {
            date: new Date().toISOString(),
            type: 'call',
            notes: 'Initial consultation call - very interested',
            executive: 'Priya Sharma'
          }
        ]
      },
      {
        leadId: 'L0002',
        clientName: 'Suresh Patel',
        contactEmail: 'suresh.patel@business.com',
        contactPhone: '+91-9987654321',
        state: 'Gujarat',
        entityType: 'llp',
        serviceInterested: 'LLP Incorporation',
        leadSource: 'Referral',
        preSalesExecutive: 'Amit Singh',
        leadStage: 'warm_lead',
        priority: 'medium',
        estimatedValue: '12000.00',
        conversionProbability: 60,
        notes: 'Partnership business, needs LLP for tax benefits'
      },
      {
        leadId: 'L0003',
        clientName: 'Kavya Reddy',
        contactEmail: 'kavya.reddy@startup.com',
        contactPhone: '+91-8765432109',
        state: 'Karnataka',
        entityType: 'opc',
        serviceInterested: 'OPC Incorporation',
        leadSource: 'Website',
        preSalesExecutive: 'Priya Sharma',
        leadStage: 'new',
        priority: 'medium',
        estimatedValue: '13000.00',
        conversionProbability: 45,
        notes: 'Single founder startup, exploring incorporation options'
      },
      {
        leadId: 'L0004',
        clientName: 'Vikram Singh',
        contactEmail: 'vikram.singh@corp.com',
        contactPhone: '+91-7654321098',
        state: 'Delhi',
        entityType: 'pvt_ltd',
        serviceInterested: 'Director Appointment',
        leadSource: 'Facebook Ads',
        preSalesExecutive: 'Amit Singh',
        leadStage: 'cold_lead',
        priority: 'low',
        estimatedValue: '4000.00',
        conversionProbability: 30,
        notes: 'Existing company needs additional director'
      },
      {
        leadId: 'L0005',
        clientName: 'Anita Desai',
        contactEmail: 'anita.desai@consulting.com',
        contactPhone: '+91-6543210987',
        state: 'Maharashtra',
        entityType: 'pvt_ltd',
        serviceInterested: 'Annual Compliance',
        leadSource: 'Google Ads',
        preSalesExecutive: 'Priya Sharma',
        leadStage: 'converted',
        status: 'converted',
        priority: 'high',
        estimatedValue: '8000.00',
        conversionProbability: 100,
        convertedAt: new Date(),
        notes: 'Converted to client - needs complete compliance package'
      }
    ];

    sampleLeads.forEach((leadData, index) => {
      const id = this.leadIdCounter++;
      const lead: LeadEnhanced = {
        ...leadData,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: leadData.status || leadData.leadStage || 'new',
        agentId: null,
        contactEmail: leadData.contactEmail || null,
        requiredServices: null,
        kycDocuments: null,
        leadLocation: null,
        lastContactDate: null,
        nextFollowupDate: null,
        remarks: null,
        closedAt: null,
        lostReason: null,
        assignedTo: null,
        transferApprovalStatus: 'pending'
      };
      this.leads.set(id, lead);
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
      deadline: service.deadline || null,
      description: service.description || null,
      isActive: service.isActive ?? true,
      requiredDocs: service.requiredDocs || null,
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
      status: request.status || 'initiated',
      userId: request.userId || null,
      uploadedDocs: request.uploadedDocs || null,
      documentHash: request.documentHash || null,
      signatureData: request.signatureData || null,
      paymentId: request.paymentId || null,
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
      status: payment.status || 'pending',
      paymentMethod: payment.paymentMethod || null,
      transactionId: payment.transactionId || null,
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

  // Lead methods
  async getAllLeads(filters: {
    search?: string;
    stage?: string;
    source?: string;
    executive?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ leads: LeadEnhanced[]; total: number }> {
    let allLeads = Array.from(this.leads.values());
    
    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      allLeads = allLeads.filter(lead =>
        lead.clientName.toLowerCase().includes(searchLower) ||
        (lead.contactEmail && lead.contactEmail.toLowerCase().includes(searchLower)) ||
        lead.contactPhone.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply stage filter
    if (filters.stage && filters.stage !== 'all_stages') {
      allLeads = allLeads.filter(lead => lead.leadStage === filters.stage);
    }
    
    // Apply source filter
    if (filters.source && filters.source !== 'all_sources') {
      allLeads = allLeads.filter(lead => lead.leadSource === filters.source);
    }
    
    // Apply executive filter
    if (filters.executive) {
      allLeads = allLeads.filter(lead => lead.preSalesExecutive === filters.executive);
    }
    
    const total = allLeads.length;
    
    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 10;
    const paginatedLeads = allLeads.slice(offset, offset + limit);
    
    return {
      leads: paginatedLeads,
      total
    };
  }

  async getLead(id: number): Promise<LeadEnhanced | undefined> {
    return this.leads.get(id);
  }

  async createLead(leadData: InsertLeadEnhanced): Promise<LeadEnhanced> {
    const id = this.leadIdCounter++;
    
    // Generate leadId if not provided
    let leadId = leadData.leadId;
    if (!leadId) {
      const lastLeadId = Array.from(this.leads.values())
        .map(l => l.leadId)
        .filter(id => id.startsWith('L'))
        .sort()
        .pop();
        
      if (lastLeadId) {
        const lastNumber = parseInt(lastLeadId.substring(1));
        const nextNumber = lastNumber + 1;
        leadId = `L${nextNumber.toString().padStart(4, '0')}`;
      } else {
        leadId = 'L0001';
      }
    }
    
    const lead: LeadEnhanced = {
      ...leadData,
      id,
      leadId,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: leadData.status || leadData.leadStage || 'new',
      agentId: leadData.agentId || null,
      contactEmail: leadData.contactEmail || null,
      requiredServices: leadData.requiredServices || null,
      kycDocuments: leadData.kycDocuments || null,
      leadLocation: leadData.leadLocation || null,
      estimatedValue: leadData.estimatedValue || null,
      conversionProbability: leadData.conversionProbability || null,
      lastContactDate: leadData.lastContactDate || null,
      nextFollowupDate: leadData.nextFollowupDate || null,
      remarks: leadData.remarks || null,
      notes: leadData.notes || null,
      interactionHistory: leadData.interactionHistory || null,
      convertedAt: leadData.convertedAt || null,
      closedAt: leadData.closedAt || null,
      lostReason: leadData.lostReason || null,
      assignedTo: leadData.assignedTo || null,
      transferApprovalStatus: leadData.transferApprovalStatus || 'pending'
    };
    
    this.leads.set(id, lead);
    return lead;
  }

  async updateLead(id: number, updates: Partial<LeadEnhanced>): Promise<LeadEnhanced | undefined> {
    const existing = this.leads.get(id);
    if (!existing) return undefined;
    
    const updated: LeadEnhanced = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.leads.set(id, updated);
    return updated;
  }

  async deleteLead(id: number): Promise<boolean> {
    return this.leads.delete(id);
  }

  async addLeadInteraction(id: number, interaction: { type: string; notes: string; executive: string }): Promise<LeadEnhanced | undefined> {
    const existing = this.leads.get(id);
    if (!existing) return undefined;
    
    const currentHistory = (existing.interactionHistory as any[]) || [];
    const newInteraction = {
      date: new Date().toISOString(),
      ...interaction
    };
    
    const updated: LeadEnhanced = {
      ...existing,
      interactionHistory: [...currentHistory, newInteraction],
      lastContactDate: new Date(),
      updatedAt: new Date()
    };
    
    this.leads.set(id, updated);
    return updated;
  }

  async getLeadStats(): Promise<{
    stageDistribution: Record<string, number>;
    sourceDistribution: Record<string, number>;
    totalLeads: number;
    recentLeads: number;
    conversionRate: number;
  }> {
    const allLeads = Array.from(this.leads.values());
    
    // Stage distribution
    const stageDistribution: Record<string, number> = {};
    allLeads.forEach(lead => {
      if (lead.leadStage) {
        stageDistribution[lead.leadStage] = (stageDistribution[lead.leadStage] || 0) + 1;
      }
    });
    
    // Source distribution
    const sourceDistribution: Record<string, number> = {};
    allLeads.forEach(lead => {
      sourceDistribution[lead.leadSource] = (sourceDistribution[lead.leadSource] || 0) + 1;
    });
    
    // Recent leads (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentLeads = allLeads.filter(lead => 
      lead.createdAt && lead.createdAt >= sevenDaysAgo
    ).length;
    
    // Total leads
    const totalLeads = allLeads.length;
    
    // Conversion rate
    const convertedLeads = allLeads.filter(lead => lead.status === 'converted').length;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
    
    return {
      stageDistribution,
      sourceDistribution,
      totalLeads,
      recentLeads,
      conversionRate: Math.round(conversionRate * 100) / 100
    };
  }

  async getPreSalesExecutives(): Promise<string[]> {
    const executives = Array.from(this.leads.values())
      .map(lead => lead.preSalesExecutive)
      .filter((executive, index, array) => executive && array.indexOf(executive) === index);
    
    return executives as string[];
  }

  // Sales Proposal methods
  async getSalesProposalsByLead(leadId: string): Promise<SalesProposal[]> {
    return Array.from(this.salesProposals.values()).filter(proposal => proposal.leadId === leadId);
  }

  async createSalesProposal(proposalData: InsertSalesProposal): Promise<SalesProposal> {
    const id = this.proposalIdCounter++;
    
    const proposal: SalesProposal = {
      ...proposalData,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      qualifiedLeadStatus: proposalData.qualifiedLeadStatus || null,
      proposalStatus: proposalData.proposalStatus || null,
      proposalAmount: proposalData.proposalAmount || null,
      requiredServices: proposalData.requiredServices || null,
      nextFollowupDate: proposalData.nextFollowupDate || null,
      interactionLog: proposalData.interactionLog || null,
      finalRemark: proposalData.finalRemark || null,
      documentsLink: proposalData.documentsLink || null,
      paymentReceived: proposalData.paymentReceived || 'pending',
      paymentPending: proposalData.paymentPending || '0.00'
    };
    
    this.salesProposals.set(id, proposal);
    return proposal;
  }
}

export const storage = new MemStorage();
