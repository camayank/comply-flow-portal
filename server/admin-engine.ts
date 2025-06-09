// Robust Admin Engine for DigiComply Platform Configuration
import { workflowEngine } from './workflow-engine';
import { storage } from './storage';

export interface ServiceConfiguration {
  id: string;
  name: string;
  category: string;
  type: string;
  basePrice: number;
  premiumPrice?: number;
  estimatedDays: number;
  description: string;
  requiredDocs: string[];
  eligibilityCriteria: string[];
  complianceDeadlines: string[];
  formTypes: string[];
  governmentFees: number;
  professionalFees: number;
  isActive: boolean;
  complexity: 'basic' | 'standard' | 'premium';
  autoRenewal: boolean;
  dependencies: string[];
  customFields: Record<string, any>;
  pricingTiers: PricingTier[];
}

export interface PricingTier {
  name: string;
  price: number;
  features: string[];
  estimatedDays: number;
  includedServices: string[];
  additionalBenefits: string[];
}

export interface ComboConfiguration {
  id: string;
  name: string;
  description: string;
  triggerServices: string[];
  suggestedServices: string[];
  bundledServices: string[];
  discountPercentage: number;
  fixedDiscount?: number;
  validityDays: number;
  minServiceCount: number;
  maxServiceCount?: number;
  conditions: ComboCondition[];
  isActive: boolean;
  priority: number;
  autoApply: boolean;
}

export interface ComboCondition {
  type: 'turnover' | 'employee_count' | 'company_age' | 'industry' | 'location';
  operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in';
  value: any;
}

export interface WorkflowCustomization {
  id: string;
  workflowId: string;
  stepId: string;
  customization: {
    type: 'add_step' | 'modify_step' | 'remove_step' | 'change_sequence' | 'add_document' | 'modify_deadline';
    data: any;
    reason: string;
    approvedBy: string;
    appliedAt: Date;
  };
}

export interface QualityStandard {
  id: string;
  name: string;
  category: string;
  requirements: QualityRequirement[];
  auditFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  complianceScore: number;
  isActive: boolean;
}

export interface QualityRequirement {
  requirement: string;
  type: 'mandatory' | 'recommended' | 'optional';
  verificationMethod: string;
  documentation: string[];
  deadline: string;
}

export interface RetainershipPlan {
  id: string;
  name: string;
  category: 'basic' | 'standard' | 'premium' | 'enterprise';
  monthlyFee: number;
  includedServices: string[];
  discountPercentage: number;
  maxTransactions: number;
  dedicatedSupport: boolean;
  priorityHandling: boolean;
  customReporting: boolean;
  features: string[];
  terms: string[];
  isActive: boolean;
}

export class AdminEngine {
  private serviceConfigurations: Map<string, ServiceConfiguration> = new Map();
  private combos: Map<string, ComboConfiguration> = new Map();
  private qualityStandards: Map<string, QualityStandard> = new Map();
  private retainershipPlans: Map<string, RetainershipPlan> = new Map();
  private workflowCustomizations: Map<string, WorkflowCustomization> = new Map();

  constructor() {
    this.initializeStandardConfigurations();
    this.initializeQualityStandards();
    this.initializeRetainershipPlans();
  }

