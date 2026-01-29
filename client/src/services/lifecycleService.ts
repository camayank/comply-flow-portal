/**
 * Lifecycle API Service (V2)
 * 
 * Connects to the new V2 lifecycle endpoints:
 * - Dashboard (stage, compliance, funding readiness)
 * - Compliance Detail (checkpoints, gaps, actions)
 * - Services Detail (96-service catalog)
 * - Documents Detail (7 categories, critical docs)
 * - Funding Detail (readiness score, criteria)
 * - Timeline (8-stage lifecycle visualization)
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const V2_BASE = `${API_BASE_URL}/api/v2/lifecycle`;

export interface LifecycleDashboard {
  company: {
    name?: string;
    type?: string;
    industry?: string;
    stage: string;
    age: string;
    stageProgress?: number;
    transition?: {
      nextStage: string;
      readiness: number;
      requirements: string[];
    };
  };
  compliance: {
    status: 'GREEN' | 'AMBER' | 'RED';
    daysSafe: number;
    penaltyExposure?: number;
    nextDeadline?: string;
    stats: {
      compliant: number;
      pending: number;
      overdue: number;
    };
  };
  lifecycle?: {
    currentStage: string;
    stageDescription: string;
    progress: number;
    nextStage: string;
    complianceIntensity: string;
    criticalGaps: {
      compliance: number;
      documentation: number;
    };
  };
  fundingReadiness: {
    score: number;
    breakdown: {
      compliance: number;
      documentation: number;
      governance: number;
      operations?: number;
    };
    status?: string;
    topGaps?: string[];
  };
  services?: {
    total: number;
    subscribed: number;
    categories: number;
  };
  nextAction?: {
    title: string;
    priority: string;
    dueDate: string;
    estimatedTime: number;
  };
  quickActions?: {
    id: string;
    title: string;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    impact: number;
    estimatedTime?: string;
  }[];
  drillDowns?: {
    compliance: string;
    services: string;
    documents: string;
    funding: string;
    timeline: string;
  };
}

export interface ComplianceDetail {
  summary: {
    overallStatus: 'GREEN' | 'AMBER' | 'RED';
    totalCheckpoints: number;
    completedCheckpoints: number;
    upcomingCheckpoints: number;
  };
  monthly: any[];
  quarterly: any[];
  annual: any[];
  riskAnalysis: {
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
  };
}

export interface ServicesDetail {
  summary: {
    stage: string;
    totalRequired: number;
    subscribedRequired: number;
    totalRecommended: number;
    subscribedRecommended: number;
  };
  required: any[];
  recommended: any[];
  gaps: any[];
  nextStagePreview?: {
    stage: string;
    additionalServices: string[];
  };
}

export interface DocumentsDetail {
  summary: {
    totalRequired: number;
    uploaded: number;
    verified: number;
    expiringSoon: number;
    rejected: number;
  };
  byCategory: {
    category: string;
    count: number;
    verified: number;
    documents: any[];
  }[];
  criticalDocuments: {
    documentKey: string;
    name?: string;
    status: 'missing' | 'uploaded' | 'verified' | 'rejected';
    uploaded: boolean;
    verified: boolean;
    expiryDate?: string;
  }[];
  expiringDocuments: any[];
  missingCritical: {
    documentKey: string;
    importance: string;
  }[];
}

export interface FundingDetail {
  overallScore: number;
  status: string;
  scoreBreakdown: {
    compliance: {
      score: number;
      weight: string;
      status: string;
      description: string;
    };
    documentation: {
      score: number;
      weight: string;
      status: string;
      description: string;
    };
    governance: {
      score: number;
      weight: string;
      status: string;
      description: string;
    };
  };
  dueDiligenceChecklist: {
    legal: {
      items: any[];
      completionRate: number;
    };
    financial: {
      items: any[];
      completionRate: number;
    };
    compliance: {
      items: any[];
      completionRate: number;
    };
  };
  criticalGaps: string[];
  recommendations: string[];
  timeline: {
    currentReadiness: number;
    targetReadiness: number;
    estimatedTimeToReady: string;
    milestones: any[];
  };
}

export interface Timeline {
  companyAge: string;
  currentStage: string;
  stages: any[];
  upcomingMilestones: any[];
  history: {
    date: string;
    event: string;
    stage: string;
    duration?: string;
    achievements?: string[];
  }[];
  nextStage: {
    stage: string;
    requirements: {
      category: string;
      items: string[];
      completed: number;
      total: number;
    }[];
  };
}

class LifecycleService {
  /**
   * Get lifecycle dashboard data
   */
  async getDashboard(userId?: string): Promise<LifecycleDashboard> {
    const response = await axios.get(`${V2_BASE}/dashboard`, {
      params: { userId: userId || 'dev-user-123' },
      withCredentials: true
    });
    return response.data;
  }

  /**
   * Get compliance detail
   */
  async getComplianceDetail(userId?: string): Promise<ComplianceDetail> {
    const response = await axios.get(`${V2_BASE}/compliance-detail`, {
      params: { userId: userId || 'dev-user-123' },
      withCredentials: true
    });
    return response.data;
  }

  /**
   * Get services detail
   */
  async getServicesDetail(userId?: string): Promise<ServicesDetail> {
    const response = await axios.get(`${V2_BASE}/services-detail`, {
      params: { userId: userId || 'dev-user-123' },
      withCredentials: true
    });
    return response.data;
  }

  /**
   * Get documents detail
   */
  async getDocumentsDetail(userId?: string): Promise<DocumentsDetail> {
    const response = await axios.get(`${V2_BASE}/documents-detail`, {
      params: { userId: userId || 'dev-user-123' },
      withCredentials: true
    });
    return response.data;
  }

  /**
   * Get funding detail
   */
  async getFundingDetail(userId?: string): Promise<FundingDetail> {
    const response = await axios.get(`${V2_BASE}/funding-detail`, {
      params: { userId: userId || 'dev-user-123' },
      withCredentials: true
    });
    return response.data;
  }

  /**
   * Get timeline
   */
  async getTimeline(userId?: string): Promise<Timeline> {
    const response = await axios.get(`${V2_BASE}/timeline`, {
      params: { userId: userId || 'dev-user-123' },
      withCredentials: true
    });
    return response.data;
  }
}

export const lifecycleService = new LifecycleService();
export default lifecycleService;
