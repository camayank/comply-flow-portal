// Re-export all types from stores for convenience
export type { User } from '@/store/authStore';
export type { Notification } from '@/store/notificationStore';
export type { Service, ServiceInstance } from '@/store/serviceStore';
export type { Client, ClientDocument } from '@/store/clientStore';
export type { Lead, LeadActivity } from '@/store/leadStore';
export type { DashboardStats, ActivityItem } from '@/store/dashboardStore';

// Common types
export type UserRole = 'CLIENT' | 'SALES' | 'OPERATIONS' | 'ADMIN' | 'AGENT' | 'SUPER_ADMIN';

export type ServiceStatus = 'PENDING' | 'IN_PROGRESS' | 'UNDER_REVIEW' | 'COMPLETED' | 'CANCELLED';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type LeadStage = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';

export type LeadSource = 'WEBSITE' | 'REFERRAL' | 'AGENT' | 'DIRECT' | 'MARKETING';

export type BusinessType = 'INDIVIDUAL' | 'PARTNERSHIP' | 'LLP' | 'PRIVATE_LIMITED' | 'PUBLIC_LIMITED' | 'OPC';

export type DocumentCategory = 'IDENTITY' | 'ADDRESS' | 'BUSINESS' | 'TAX' | 'COMPLIANCE' | 'OTHER';

export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any[];
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Form types
export interface FormErrors {
  [key: string]: string | undefined;
}

// Table types
export interface Column<T = any> {
  key: string;
  header: string;
  accessor?: (row: T) => any;
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface TableProps<T = any> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

// Chart types
export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: any;
}

// Filter types
export interface FilterOption {
  label: string;
  value: string | number;
}

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

// Metadata types
export interface Metadata {
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// Address type
export interface Address {
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

// Bank details type
export interface BankDetails {
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
  bankName: string;
  branchName?: string;
}

// File upload type
export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: string;
}

// Compliance types
export interface ComplianceDeadline {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: Priority;
  status: 'UPCOMING' | 'DUE' | 'OVERDUE' | 'COMPLETED';
  category: string;
}

// Task types
export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED';
  priority: Priority;
  assignedTo?: string;
  assignedBy?: string;
  dueDate?: string;
  completedAt?: string;
  serviceInstanceId?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

// Proposal types
export interface Proposal {
  id: string;
  title: string;
  description: string;
  leadId?: string;
  clientId?: string;
  status: 'DRAFT' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  totalAmount: number;
  validUntil: string;
  createdAt: string;
  services: ProposalService[];
  termsAndConditions?: string;
}

export interface ProposalService {
  serviceId: string;
  serviceName: string;
  quantity: number;
  price: number;
  total: number;
}

// Invoice types
export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  amount: number;
  tax: number;
  totalAmount: number;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  issuedAt: string;
  dueDate: string;
  paidAt?: string;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

// Payment types
export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  status: PaymentStatus;
  method: 'RAZORPAY' | 'WALLET' | 'BANK_TRANSFER';
  purpose: string;
  createdAt: string;
  completedAt?: string;
  metadata?: Record<string, any>;
}

// Commission types
export interface Commission {
  id: string;
  agentId: string;
  leadId: string;
  amount: number;
  percentage: number;
  status: 'PENDING' | 'APPROVED' | 'PAID';
  createdAt: string;
  approvedAt?: string;
  paidAt?: string;
}

// Agent types
export interface Agent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  businessName?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  totalEarnings: number;
  pendingEarnings: number;
  totalLeads: number;
  convertedLeads: number;
  joinedAt: string;
}