  private initializeStandardConfigurations() {
    // Premium Service Configurations
    const premiumIncorporation: ServiceConfiguration = {
      id: 'pvt-ltd-incorporation-premium',
      name: 'Private Limited Company Incorporation (Premium)',
      category: 'incorporation',
      type: 'private_limited',
      basePrice: 15000,
      premiumPrice: 25000,
      estimatedDays: 10,
      description: 'Premium incorporation service with dedicated CA support and expedited processing',
      requiredDocs: ['directors_kyc', 'registered_office_proof', 'moa_aoa_draft'],
      eligibilityCriteria: ['Minimum 2 directors', 'Valid PAN cards', 'Address proof not older than 2 months'],
      complianceDeadlines: ['Name approval within 3 days', 'Incorporation within 10 days'],
      formTypes: ['SPICE+ Part A', 'SPICE+ Part B', 'INC-20A'],
      governmentFees: 4000,
      professionalFees: 21000,
      isActive: true,
      complexity: 'premium',
      autoRenewal: false,
      dependencies: [],
      customFields: {
        expeditedProcessing: true,
        dedicatedCA: true,
        prioritySupport: true,
        digitalCertificates: true
      },
      pricingTiers: [
        {
          name: 'Basic',
          price: 15000,
          features: ['Standard processing', 'Basic support', 'Digital certificates'],
          estimatedDays: 15,
          includedServices: ['name_reservation', 'incorporation_filing', 'inc20a'],
          additionalBenefits: []
        },
        {
          name: 'Premium',
          price: 25000,
          features: ['Expedited processing', 'Dedicated CA', 'Priority support', 'Free GST registration'],
          estimatedDays: 10,
          includedServices: ['name_reservation', 'incorporation_filing', 'inc20a', 'gst_registration'],
          additionalBenefits: ['Free bank account opening assistance', '1-year compliance calendar']
        }
      ]
    };

    const monthlyCompliancePremium: ServiceConfiguration = {
      id: 'monthly-compliance-premium',
      name: 'Monthly Compliance Management (Premium)',
      category: 'monthly_compliance',
      type: 'recurring_monthly',
      basePrice: 8000,
      premiumPrice: 15000,
      estimatedDays: 5,
      description: 'Comprehensive monthly compliance with dedicated team and real-time monitoring',
      requiredDocs: ['salary_register', 'purchase_sales_data', 'bank_statements'],
      eligibilityCriteria: ['Active GST registration', 'Employee strength > 5'],
      complianceDeadlines: ['TDS by 7th', 'GST by 20th', 'PF/ESI by 15th'],
      formTypes: ['GSTR-1', 'GSTR-3B', 'TDS Returns', 'PF Returns'],
      governmentFees: 500,
      professionalFees: 14500,
      isActive: true,
      complexity: 'premium',
      autoRenewal: true,
      dependencies: ['gst_registration', 'pf_registration'],
      customFields: {
        realTimeMonitoring: true,
        dedicatedAccountManager: true,
        customDashboard: true,
        alertsEnabled: true
      },
      pricingTiers: [
        {
          name: 'Standard',
          price: 8000,
          features: ['Basic monthly filings', 'Email support'],
          estimatedDays: 7,
          includedServices: ['gst_returns', 'tds_filing', 'pf_esi'],
          additionalBenefits: []
        },
        {
          name: 'Premium',
          price: 15000,
          features: ['Real-time monitoring', 'Dedicated manager', 'Custom reports', 'Priority support'],
          estimatedDays: 5,
          includedServices: ['gst_returns', 'tds_filing', 'pf_esi', 'bookkeeping', 'compliance_dashboard'],
          additionalBenefits: ['Monthly compliance health score', 'Proactive alerts', 'Tax optimization advice']
        }
      ]
    };

    this.serviceConfigurations.set(premiumIncorporation.id, premiumIncorporation);
    this.serviceConfigurations.set(monthlyCompliancePremium.id, monthlyCompliancePremium);
  }

  private initializeQualityStandards() {
    const incorporationQuality: QualityStandard = {
      id: 'incorporation-quality-standard',
      name: 'Incorporation Quality Assurance',
      category: 'incorporation',
      requirements: [
        {
          requirement: 'Document verification within 24 hours',
          type: 'mandatory',
          verificationMethod: 'Digital verification with CA signature',
          documentation: ['verification_certificate', 'ca_sign_off'],
          deadline: '1 day from submission'
        },
        {
          requirement: 'Name availability check with 3 alternatives',
          type: 'mandatory',
          verificationMethod: 'MCA database search',
          documentation: ['name_search_report'],
          deadline: 'Same day'
        },
        {
          requirement: 'DSC procurement and verification',
          type: 'mandatory',
          verificationMethod: 'Government portal validation',
          documentation: ['dsc_certificates', 'validation_report'],
          deadline: '2 days from document submission'
        }
      ],
      auditFrequency: 'weekly',
      complianceScore: 98.5,
      isActive: true
    };

    this.qualityStandards.set(incorporationQuality.id, incorporationQuality);
  }

