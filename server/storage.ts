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
    const defaultServices: InsertService[] = [
      { serviceId: 'aoc-4', name: 'AOC-4 Annual Filing', type: 'ROC', category: 'mandatory', price: 1499, deadline: '30 days', description: 'Annual filing for companies', requiredDocs: ['board_resolution', 'balance_sheet'], isActive: true },
      { serviceId: 'mgt-7', name: 'MGT-7 Annual Return', type: 'ROC', category: 'mandatory', price: 1299, deadline: '60 days', description: 'Annual return filing', requiredDocs: ['annual_accounts', 'directors_report'], isActive: true },
      { serviceId: 'gst-3b', name: 'GST-3B Monthly Return', type: 'Tax', category: 'recurring', price: 999, deadline: '20th of every month', description: 'Monthly GST return', requiredDocs: ['purchase_register', 'sales_register'], isActive: true },
      { serviceId: 'dpt-3', name: 'DPT-3 Deposit Return', type: 'ROC', category: 'conditional', price: 799, deadline: '30 days', description: 'Deposit return filing', requiredDocs: ['deposit_details'], isActive: true },
      { serviceId: 'ben-1', name: 'BEN-1 Beneficial Owner', type: 'ROC', category: 'mandatory', price: 999, deadline: '30 days', description: 'Beneficial ownership disclosure', requiredDocs: ['ownership_details'], isActive: true },
      { serviceId: 'iso-9001', name: 'ISO-9001 Certification', type: 'Certification', category: 'optional', price: 4999, deadline: 'No deadline', description: 'Quality management certification', requiredDocs: ['quality_manual', 'process_docs'], isActive: true },
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