  private initializeRetainershipPlans() {
    const enterpriseRetainer: RetainershipPlan = {
      id: 'enterprise-retainer',
      name: 'Enterprise Compliance Retainer',
      category: 'enterprise',
      monthlyFee: 50000,
      includedServices: [
        'monthly_compliance_premium',
        'quarterly_reviews',
        'annual_compliance',
        'audit_support',
        'tax_planning'
      ],
      discountPercentage: 25,
      maxTransactions: 1000,
      dedicatedSupport: true,
      priorityHandling: true,
      customReporting: true,
      features: [
        'Dedicated compliance team',
        'Real-time compliance dashboard',
        'Monthly compliance health reports',
        'Proactive regulatory updates',
        'Priority filing and responses',
        'Custom workflow automation',
        'Advanced analytics and insights'
      ],
      terms: [
        '12-month minimum commitment',
        '30-day notice for plan changes',
        'Dedicated account manager included',
        'SLA-backed response times'
      ],
      isActive: true
    };

    this.retainershipPlans.set(enterpriseRetainer.id, enterpriseRetainer);
  }

  // Service Configuration Management
  createServiceConfiguration(config: Omit<ServiceConfiguration, 'id'>): ServiceConfiguration {
    const id = `SVC-${Date.now()}`;
    const fullConfig: ServiceConfiguration = { ...config, id };
    this.serviceConfigurations.set(id, fullConfig);
    return fullConfig;
  }

  updateServiceConfiguration(id: string, updates: Partial<ServiceConfiguration>): ServiceConfiguration | null {
    const existing = this.serviceConfigurations.get(id);
    if (!existing) return null;
    
    const updated = { ...existing, ...updates };
    this.serviceConfigurations.set(id, updated);
    return updated;
  }

  getServiceConfiguration(id: string): ServiceConfiguration | null {
    return this.serviceConfigurations.get(id) || null;
  }

  getAllServiceConfigurations(): ServiceConfiguration[] {
    return Array.from(this.serviceConfigurations.values());
  }

  // Intelligent Combo Management
  createComboConfiguration(combo: Omit<ComboConfiguration, 'id'>): ComboConfiguration {
    const id = `COMBO-${Date.now()}`;
    const fullCombo: ComboConfiguration = { ...combo, id };
    this.combos.set(id, fullCombo);
    return fullCombo;
  }

  evaluateComboSuggestions(selectedServices: string[], clientProfile: any): ComboConfiguration[] {
    const applicableCombos = Array.from(this.combos.values())
      .filter(combo => {
        // Check if any trigger services match selected services
        const hasTriggers = combo.triggerServices.some(trigger => 
          selectedServices.includes(trigger)
        );
        
        // Evaluate conditions based on client profile
        const meetsConditions = combo.conditions.every(condition => 
          this.evaluateCondition(condition, clientProfile)
        );
        
        return combo.isActive && hasTriggers && meetsConditions;
      })
      .sort((a, b) => b.priority - a.priority);

    return applicableCombos;
  }

  private evaluateCondition(condition: ComboCondition, profile: any): boolean {
    const value = profile[condition.type];
    
    switch (condition.operator) {
      case 'eq': return value === condition.value;
      case 'gt': return value > condition.value;
      case 'gte': return value >= condition.value;
      case 'lt': return value < condition.value;
      case 'lte': return value <= condition.value;
      case 'in': return condition.value.includes(value);
      case 'not_in': return !condition.value.includes(value);
      default: return false;
    }
  }

  // Quality Assurance Management
  createQualityStandard(standard: Omit<QualityStandard, 'id'>): QualityStandard {
    const id = `QS-${Date.now()}`;
    const fullStandard: QualityStandard = { ...standard, id };
    this.qualityStandards.set(id, fullStandard);
    return fullStandard;
  }

  auditServiceQuality(serviceId: string): QualityAuditResult {
    const standard = this.qualityStandards.get(serviceId);
    if (!standard) {
      return {
        serviceId,
        score: 0,
        issues: ['No quality standard defined'],
        recommendations: ['Define quality standards for this service']
      };
    }

    // Simulate quality audit
    const score = Math.random() * 20 + 80; // 80-100 range
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (score < 90) {
      issues.push('Document processing time exceeds standard');
      recommendations.push('Implement automated document verification');
    }

    if (score < 85) {
      issues.push('Client communication gaps identified');
      recommendations.push('Set up automated status notifications');
    }

    return { serviceId, score, issues, recommendations };
  }

  // Retainership Management
  createRetainershipPlan(plan: Omit<RetainershipPlan, 'id'>): RetainershipPlan {
    const id = `RET-${Date.now()}`;
    const fullPlan: RetainershipPlan = { ...plan, id };
    this.retainershipPlans.set(id, fullPlan);
    return fullPlan;
  }

  calculateRetainershipValue(planId: string, monthlyUsage: number): RetainershipValue {
    const plan = this.retainershipPlans.get(planId);
    if (!plan) throw new Error('Retainership plan not found');

    const standardCost = this.calculateStandardServiceCost(plan.includedServices);
    const retainerSavings = standardCost - plan.monthlyFee;
    const discountValue = standardCost * (plan.discountPercentage / 100);
    const totalValue = retainerSavings + discountValue;

    return {
      planId,
      monthlyFee: plan.monthlyFee,
      standardCost,
      savings: retainerSavings,
      discountValue,
      totalValue,
      roi: (totalValue / plan.monthlyFee) * 100
    };
  }

  private calculateStandardServiceCost(serviceIds: string[]): number {
    return serviceIds.reduce((total, serviceId) => {
      const config = this.serviceConfigurations.get(serviceId);
      return total + (config?.basePrice || 0);
    }, 0);
  }

  // Advanced Analytics
  generateServicePerformanceReport(): ServicePerformanceReport {
    const services = this.getAllServiceConfigurations();
    const totalRevenue = services.reduce((sum, service) => sum + service.basePrice, 0);
    const averageCompletionTime = services.reduce((sum, service) => sum + service.estimatedDays, 0) / services.length;
    
    return {
      totalServices: services.length,
      totalRevenue,
      averageCompletionTime,
      topPerformingServices: services
        .sort((a, b) => b.basePrice - a.basePrice)
        .slice(0, 5)
        .map(s => ({ name: s.name, revenue: s.basePrice })),
      qualityScores: Array.from(this.qualityStandards.values())
        .map(qs => ({ category: qs.category, score: qs.complianceScore }))
    };
  }

  // Workflow Enhancement
  addCustomWorkflowStep(workflowId: string, stepData: any, reason: string): WorkflowCustomization {
    const customization: WorkflowCustomization = {
      id: `CUSTOM-${Date.now()}`,
      workflowId,
      stepId: stepData.id,
      customization: {
        type: 'add_step',
        data: stepData,
        reason,
        approvedBy: 'admin',
        appliedAt: new Date()
      }
    };

    this.workflowCustomizations.set(customization.id, customization);
    return customization;
  }
}

// Supporting Interfaces
export interface QualityAuditResult {
  serviceId: string;
  score: number;
  issues: string[];
  recommendations: string[];
}

export interface RetainershipValue {
  planId: string;
  monthlyFee: number;
  standardCost: number;
  savings: number;
  discountValue: number;
  totalValue: number;
  roi: number;
}

export interface ServicePerformanceReport {
  totalServices: number;
  totalRevenue: number;
  averageCompletionTime: number;
  topPerformingServices: { name: string; revenue: number }[];
  qualityScores: { category: string; score: number }[];
}

export const adminEngine = new AdminEngine();