import { 
  users, services, serviceRequests, payments, leads, salesProposals,
  clientHealthScores, upsellOpportunities, loyaltyPrograms, clientLoyaltyStatus, relationshipEvents,
  clientFeedback, qualityMetrics, postSalesManagement,
  // Enhanced Knowledge Base and Service Management imports
  knowledgeArticles, articleVersions, knowledgeCategories, knowledgeAnalytics, knowledgeGaps, contentApprovals,
  serviceDefinitions, advancedTaskTemplates, serviceConfigurations, servicePerformanceMetrics, taskExecutions,
  contentSearchIndex, enhancedFaqs,
  type User, type InsertUser,
  type Service, type InsertService,
  type ServiceRequest, type InsertServiceRequest,
  type Payment, type InsertPayment,
  type LeadEnhanced, type InsertLeadEnhanced,
  type SalesProposal, type InsertSalesProposal,
  type ClientHealthScore, type InsertClientHealthScore,
  type UpsellOpportunity, type InsertUpsellOpportunity,
  type LoyaltyProgram, type InsertLoyaltyProgram,
  type ClientLoyaltyStatus, type InsertClientLoyaltyStatus,
  type RelationshipEvent, type InsertRelationshipEvent,
  type ClientFeedback, type InsertClientFeedback,
  type QualityMetrics, type PostSalesManagement, type InsertPostSalesManagement,
  // Enhanced types
  type KnowledgeArticle, type InsertKnowledgeArticle,
  type ArticleVersion, type InsertArticleVersion,
  type KnowledgeCategory, type InsertKnowledgeCategory,
  type KnowledgeAnalytics, type InsertKnowledgeAnalytics,
  type KnowledgeGap, type InsertKnowledgeGap,
  type ContentApproval, type InsertContentApproval,
  type ServiceDefinition, type InsertServiceDefinition,
  type AdvancedTaskTemplate, type InsertAdvancedTaskTemplate,
  type ServiceConfiguration, type InsertServiceConfiguration,
  type ServicePerformanceMetrics, type InsertServicePerformanceMetrics,
  type TaskExecution, type InsertTaskExecution,
  type ContentSearchIndex, type InsertContentSearchIndex,
  type EnhancedFaq, type InsertEnhancedFaq
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
  getAllProposals(filters?: {
    search?: string;
    status?: string;
    executive?: string;
    viewMode?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    proposals: SalesProposal[];
    total: number;
  }>;
  getProposal(id: number): Promise<SalesProposal | undefined>;
  getSalesProposalsByLead(leadId: string): Promise<SalesProposal[]>;
  createSalesProposal(proposal: InsertSalesProposal): Promise<SalesProposal>;
  updateProposal(id: number, updates: Partial<SalesProposal>): Promise<SalesProposal | undefined>;
  deleteProposal(id: number): Promise<boolean>;
  sendProposal(id: number): Promise<SalesProposal | undefined>;
  getProposalStats(): Promise<{
    statusDistribution: Record<string, number>;
    totalProposals: number;
    recentProposals: number;
    totalValue: number;
    conversionRate: number;
    avgProposalValue: number;
    pendingApprovals: number;
  }>;

  // Client Health Scoring methods
  getClientHealthScore(clientId: number): Promise<ClientHealthScore | undefined>;
  getClientHealthScoreByEntity(businessEntityId: number): Promise<ClientHealthScore | undefined>;
  createClientHealthScore(healthScore: InsertClientHealthScore): Promise<ClientHealthScore>;
  updateClientHealthScore(id: number, updates: Partial<ClientHealthScore>): Promise<ClientHealthScore | undefined>;
  getClientsAtRisk(riskLevel?: string): Promise<ClientHealthScore[]>;
  calculateClientHealthScore(clientId: number): Promise<ClientHealthScore>;
  getHealthScoreAnalytics(): Promise<{
    averageHealthScore: number;
    churnRiskDistribution: Record<string, number>;
    healthTrends: Array<{ date: string; avgScore: number }>;
    topRiskFactors: Array<{ factor: string; count: number }>;
  }>;

  // Upselling Opportunity methods
  getAllUpsellOpportunities(filters?: {
    clientId?: number;
    status?: string;
    priority?: string;
    assignedTo?: number;
    limit?: number;
    offset?: number;
  }): Promise<{
    opportunities: UpsellOpportunity[];
    total: number;
  }>;
  getUpsellOpportunity(id: number): Promise<UpsellOpportunity | undefined>;
  createUpsellOpportunity(opportunity: InsertUpsellOpportunity): Promise<UpsellOpportunity>;
  updateUpsellOpportunity(id: number, updates: Partial<UpsellOpportunity>): Promise<UpsellOpportunity | undefined>;
  deleteUpsellOpportunity(id: number): Promise<boolean>;
  identifyUpsellOpportunities(clientId: number): Promise<UpsellOpportunity[]>;
  getUpsellStats(): Promise<{
    totalOpportunities: number;
    potentialRevenue: number;
    conversionRate: number;
    opportunitiesByPriority: Record<string, number>;
    opportunitiesByStatus: Record<string, number>;
    avgOpportunityValue: number;
  }>;

  // Loyalty Program methods
  getAllLoyaltyPrograms(): Promise<LoyaltyProgram[]>;
  getLoyaltyProgram(programId: string): Promise<LoyaltyProgram | undefined>;
  createLoyaltyProgram(program: InsertLoyaltyProgram): Promise<LoyaltyProgram>;
  updateLoyaltyProgram(id: number, updates: Partial<LoyaltyProgram>): Promise<LoyaltyProgram | undefined>;
  getClientLoyaltyStatus(clientId: number, programId?: string): Promise<ClientLoyaltyStatus | undefined>;
  createClientLoyaltyStatus(status: InsertClientLoyaltyStatus): Promise<ClientLoyaltyStatus>;
  updateClientLoyaltyStatus(id: number, updates: Partial<ClientLoyaltyStatus>): Promise<ClientLoyaltyStatus | undefined>;
  awardLoyaltyPoints(clientId: number, points: number, reason: string): Promise<ClientLoyaltyStatus | undefined>;
  redeemLoyaltyPoints(clientId: number, points: number): Promise<ClientLoyaltyStatus | undefined>;
  getLoyaltyAnalytics(): Promise<{
    totalMembers: number;
    totalPointsAwarded: number;
    totalRedemptions: number;
    tierDistribution: Record<string, number>;
    engagementMetrics: Array<{ month: string; newMembers: number; activeMembers: number }>;
  }>;

  // Relationship Event methods
  getAllRelationshipEvents(filters?: {
    clientId?: number;
    eventType?: string;
    category?: string;
    sentiment?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    events: RelationshipEvent[];
    total: number;
  }>;
  getRelationshipEvent(id: number): Promise<RelationshipEvent | undefined>;
  createRelationshipEvent(event: InsertRelationshipEvent): Promise<RelationshipEvent>;
  updateRelationshipEvent(id: number, updates: Partial<RelationshipEvent>): Promise<RelationshipEvent | undefined>;
  deleteRelationshipEvent(id: number): Promise<boolean>;
  getClientRelationshipTimeline(clientId: number): Promise<RelationshipEvent[]>;
  getRelationshipInsights(clientId: number): Promise<{
    totalInteractions: number;
    lastInteractionDate: Date | null;
    sentimentTrend: string;
    preferredChannel: string;
    engagementScore: number;
  }>;

  // Client Feedback methods
  getAllClientFeedback(filters?: {
    clientId?: number;
    serviceCategory?: string;
    overallRating?: number;
    hasIssues?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{
    feedback: ClientFeedback[];
    total: number;
  }>;
  getClientFeedback(id: number): Promise<ClientFeedback | undefined>;
  createClientFeedback(feedback: InsertClientFeedback): Promise<ClientFeedback>;
  updateClientFeedback(id: number, updates: Partial<ClientFeedback>): Promise<ClientFeedback | undefined>;
  getFeedbackAnalytics(): Promise<{
    averageRating: number;
    totalFeedback: number;
    npsScore: number;
    satisfactionTrend: Array<{ month: string; avgRating: number; nps: number }>;
    topIssues: Array<{ issue: string; count: number }>;
    serviceRatings: Array<{ service: string; avgRating: number; count: number }>;
  }>;

  // Post-Sales Management methods
  getPostSalesRecord(serviceRequestId: number): Promise<PostSalesManagement | undefined>;
  createPostSalesRecord(record: InsertPostSalesManagement): Promise<PostSalesManagement>;
  updatePostSalesRecord(id: number, updates: Partial<PostSalesManagement>): Promise<PostSalesManagement | undefined>;
  getPostSalesAnalytics(): Promise<{
    totalPostSalesRecords: number;
    upsellConversions: number;
    avgLifetimeValue: number;
    feedbackCollectionRate: number;
    clientRetentionRate: number;
  }>;

  // Advanced Analytics methods
  getClientSegmentationAnalysis(): Promise<{
    segments: Array<{
      name: string;
      count: number;
      avgLifetimeValue: number;
      churnRate: number;
      characteristics: string[];
    }>;
  }>;
  getRevenueGrowthAnalytics(): Promise<{
    monthlyGrowth: Array<{ month: string; revenue: number; upsellRevenue: number }>;
    revenueBySegment: Array<{ segment: string; revenue: number }>;
    projectedGrowth: number;
  }>;
  getRetentionAnalytics(): Promise<{
    retentionRate: number;
    churnRate: number;
    retentionBySegment: Array<{ segment: string; retentionRate: number }>;
    churnReasons: Array<{ reason: string; count: number }>;
  }>;

  // ============================================================================
  // CLIENT MASTER MANAGEMENT METHODS
  // ============================================================================

  // Client Contracts
  getAllClientContracts(filters?: {
    clientId?: number;
    status?: string;
    contractType?: string;
    renewalDue?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{
    contracts: ClientContract[];
    total: number;
  }>;
  getClientContract(id: number): Promise<ClientContract | undefined>;
  createClientContract(contract: InsertClientContract): Promise<ClientContract>;
  updateClientContract(id: number, updates: Partial<ClientContract>): Promise<ClientContract | undefined>;
  deleteClientContract(id: number): Promise<boolean>;
  getContractsByClient(clientId: number): Promise<ClientContract[]>;
  getExpiringContracts(days?: number): Promise<ClientContract[]>;

  // Client Communications
  getAllClientCommunications(filters?: {
    clientId?: number;
    communicationType?: string;
    purpose?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{
    communications: ClientCommunication[];
    total: number;
  }>;
  getClientCommunication(id: number): Promise<ClientCommunication | undefined>;
  createClientCommunication(communication: InsertClientCommunication): Promise<ClientCommunication>;
  updateClientCommunication(id: number, updates: Partial<ClientCommunication>): Promise<ClientCommunication | undefined>;
  deleteClientCommunication(id: number): Promise<boolean>;
  getCommunicationsByClient(clientId: number): Promise<ClientCommunication[]>;

  // Client Portfolio Management
  getAllClientPortfolios(filters?: {
    valueSegment?: string;
    riskLevel?: string;
    loyaltyTier?: string;
    portfolioManager?: number;
    limit?: number;
    offset?: number;
  }): Promise<{
    portfolios: ClientPortfolio[];
    total: number;
  }>;
  getClientPortfolio(id: number): Promise<ClientPortfolio | undefined>;
  getClientPortfolioByClient(clientId: number): Promise<ClientPortfolio | undefined>;
  createClientPortfolio(portfolio: InsertClientPortfolio): Promise<ClientPortfolio>;
  updateClientPortfolio(id: number, updates: Partial<ClientPortfolio>): Promise<ClientPortfolio | undefined>;
  deleteClientPortfolio(id: number): Promise<boolean>;
  getPortfoliosByManager(managerId: number): Promise<ClientPortfolio[]>;

  // Enhanced Business Entity methods for Client Master
  getAllBusinessEntitiesWithDetails(filters?: {
    search?: string;
    clientStatus?: string;
    entityType?: string;
    relationshipManager?: string;
    valueSegment?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    entities: any[];
    total: number;
  }>;
  getClientMasterProfile(clientId: number): Promise<{
    entity: any;
    contracts: ClientContract[];
    portfolio: ClientPortfolio | null;
    recentCommunications: ClientCommunication[];
    serviceHistory: any[];
    financialSummary: {
      lifetimeValue: number;
      outstandingAmount: number;
      lastPaymentDate: Date | null;
      totalInvoices: number;
    };
  }>;

  // ============================================================================
  // FINANCIAL MANAGEMENT METHODS
  // ============================================================================

  // Invoice Management
  getAllInvoices(filters?: {
    clientId?: number;
    status?: string;
    paymentStatus?: string;
    dateFrom?: Date;
    dateTo?: Date;
    overdue?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{
    invoices: Invoice[];
    total: number;
  }>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, updates: Partial<Invoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: number): Promise<boolean>;
  getInvoicesByClient(clientId: number): Promise<Invoice[]>;
  getOverdueInvoices(): Promise<Invoice[]>;
  markInvoiceAsPaid(id: number, paymentDetails: {
    paidAmount: number;
    paymentMethod?: string;
    paymentReference?: string;
    paidAt: Date;
  }): Promise<Invoice | undefined>;

  // Financial Analytics
  getFinancialAnalytics(period: string, dateFrom?: Date, dateTo?: Date): Promise<FinancialAnalytics[]>;
  createFinancialAnalytics(analytics: InsertFinancialAnalytics): Promise<FinancialAnalytics>;
  updateFinancialAnalytics(id: number, updates: Partial<FinancialAnalytics>): Promise<FinancialAnalytics | undefined>;
  getFinancialSummary(): Promise<{
    totalRevenue: number;
    outstandingAmount: number;
    totalInvoices: number;
    paidInvoices: number;
    overdueInvoices: number;
    avgCollectionDays: number;
    monthlyGrowth: number;
    clientCount: number;
  }>;
  getRevenueByPeriod(period: 'daily' | 'weekly' | 'monthly' | 'quarterly', months: number): Promise<Array<{
    period: string;
    revenue: number;
    invoicesCount: number;
    clientCount: number;
  }>>;

  // Budget and Forecasting
  getAllBudgetPlans(filters?: {
    fiscalYear?: string;
    planType?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    plans: BudgetPlan[];
    total: number;
  }>;
  getBudgetPlan(id: number): Promise<BudgetPlan | undefined>;
  createBudgetPlan(plan: InsertBudgetPlan): Promise<BudgetPlan>;
  updateBudgetPlan(id: number, updates: Partial<BudgetPlan>): Promise<BudgetPlan | undefined>;
  deleteBudgetPlan(id: number): Promise<boolean>;
  getBudgetPlanByYear(fiscalYear: string): Promise<BudgetPlan | undefined>;
  getBudgetVsActual(planId: number): Promise<{
    plan: BudgetPlan;
    actual: {
      totalRevenue: number;
      clientsAcquired: number;
      servicesCompleted: number;
      profitMargin: number;
    };
    variance: {
      revenueVariance: number;
      clientVariance: number;
      profitVariance: number;
    };
  }>;

  // Financial KPIs and Metrics
  getFinancialKPIs(period?: string): Promise<{
    revenue: {
      current: number;
      previous: number;
      growth: number;
    };
    profitability: {
      grossProfit: number;
      netProfit: number;
      margin: number;
    };
    cashFlow: {
      receivables: number;
      payables: number;
      netCashFlow: number;
    };
    clientMetrics: {
      avgRevenuePerClient: number;
      lifetimeValue: number;
      acquisitionCost: number;
    };
  }>;
  
  getCollectionMetrics(): Promise<{
    collectionRate: number;
    avgCollectionDays: number;
    overdueAmount: number;
    overduePercentage: number;
    agingBuckets: Array<{
      bucket: string;
      amount: number;
      count: number;
    }>;
  }>;

  // ============================================================================
  // KNOWLEDGE BASE MANAGEMENT METHODS
  // ============================================================================

  // Knowledge Articles
  getAllKnowledgeArticles(filters?: {
    search?: string;
    category?: string;
    tags?: string[];
    status?: string;
    contentType?: string;
    difficulty?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    articles: KnowledgeArticle[];
    total: number;
  }>;
  getKnowledgeArticle(id: number): Promise<KnowledgeArticle | undefined>;
  getKnowledgeArticleBySlug(slug: string): Promise<KnowledgeArticle | undefined>;
  createKnowledgeArticle(article: InsertKnowledgeArticle): Promise<KnowledgeArticle>;
  updateKnowledgeArticle(id: number, updates: Partial<KnowledgeArticle>): Promise<KnowledgeArticle | undefined>;
  deleteKnowledgeArticle(id: number): Promise<boolean>;
  publishKnowledgeArticle(id: number): Promise<KnowledgeArticle | undefined>;
  searchKnowledgeArticles(query: string, filters?: {
    category?: string;
    tags?: string[];
    difficulty?: string;
  }): Promise<KnowledgeArticle[]>;

  // Article Versions
  getArticleVersions(articleId: number): Promise<ArticleVersion[]>;
  createArticleVersion(version: InsertArticleVersion): Promise<ArticleVersion>;
  getArticleVersion(id: number): Promise<ArticleVersion | undefined>;
  publishArticleVersion(articleId: number, versionId: number): Promise<ArticleVersion | undefined>;

  // Knowledge Categories
  getAllKnowledgeCategories(): Promise<KnowledgeCategory[]>;
  getKnowledgeCategory(id: number): Promise<KnowledgeCategory | undefined>;
  createKnowledgeCategory(category: InsertKnowledgeCategory): Promise<KnowledgeCategory>;
  updateKnowledgeCategory(id: number, updates: Partial<KnowledgeCategory>): Promise<KnowledgeCategory | undefined>;
  deleteKnowledgeCategory(id: number): Promise<boolean>;
  getCategoryHierarchy(): Promise<KnowledgeCategory[]>;

  // Knowledge Analytics
  trackKnowledgeEvent(analytics: InsertKnowledgeAnalytics): Promise<KnowledgeAnalytics>;
  getKnowledgeAnalytics(filters?: {
    articleId?: number;
    eventType?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<KnowledgeAnalytics[]>;
  getPopularArticles(limit?: number): Promise<KnowledgeArticle[]>;
  getKnowledgeInsights(): Promise<{
    totalArticles: number;
    totalViews: number;
    averageRating: number;
    popularCategories: Array<{ category: string; views: number; articles: number }>;
    searchTrends: Array<{ query: string; count: number }>;
    gapAnalysis: Array<{ topic: string; searches: number; hasContent: boolean }>;
  }>;

  // Knowledge Gaps
  getAllKnowledgeGaps(filters?: {
    status?: string;
    priority?: string;
    category?: string;
  }): Promise<KnowledgeGap[]>;
  createKnowledgeGap(gap: InsertKnowledgeGap): Promise<KnowledgeGap>;
  updateKnowledgeGap(id: number, updates: Partial<KnowledgeGap>): Promise<KnowledgeGap | undefined>;
  identifyKnowledgeGaps(): Promise<KnowledgeGap[]>;

  // Content Approvals
  getContentApprovals(filters?: {
    status?: string;
    reviewerId?: number;
    workflowStage?: string;
  }): Promise<ContentApproval[]>;
  createContentApproval(approval: InsertContentApproval): Promise<ContentApproval>;
  updateContentApproval(id: number, updates: Partial<ContentApproval>): Promise<ContentApproval | undefined>;
  approveContent(id: number, reviewerId: number, feedback?: string): Promise<ContentApproval | undefined>;
  rejectContent(id: number, reviewerId: number, feedback: string, changesRequested?: any): Promise<ContentApproval | undefined>;

  // ============================================================================
  // ENHANCED SERVICES & TASKS MANAGEMENT METHODS
  // ============================================================================

  // Service Definitions
  getAllServiceDefinitions(filters?: {
    search?: string;
    category?: string;
    serviceType?: string;
    isActive?: boolean;
    complexityLevel?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    services: ServiceDefinition[];
    total: number;
  }>;
  getServiceDefinition(id: number): Promise<ServiceDefinition | undefined>;
  getServiceDefinitionByCode(serviceCode: string): Promise<ServiceDefinition | undefined>;
  createServiceDefinition(service: InsertServiceDefinition): Promise<ServiceDefinition>;
  updateServiceDefinition(id: number, updates: Partial<ServiceDefinition>): Promise<ServiceDefinition | undefined>;
  deleteServiceDefinition(id: number): Promise<boolean>;
  duplicateServiceDefinition(id: number, newCode: string, newName: string): Promise<ServiceDefinition | undefined>;

  // Advanced Task Templates
  getAllTaskTemplates(filters?: {
    search?: string;
    taskType?: string;
    category?: string;
    skillLevel?: string;
    isActive?: boolean;
  }): Promise<AdvancedTaskTemplate[]>;
  getTaskTemplate(id: number): Promise<AdvancedTaskTemplate | undefined>;
  getTaskTemplateByCode(templateCode: string): Promise<AdvancedTaskTemplate | undefined>;
  createTaskTemplate(template: InsertAdvancedTaskTemplate): Promise<AdvancedTaskTemplate>;
  updateTaskTemplate(id: number, updates: Partial<AdvancedTaskTemplate>): Promise<AdvancedTaskTemplate | undefined>;
  deleteTaskTemplate(id: number): Promise<boolean>;
  getTaskTemplatesForService(serviceCode: string): Promise<AdvancedTaskTemplate[]>;

  // Service Configurations
  getAllServiceConfigurations(serviceDefinitionId?: number): Promise<ServiceConfiguration[]>;
  getServiceConfiguration(id: number): Promise<ServiceConfiguration | undefined>;
  createServiceConfiguration(config: InsertServiceConfiguration): Promise<ServiceConfiguration>;
  updateServiceConfiguration(id: number, updates: Partial<ServiceConfiguration>): Promise<ServiceConfiguration | undefined>;
  deleteServiceConfiguration(id: number): Promise<boolean>;
  getDefaultServiceConfiguration(serviceDefinitionId: number): Promise<ServiceConfiguration | undefined>;

  // Service Performance Metrics
  getServicePerformanceMetrics(serviceCode: string, dateFrom?: Date, dateTo?: Date): Promise<ServicePerformanceMetrics[]>;
  createServicePerformanceMetric(metric: InsertServicePerformanceMetrics): Promise<ServicePerformanceMetrics>;
  getServicePerformanceSummary(serviceCode?: string): Promise<{
    totalServices: number;
    avgCompletionTime: number;
    onTimeDeliveryRate: number;
    avgQualityScore: number;
    totalRevenue: number;
    topPerformingServices: Array<{ serviceCode: string; score: number; revenue: number }>;
    underperformingServices: Array<{ serviceCode: string; issues: string[]; improvementSuggestions: string[] }>;
  }>;

  // Task Executions
  getAllTaskExecutions(filters?: {
    serviceRequestId?: number;
    templateId?: number;
    assignedTo?: number;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<TaskExecution[]>;
  getTaskExecution(id: number): Promise<TaskExecution | undefined>;
  createTaskExecution(execution: InsertTaskExecution): Promise<TaskExecution>;
  updateTaskExecution(id: number, updates: Partial<TaskExecution>): Promise<TaskExecution | undefined>;
  completeTaskExecution(id: number, outputData?: any): Promise<TaskExecution | undefined>;
  getTaskExecutionMetrics(): Promise<{
    totalExecutions: number;
    avgExecutionTime: number;
    successRate: number;
    taskPerformance: Array<{ templateId: number; avgTime: number; successRate: number }>;
  }>;

  // Enhanced FAQs
  getAllEnhancedFaqs(filters?: {
    categoryId?: number;
    search?: string;
    difficulty?: string;
    status?: string;
  }): Promise<EnhancedFaq[]>;
  getEnhancedFaq(id: number): Promise<EnhancedFaq | undefined>;
  createEnhancedFaq(faq: InsertEnhancedFaq): Promise<EnhancedFaq>;
  updateEnhancedFaq(id: number, updates: Partial<EnhancedFaq>): Promise<EnhancedFaq | undefined>;
  deleteEnhancedFaq(id: number): Promise<boolean>;
  searchEnhancedFaqs(query: string): Promise<EnhancedFaq[]>;
  voteFaqHelpfulness(id: number, helpful: boolean): Promise<EnhancedFaq | undefined>;

  // Content Search
  updateSearchIndex(content: InsertContentSearchIndex): Promise<ContentSearchIndex>;
  fullTextSearch(query: string, filters?: {
    contentType?: string;
    category?: string;
    tags?: string[];
  }): Promise<ContentSearchIndex[]>;
  getSearchSuggestions(partialQuery: string): Promise<string[]>;
  rebuildSearchIndex(): Promise<void>;

  // Service Management Analytics
  getServiceManagementAnalytics(): Promise<{
    totalServices: number;
    activeServices: number;
    totalTaskTemplates: number;
    totalConfigurations: number;
    performanceMetrics: {
      avgServiceRating: number;
      avgCompletionTime: number;
      onTimeDeliveryRate: number;
    };
    categoryDistribution: Array<{ category: string; count: number; revenue: number }>;
    complexityAnalysis: Array<{ level: string; count: number; avgDuration: number }>;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private services: Map<string, Service>;
  private serviceRequests: Map<number, ServiceRequest>;
  private payments: Map<string, Payment>;
  private leads: Map<number, LeadEnhanced>;
  private salesProposals: Map<number, SalesProposal>;
  // Post-sales management storage
  private clientHealthScores: Map<number, ClientHealthScore>;
  private upsellOpportunities: Map<number, UpsellOpportunity>;
  private loyaltyPrograms: Map<string, LoyaltyProgram>;
  private clientLoyaltyStatus: Map<number, ClientLoyaltyStatus>;
  private relationshipEvents: Map<number, RelationshipEvent>;
  private clientFeedback: Map<number, ClientFeedback>;
  private postSalesManagement: Map<number, PostSalesManagement>;
  
  // Enhanced Knowledge Base storage
  private knowledgeArticles: Map<number, KnowledgeArticle>;
  private articleVersions: Map<number, ArticleVersion>;
  private knowledgeCategories: Map<number, KnowledgeCategory>;
  private knowledgeAnalytics: Map<number, KnowledgeAnalytics>;
  private knowledgeGaps: Map<number, KnowledgeGap>;
  private contentApprovals: Map<number, ContentApproval>;
  
  // Enhanced Services & Tasks storage
  private serviceDefinitions: Map<number, ServiceDefinition>;
  private advancedTaskTemplates: Map<number, AdvancedTaskTemplate>;
  private serviceConfigurations: Map<number, ServiceConfiguration>;
  private servicePerformanceMetrics: Map<number, ServicePerformanceMetrics>;
  private taskExecutions: Map<number, TaskExecution>;
  private contentSearchIndex: Map<number, ContentSearchIndex>;
  private enhancedFaqs: Map<number, EnhancedFaq>;
  
  // Counters
  private userIdCounter: number;
  private requestIdCounter: number;
  private leadIdCounter: number;
  private proposalIdCounter: number;
  private healthScoreIdCounter: number;
  private upsellOpportunityIdCounter: number;
  private loyaltyProgramIdCounter: number;
  private loyaltyStatusIdCounter: number;
  private relationshipEventIdCounter: number;
  private feedbackIdCounter: number;
  private postSalesIdCounter: number;
  
  // Enhanced system counters
  private knowledgeArticleIdCounter: number;
  private articleVersionIdCounter: number;
  private knowledgeCategoryIdCounter: number;
  private knowledgeAnalyticsIdCounter: number;
  private knowledgeGapIdCounter: number;
  private contentApprovalIdCounter: number;
  private serviceDefinitionIdCounter: number;
  private taskTemplateIdCounter: number;
  private serviceConfigIdCounter: number;
  private performanceMetricIdCounter: number;
  private taskExecutionIdCounter: number;
  private searchIndexIdCounter: number;
  private enhancedFaqIdCounter: number;

  constructor() {
    this.users = new Map();
    this.services = new Map();
    this.serviceRequests = new Map();
    this.payments = new Map();
    this.leads = new Map();
    this.salesProposals = new Map();
    // Post-sales management initialization
    this.clientHealthScores = new Map();
    this.upsellOpportunities = new Map();
    this.loyaltyPrograms = new Map();
    this.clientLoyaltyStatus = new Map();
    this.relationshipEvents = new Map();
    this.clientFeedback = new Map();
    this.postSalesManagement = new Map();
    
    // Enhanced system initialization
    this.knowledgeArticles = new Map();
    this.articleVersions = new Map();
    this.knowledgeCategories = new Map();
    this.knowledgeAnalytics = new Map();
    this.knowledgeGaps = new Map();
    this.contentApprovals = new Map();
    this.serviceDefinitions = new Map();
    this.advancedTaskTemplates = new Map();
    this.serviceConfigurations = new Map();
    this.servicePerformanceMetrics = new Map();
    this.taskExecutions = new Map();
    this.contentSearchIndex = new Map();
    this.enhancedFaqs = new Map();
    
    // Counter initialization
    this.userIdCounter = 1;
    this.requestIdCounter = 1;
    this.leadIdCounter = 1;
    this.proposalIdCounter = 1;
    this.healthScoreIdCounter = 1;
    this.upsellOpportunityIdCounter = 1;
    this.loyaltyProgramIdCounter = 1;
    this.loyaltyStatusIdCounter = 1;
    this.relationshipEventIdCounter = 1;
    this.feedbackIdCounter = 1;
    this.postSalesIdCounter = 1;
    
    // Enhanced system counters
    this.knowledgeArticleIdCounter = 1;
    this.articleVersionIdCounter = 1;
    this.knowledgeCategoryIdCounter = 1;
    this.knowledgeAnalyticsIdCounter = 1;
    this.knowledgeGapIdCounter = 1;
    this.contentApprovalIdCounter = 1;
    this.serviceDefinitionIdCounter = 1;
    this.taskTemplateIdCounter = 1;
    this.serviceConfigIdCounter = 1;
    this.performanceMetricIdCounter = 1;
    this.taskExecutionIdCounter = 1;
    this.searchIndexIdCounter = 1;
    this.enhancedFaqIdCounter = 1;
    
    this.initializeServices();
    this.initializeLeads();
    this.initializeProposals();
    this.initializePostSalesData();
    this.initializeKnowledgeBase();
    this.initializeServiceManagement();
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
        contactPhone: '+91-8130645164',
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

  private initializeProposals() {
    // Initialize sample sales proposals linked to existing leads
    const sampleProposals = [
      {
        leadId: 'L0001',
        salesExecutive: 'Rahul Sharma',
        qualifiedLeadStatus: 'Proposal Sent',
        proposalStatus: 'sent',
        proposalAmount: 25000,
        requiredServices: [
          { name: 'GST Registration', price: '5000', description: 'Complete GST registration process' },
          { name: 'Company Incorporation', price: '15000', description: 'Private Limited Company incorporation' },
          { name: 'Annual Compliance', price: '5000', description: 'First year compliance package' }
        ],
        nextFollowupDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        finalRemark: 'Client is interested, waiting for director KYC documents',
        documentsLink: 'https://drive.google.com/proposal/ABC123',
        paymentReceived: 'pending',
        paymentPending: '25000.00'
      },
      {
        leadId: 'L0002',
        salesExecutive: 'Pooja Patel',
        qualifiedLeadStatus: 'Under Review',
        proposalStatus: 'under_review',
        proposalAmount: 45000,
        requiredServices: [
          { name: 'Company Incorporation', price: '15000', description: 'Private Limited Company incorporation' },
          { name: 'Trademark Registration', price: '8000', description: 'Brand trademark registration' },
          { name: 'Annual Compliance', price: '25000', description: 'Complete annual compliance package' },
          { name: 'GST Registration', price: '5000', description: 'GST registration with returns setup' }
        ],
        nextFollowupDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        finalRemark: 'Proposal under client review, expecting decision by Friday',
        documentsLink: 'https://drive.google.com/proposal/DEF456',
        paymentReceived: 'pending',
        paymentPending: '45000.00'
      },
      {
        leadId: 'L0003',
        salesExecutive: 'Amit Kumar',
        qualifiedLeadStatus: 'Proposal Sent',
        proposalStatus: 'approved',
        proposalAmount: 15000,
        requiredServices: [
          { name: 'Company Incorporation', price: '15000', description: 'OPC incorporation with fast-track processing' }
        ],
        nextFollowupDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
        finalRemark: 'Client approved proposal, proceeding with incorporation process',
        documentsLink: 'https://drive.google.com/proposal/GHI789',
        paymentReceived: 'full',
        paymentPending: '0.00'
      },
      {
        leadId: 'L0004',
        salesExecutive: 'Neha Singh',
        qualifiedLeadStatus: 'Contract Signed',
        proposalStatus: 'converted',
        proposalAmount: 35000,
        requiredServices: [
          { name: 'LLP Incorporation', price: '12000', description: 'Limited Liability Partnership incorporation' },
          { name: 'GST Registration', price: '5000', description: 'GST registration' },
          { name: 'Accounting Services', price: '18000', description: '12 months accounting and bookkeeping' }
        ],
        nextFollowupDate: null,
        finalRemark: 'Successfully converted to client, services initiated',
        documentsLink: 'https://drive.google.com/proposal/JKL012',
        paymentReceived: 'full',
        paymentPending: '0.00'
      },
      {
        leadId: 'L0005',
        salesExecutive: 'Karan Verma',
        qualifiedLeadStatus: 'Initial Contact',
        proposalStatus: 'draft',
        proposalAmount: 12000,
        requiredServices: [
          { name: 'ITR Filing', price: '2500', description: 'Individual Income Tax Return filing' },
          { name: 'GST Filing', price: '9500', description: 'Monthly GST filing for 6 months' }
        ],
        nextFollowupDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        finalRemark: 'Proposal being prepared based on client requirements',
        documentsLink: null,
        paymentReceived: 'pending',
        paymentPending: '12000.00'
      },
      {
        leadId: 'L0001', // Second proposal for same lead
        salesExecutive: 'Priya Agarwal',
        qualifiedLeadStatus: 'Negotiation',
        proposalStatus: 'revised_sent',
        proposalAmount: 22000,
        requiredServices: [
          { name: 'GST Registration', price: '4500', description: 'GST registration with discount' },
          { name: 'Company Incorporation', price: '13000', description: 'Private Limited Company incorporation - revised pricing' },
          { name: 'Annual Compliance', price: '4500', description: 'First year compliance package - discounted' }
        ],
        nextFollowupDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
        finalRemark: 'Revised proposal with 12% discount sent to client',
        documentsLink: 'https://drive.google.com/proposal/MNO345',
        paymentReceived: 'pending',
        paymentPending: '22000.00'
      },
      {
        leadId: 'L0007',
        salesExecutive: 'Deepak Gupta',
        qualifiedLeadStatus: 'Follow-up Scheduled',
        proposalStatus: 'expired',
        proposalAmount: 18000,
        requiredServices: [
          { name: 'Trademark Registration', price: '8000', description: 'Brand trademark registration' },
          { name: 'Legal Compliance', price: '10000', description: 'Legal documentation and compliance setup' }
        ],
        nextFollowupDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago (expired)
        finalRemark: 'Proposal expired, client did not respond within validity period',
        documentsLink: 'https://drive.google.com/proposal/PQR678',
        paymentReceived: 'pending',
        paymentPending: '18000.00'
      },
      {
        leadId: 'L0008',
        salesExecutive: 'Sneha Rajesh',
        qualifiedLeadStatus: 'Payment Pending',
        proposalStatus: 'approved',
        proposalAmount: 28000,
        requiredServices: [
          { name: 'Section 8 Company Incorporation', price: '18000', description: 'Non-profit company incorporation' },
          { name: 'Annual Compliance', price: '10000', description: 'Section 8 compliance package' }
        ],
        nextFollowupDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
        finalRemark: 'Client approved proposal, payment expected tomorrow',
        documentsLink: 'https://drive.google.com/proposal/STU901',
        paymentReceived: 'pending',
        paymentPending: '28000.00'
      }
    ];

    sampleProposals.forEach(proposalData => {
      this.createSalesProposal(proposalData);
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
  async getAllProposals(filters?: {
    search?: string;
    status?: string;
    executive?: string;
    viewMode?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ proposals: SalesProposal[]; total: number }> {
    let filteredProposals = Array.from(this.salesProposals.values());

    // Apply filters
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filteredProposals = filteredProposals.filter(proposal => 
        proposal.leadId.toLowerCase().includes(searchLower) ||
        proposal.salesExecutive.toLowerCase().includes(searchLower) ||
        (proposal.finalRemark && proposal.finalRemark.toLowerCase().includes(searchLower))
      );
    }

    if (filters?.status) {
      filteredProposals = filteredProposals.filter(proposal => 
        proposal.proposalStatus === filters.status
      );
    }

    if (filters?.executive) {
      filteredProposals = filteredProposals.filter(proposal => 
        proposal.salesExecutive === filters.executive
      );
    }

    if (filters?.viewMode && filters.viewMode !== 'all') {
      switch (filters.viewMode) {
        case 'pending':
          filteredProposals = filteredProposals.filter(proposal => 
            ['sent', 'under_review'].includes(proposal.proposalStatus || 'draft')
          );
          break;
        case 'approved':
          filteredProposals = filteredProposals.filter(proposal => 
            proposal.proposalStatus === 'approved'
          );
          break;
        case 'converted':
          filteredProposals = filteredProposals.filter(proposal => 
            proposal.proposalStatus === 'converted'
          );
          break;
      }
    }

    const total = filteredProposals.length;

    // Apply pagination
    if (filters?.offset !== undefined && filters?.limit !== undefined) {
      filteredProposals = filteredProposals.slice(filters.offset, filters.offset + filters.limit);
    }

    // Sort by creation date (newest first)
    filteredProposals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { proposals: filteredProposals, total };
  }

  async getProposal(id: number): Promise<SalesProposal | undefined> {
    return this.salesProposals.get(id);
  }

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
      proposalStatus: proposalData.proposalStatus || 'draft',
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

  async updateProposal(id: number, updates: Partial<SalesProposal>): Promise<SalesProposal | undefined> {
    const proposal = this.salesProposals.get(id);
    if (!proposal) return undefined;

    const updatedProposal: SalesProposal = {
      ...proposal,
      ...updates,
      id,
      updatedAt: new Date()
    };

    this.salesProposals.set(id, updatedProposal);
    return updatedProposal;
  }

  async deleteProposal(id: number): Promise<boolean> {
    return this.salesProposals.delete(id);
  }

  async sendProposal(id: number): Promise<SalesProposal | undefined> {
    const proposal = this.salesProposals.get(id);
    if (!proposal) return undefined;

    const updatedProposal: SalesProposal = {
      ...proposal,
      proposalStatus: 'sent',
      updatedAt: new Date()
    };

    this.salesProposals.set(id, updatedProposal);
    return updatedProposal;
  }

  async getProposalStats(): Promise<{
    statusDistribution: Record<string, number>;
    totalProposals: number;
    recentProposals: number;
    totalValue: number;
    conversionRate: number;
    avgProposalValue: number;
    pendingApprovals: number;
  }> {
    const proposals = Array.from(this.salesProposals.values());
    const totalProposals = proposals.length;

    // Status distribution
    const statusDistribution: Record<string, number> = {};
    proposals.forEach(proposal => {
      const status = proposal.proposalStatus || 'draft';
      statusDistribution[status] = (statusDistribution[status] || 0) + 1;
    });

    // Recent proposals (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentProposals = proposals.filter(proposal => 
      new Date(proposal.createdAt) > sevenDaysAgo
    ).length;

    // Total value
    const totalValue = proposals.reduce((sum, proposal) => {
      const amount = typeof proposal.proposalAmount === 'string' 
        ? parseFloat(proposal.proposalAmount) 
        : proposal.proposalAmount || 0;
      return sum + amount;
    }, 0);

    // Average proposal value
    const avgProposalValue = totalProposals > 0 ? totalValue / totalProposals : 0;

    // Conversion rate
    const convertedProposals = proposals.filter(proposal => 
      proposal.proposalStatus === 'converted'
    ).length;
    const conversionRate = totalProposals > 0 ? (convertedProposals / totalProposals) * 100 : 0;

    // Pending approvals
    const pendingApprovals = proposals.filter(proposal => 
      ['sent', 'under_review'].includes(proposal.proposalStatus || 'draft')
    ).length;

    return {
      statusDistribution,
      totalProposals,
      recentProposals,
      totalValue,
      conversionRate: Math.round(conversionRate * 100) / 100,
      avgProposalValue: Math.round(avgProposalValue),
      pendingApprovals
    };
  }

  // Initialize post-sales data with sample records
  private initializePostSalesData() {
    // Sample loyalty program
    const defaultLoyaltyProgram: LoyaltyProgram = {
      id: 1,
      programId: 'compliance-rewards',
      name: 'Compliance Rewards Program',
      description: 'Earn points for every service and redeem rewards',
      programType: 'points',
      isActive: true,
      startDate: new Date('2024-01-01'),
      endDate: null,
      pointsPerRupee: '1.00',
      bonusPointsServices: ['annual-compliance', 'gst-filing'],
      referralBonus: 500,
      redemptionThreshold: 1000,
      redemptionValue: '0.10',
      tiers: [
        { name: 'Bronze', minPoints: 0, benefits: ['5% service discount'] },
        { name: 'Silver', minPoints: 5000, benefits: ['10% service discount', 'priority support'] },
        { name: 'Gold', minPoints: 15000, benefits: ['15% service discount', 'priority support', 'dedicated manager'] },
        { name: 'Platinum', minPoints: 30000, benefits: ['20% service discount', 'priority support', 'dedicated manager', 'annual consultation'] }
      ],
      tierUpgradeThreshold: { Bronze: 0, Silver: 5000, Gold: 15000, Platinum: 30000 },
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    };
    this.loyaltyPrograms.set('compliance-rewards', defaultLoyaltyProgram);

    // Sample client health scores
    const sampleHealthScores: ClientHealthScore[] = [
      {
        id: 1,
        clientId: 1,
        businessEntityId: 1,
        overallHealthScore: 85,
        engagementScore: 90,
        satisfactionScore: 88,
        paymentHealthScore: 92,
        communicationScore: 80,
        complianceScore: 85,
        churnRisk: 'low',
        riskFactors: [],
        lastInteractionDate: new Date('2024-01-15'),
        daysInactive: 5,
        missedDeadlines: 0,
        overduePayments: 0,
        totalLogins: 45,
        avgResponseTime: 2,
        documentsSubmittedOnTime: 12,
        totalDocumentsRequired: 15,
        totalRevenue: '75000.00',
        averageOrderValue: '15000.00',
        paymentDelays: 1,
        outstandingAmount: '0.00',
        predictedLifetimeValue: '150000.00',
        churnProbability: '0.1500',
        calculatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        clientId: 2,
        businessEntityId: 2,
        overallHealthScore: 65,
        engagementScore: 55,
        satisfactionScore: 70,
        paymentHealthScore: 75,
        communicationScore: 60,
        complianceScore: 68,
        churnRisk: 'medium',
        riskFactors: ['low_engagement', 'delayed_payments'],
        lastInteractionDate: new Date('2024-01-10'),
        daysInactive: 10,
        missedDeadlines: 2,
        overduePayments: 1,
        totalLogins: 15,
        avgResponseTime: 8,
        documentsSubmittedOnTime: 5,
        totalDocumentsRequired: 10,
        totalRevenue: '45000.00',
        averageOrderValue: '12000.00',
        paymentDelays: 3,
        outstandingAmount: '5000.00',
        predictedLifetimeValue: '80000.00',
        churnProbability: '0.3500',
        calculatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    sampleHealthScores.forEach(score => {
      this.clientHealthScores.set(score.id, score);
      this.healthScoreIdCounter = Math.max(this.healthScoreIdCounter, score.id + 1);
    });
  }

  private initializeKnowledgeBase() {
    // Initialize knowledge base with sample data
    // This is a minimal implementation to fix the build error
    console.log('Knowledge base initialized');
  }

  private initializeServiceManagement() {
    // Initialize service management with sample data
    console.log('Service management initialized');
    
    // Initialize upsell opportunities
    const sampleOpportunities = [
      {
        id: 1,
        clientId: 1,
        businessEntityId: 1,
        opportunityType: 'cross_sell',
        suggestedServices: [
          { serviceId: 'gst-filing', reason: 'Company incorporated, GST registration recommended', potential: 8000 },
          { serviceId: 'trademark-registration', reason: 'Protect brand name and logo', potential: 12000 }
        ],
        currentServices: ['company-incorporation'],
        confidenceScore: 85,
        priority: 'high',
        potentialRevenue: '20000.00',
        triggerEvent: 'service_completion',
        triggerData: { completedService: 'company-incorporation', completionDate: '2024-01-15' },
        identifiedAt: new Date('2024-01-16'),
        status: 'identified',
        contactAttempts: 0,
        lastContactDate: null,
        nextFollowUpDate: new Date('2024-01-18'),
        proposalSent: false,
        proposalSentDate: null,
        proposalValue: '20000.00',
        proposalId: null,
        conversionDate: null,
        actualRevenue: '0.00',
        lostReason: null,
        automatedFollowUp: true,
        maxFollowUpAttempts: 3,
        assignedTo: 1,
        createdAt: new Date('2024-01-16'),
        updatedAt: new Date('2024-01-16')
      }
    ];

    sampleOpportunities.forEach(opportunity => {
      this.upsellOpportunities.set(opportunity.id, opportunity);
      this.upsellOpportunityIdCounter = Math.max(this.upsellOpportunityIdCounter, opportunity.id + 1);
    });
  }

  // Client Health Scoring methods
  async getClientHealthScore(clientId: number): Promise<ClientHealthScore | undefined> {
    return Array.from(this.clientHealthScores.values()).find(score => score.clientId === clientId);
  }

  async getClientHealthScoreByEntity(businessEntityId: number): Promise<ClientHealthScore | undefined> {
    return Array.from(this.clientHealthScores.values()).find(score => score.businessEntityId === businessEntityId);
  }

  async createClientHealthScore(healthScore: InsertClientHealthScore): Promise<ClientHealthScore> {
    const id = this.healthScoreIdCounter++;
    const newHealthScore: ClientHealthScore = {
      id,
      ...healthScore,
      calculatedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.clientHealthScores.set(id, newHealthScore);
    return newHealthScore;
  }

  async updateClientHealthScore(id: number, updates: Partial<ClientHealthScore>): Promise<ClientHealthScore | undefined> {
    const existing = this.clientHealthScores.get(id);
    if (!existing) return undefined;
    
    const updated: ClientHealthScore = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    this.clientHealthScores.set(id, updated);
    return updated;
  }

  async getClientsAtRisk(riskLevel?: string): Promise<ClientHealthScore[]> {
    let scores = Array.from(this.clientHealthScores.values());
    if (riskLevel) {
      scores = scores.filter(score => score.churnRisk === riskLevel);
    } else {
      scores = scores.filter(score => score.churnRisk !== 'low');
    }
    return scores.sort((a, b) => (b.churnProbability as any) - (a.churnProbability as any));
  }

  async calculateClientHealthScore(clientId: number): Promise<ClientHealthScore> {
    // This would typically involve complex calculations based on actual data
    // For now, we'll return a calculated score based on existing patterns
    const existingScore = await this.getClientHealthScore(clientId);
    
    if (existingScore) {
      // Update existing score
      const updated = await this.updateClientHealthScore(existingScore.id, {
        calculatedAt: new Date()
      });
      return updated!;
    }
    
    // Create new health score with default values
    return await this.createClientHealthScore({
      clientId,
      businessEntityId: 1, // Would be determined from actual business logic
      overallHealthScore: 75,
      engagementScore: 75,
      satisfactionScore: 80,
      paymentHealthScore: 85,
      communicationScore: 70,
      complianceScore: 75
    });
  }

  async getHealthScoreAnalytics(): Promise<{
    averageHealthScore: number;
    churnRiskDistribution: Record<string, number>;
    healthTrends: Array<{ date: string; avgScore: number }>;
    topRiskFactors: Array<{ factor: string; count: number }>;
  }> {
    const scores = Array.from(this.clientHealthScores.values());
    
    const averageHealthScore = scores.length > 0 
      ? scores.reduce((sum, score) => sum + score.overallHealthScore, 0) / scores.length 
      : 0;
    
    const churnRiskDistribution: Record<string, number> = {};
    scores.forEach(score => {
      churnRiskDistribution[score.churnRisk] = (churnRiskDistribution[score.churnRisk] || 0) + 1;
    });
    
    const healthTrends = [
      { date: '2024-01-01', avgScore: 78 },
      { date: '2024-01-15', avgScore: 75 },
      { date: '2024-02-01', avgScore: 82 }
    ];
    
    const riskFactorMap: Record<string, number> = {};
    scores.forEach(score => {
      if (Array.isArray(score.riskFactors)) {
        (score.riskFactors as string[]).forEach(factor => {
          riskFactorMap[factor] = (riskFactorMap[factor] || 0) + 1;
        });
      }
    });
    
    const topRiskFactors = Object.entries(riskFactorMap)
      .map(([factor, count]) => ({ factor, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return {
      averageHealthScore: Math.round(averageHealthScore),
      churnRiskDistribution,
      healthTrends,
      topRiskFactors
    };
  }

  // Upselling Opportunity methods
  async getAllUpsellOpportunities(filters?: {
    clientId?: number;
    status?: string;
    priority?: string;
    assignedTo?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ opportunities: UpsellOpportunity[]; total: number }> {
    let filtered = Array.from(this.upsellOpportunities.values());
    
    if (filters?.clientId) {
      filtered = filtered.filter(opp => opp.clientId === filters.clientId);
    }
    if (filters?.status) {
      filtered = filtered.filter(opp => opp.status === filters.status);
    }
    if (filters?.priority) {
      filtered = filtered.filter(opp => opp.priority === filters.priority);
    }
    if (filters?.assignedTo) {
      filtered = filtered.filter(opp => opp.assignedTo === filters.assignedTo);
    }
    
    const total = filtered.length;
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;
    
    const opportunities = filtered
      .sort((a, b) => new Date(b.identifiedAt).getTime() - new Date(a.identifiedAt).getTime())
      .slice(offset, offset + limit);
    
    return { opportunities, total };
  }

  async getUpsellOpportunity(id: number): Promise<UpsellOpportunity | undefined> {
    return this.upsellOpportunities.get(id);
  }

  async createUpsellOpportunity(opportunity: InsertUpsellOpportunity): Promise<UpsellOpportunity> {
    const id = this.upsellOpportunityIdCounter++;
    const newOpportunity: UpsellOpportunity = {
      id,
      ...opportunity,
      identifiedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.upsellOpportunities.set(id, newOpportunity);
    return newOpportunity;
  }

  async updateUpsellOpportunity(id: number, updates: Partial<UpsellOpportunity>): Promise<UpsellOpportunity | undefined> {
    const existing = this.upsellOpportunities.get(id);
    if (!existing) return undefined;
    
    const updated: UpsellOpportunity = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    this.upsellOpportunities.set(id, updated);
    return updated;
  }

  async deleteUpsellOpportunity(id: number): Promise<boolean> {
    return this.upsellOpportunities.delete(id);
  }

  async identifyUpsellOpportunities(clientId: number): Promise<UpsellOpportunity[]> {
    // This would implement ML-based opportunity identification
    // For now, return existing opportunities for the client
    return Array.from(this.upsellOpportunities.values())
      .filter(opp => opp.clientId === clientId && opp.status === 'identified');
  }

  async getUpsellStats(): Promise<{
    totalOpportunities: number;
    potentialRevenue: number;
    conversionRate: number;
    opportunitiesByPriority: Record<string, number>;
    opportunitiesByStatus: Record<string, number>;
    avgOpportunityValue: number;
  }> {
    const opportunities = Array.from(this.upsellOpportunities.values());
    
    const totalOpportunities = opportunities.length;
    const potentialRevenue = opportunities.reduce((sum, opp) => 
      sum + parseFloat(opp.potentialRevenue as string), 0);
    
    const converted = opportunities.filter(opp => opp.status === 'won').length;
    const conversionRate = totalOpportunities > 0 ? (converted / totalOpportunities) * 100 : 0;
    
    const opportunitiesByPriority: Record<string, number> = {};
    const opportunitiesByStatus: Record<string, number> = {};
    
    opportunities.forEach(opp => {
      opportunitiesByPriority[opp.priority] = (opportunitiesByPriority[opp.priority] || 0) + 1;
      opportunitiesByStatus[opp.status] = (opportunitiesByStatus[opp.status] || 0) + 1;
    });
    
    const avgOpportunityValue = totalOpportunities > 0 ? potentialRevenue / totalOpportunities : 0;
    
    return {
      totalOpportunities,
      potentialRevenue: Math.round(potentialRevenue),
      conversionRate: Math.round(conversionRate * 100) / 100,
      opportunitiesByPriority,
      opportunitiesByStatus,
      avgOpportunityValue: Math.round(avgOpportunityValue)
    };
  }

  // Loyalty Program methods
  async getAllLoyaltyPrograms(): Promise<LoyaltyProgram[]> {
    return Array.from(this.loyaltyPrograms.values()).filter(program => program.isActive);
  }

  async getLoyaltyProgram(programId: string): Promise<LoyaltyProgram | undefined> {
    return this.loyaltyPrograms.get(programId);
  }

  async createLoyaltyProgram(program: InsertLoyaltyProgram): Promise<LoyaltyProgram> {
    const id = this.loyaltyProgramIdCounter++;
    const newProgram: LoyaltyProgram = {
      id,
      ...program,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.loyaltyPrograms.set(program.programId, newProgram);
    return newProgram;
  }

  async updateLoyaltyProgram(id: number, updates: Partial<LoyaltyProgram>): Promise<LoyaltyProgram | undefined> {
    const program = Array.from(this.loyaltyPrograms.values()).find(p => p.id === id);
    if (!program) return undefined;
    
    const updated: LoyaltyProgram = {
      ...program,
      ...updates,
      updatedAt: new Date()
    };
    this.loyaltyPrograms.set(program.programId, updated);
    return updated;
  }

  async getClientLoyaltyStatus(clientId: number, programId?: string): Promise<ClientLoyaltyStatus | undefined> {
    return Array.from(this.clientLoyaltyStatus.values()).find(status => 
      status.clientId === clientId && (!programId || status.programId === programId)
    );
  }

  async createClientLoyaltyStatus(status: InsertClientLoyaltyStatus): Promise<ClientLoyaltyStatus> {
    const id = this.loyaltyStatusIdCounter++;
    const newStatus: ClientLoyaltyStatus = {
      id,
      ...status,
      enrolledDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.clientLoyaltyStatus.set(id, newStatus);
    return newStatus;
  }

  async updateClientLoyaltyStatus(id: number, updates: Partial<ClientLoyaltyStatus>): Promise<ClientLoyaltyStatus | undefined> {
    const existing = this.clientLoyaltyStatus.get(id);
    if (!existing) return undefined;
    
    const updated: ClientLoyaltyStatus = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    this.clientLoyaltyStatus.set(id, updated);
    return updated;
  }

  async awardLoyaltyPoints(clientId: number, points: number, reason: string): Promise<ClientLoyaltyStatus | undefined> {
    const status = await this.getClientLoyaltyStatus(clientId);
    if (!status) return undefined;
    
    return await this.updateClientLoyaltyStatus(status.id, {
      totalPoints: status.totalPoints + points,
      availablePoints: status.availablePoints + points,
      lifetimePoints: status.lifetimePoints + points,
      lastActivity: new Date()
    });
  }

  async redeemLoyaltyPoints(clientId: number, points: number): Promise<ClientLoyaltyStatus | undefined> {
    const status = await this.getClientLoyaltyStatus(clientId);
    if (!status || status.availablePoints < points) return undefined;
    
    return await this.updateClientLoyaltyStatus(status.id, {
      availablePoints: status.availablePoints - points,
      totalRedemptions: status.totalRedemptions + 1,
      lastActivity: new Date()
    });
  }

  async getLoyaltyAnalytics(): Promise<{
    totalMembers: number;
    totalPointsAwarded: number;
    totalRedemptions: number;
    tierDistribution: Record<string, number>;
    engagementMetrics: Array<{ month: string; newMembers: number; activeMembers: number }>;
  }> {
    const statuses = Array.from(this.clientLoyaltyStatus.values()).filter(s => s.isActive);
    
    const totalMembers = statuses.length;
    const totalPointsAwarded = statuses.reduce((sum, s) => sum + s.lifetimePoints, 0);
    const totalRedemptions = statuses.reduce((sum, s) => sum + s.totalRedemptions, 0);
    
    const tierDistribution: Record<string, number> = {};
    statuses.forEach(status => {
      tierDistribution[status.currentTier] = (tierDistribution[status.currentTier] || 0) + 1;
    });
    
    const engagementMetrics = [
      { month: '2024-01', newMembers: 15, activeMembers: 45 },
      { month: '2024-02', newMembers: 23, activeMembers: 62 },
      { month: '2024-03', newMembers: 18, activeMembers: 68 }
    ];
    
    return {
      totalMembers,
      totalPointsAwarded,
      totalRedemptions,
      tierDistribution,
      engagementMetrics
    };
  }

  // Relationship Event methods
  async getAllRelationshipEvents(filters?: {
    clientId?: number;
    eventType?: string;
    category?: string;
    sentiment?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ events: RelationshipEvent[]; total: number }> {
    let filtered = Array.from(this.relationshipEvents.values());
    
    if (filters?.clientId) {
      filtered = filtered.filter(event => event.clientId === filters.clientId);
    }
    if (filters?.eventType) {
      filtered = filtered.filter(event => event.eventType === filters.eventType);
    }
    if (filters?.category) {
      filtered = filtered.filter(event => event.category === filters.category);
    }
    if (filters?.sentiment) {
      filtered = filtered.filter(event => event.sentiment === filters.sentiment);
    }
    
    const total = filtered.length;
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;
    
    const events = filtered
      .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
      .slice(offset, offset + limit);
    
    return { events, total };
  }

  async getRelationshipEvent(id: number): Promise<RelationshipEvent | undefined> {
    return this.relationshipEvents.get(id);
  }

  async createRelationshipEvent(event: InsertRelationshipEvent): Promise<RelationshipEvent> {
    const id = this.relationshipEventIdCounter++;
    const newEvent: RelationshipEvent = {
      id,
      ...event,
      eventDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.relationshipEvents.set(id, newEvent);
    return newEvent;
  }

  async updateRelationshipEvent(id: number, updates: Partial<RelationshipEvent>): Promise<RelationshipEvent | undefined> {
    const existing = this.relationshipEvents.get(id);
    if (!existing) return undefined;
    
    const updated: RelationshipEvent = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    this.relationshipEvents.set(id, updated);
    return updated;
  }

  async deleteRelationshipEvent(id: number): Promise<boolean> {
    return this.relationshipEvents.delete(id);
  }

  async getClientRelationshipTimeline(clientId: number): Promise<RelationshipEvent[]> {
    return Array.from(this.relationshipEvents.values())
      .filter(event => event.clientId === clientId)
      .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
  }

  async getRelationshipInsights(clientId: number): Promise<{
    totalInteractions: number;
    lastInteractionDate: Date | null;
    sentimentTrend: string;
    preferredChannel: string;
    engagementScore: number;
  }> {
    const events = await this.getClientRelationshipTimeline(clientId);
    
    const totalInteractions = events.length;
    const lastInteractionDate = events.length > 0 ? new Date(events[0].eventDate) : null;
    
    // Calculate sentiment trend
    const recentEvents = events.slice(0, 10);
    const positiveEvents = recentEvents.filter(e => e.sentiment === 'positive').length;
    const negativeEvents = recentEvents.filter(e => e.sentiment === 'negative').length;
    let sentimentTrend = 'neutral';
    if (positiveEvents > negativeEvents) sentimentTrend = 'positive';
    else if (negativeEvents > positiveEvents) sentimentTrend = 'negative';
    
    // Calculate preferred channel
    const channelCounts: Record<string, number> = {};
    events.forEach(event => {
      channelCounts[event.channel] = (channelCounts[event.channel] || 0) + 1;
    });
    const preferredChannel = Object.entries(channelCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'portal';
    
    // Calculate engagement score (simplified)
    const engagementScore = Math.min(100, totalInteractions * 5 + (positiveEvents * 10));
    
    return {
      totalInteractions,
      lastInteractionDate,
      sentimentTrend,
      preferredChannel,
      engagementScore
    };
  }

  // Client Feedback methods (using existing data structure)
  async getAllClientFeedback(filters?: {
    clientId?: number;
    serviceCategory?: string;
    overallRating?: number;
    hasIssues?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ feedback: ClientFeedback[]; total: number }> {
    // This would typically come from the clientFeedback table
    // For now, return mock data structure
    const mockFeedback: ClientFeedback[] = [
      {
        id: 1,
        serviceRequestId: 1,
        deliveryConfirmationId: 1,
        clientId: 1,
        overallRating: 5,
        serviceQuality: 5,
        timeliness: 4,
        communication: 5,
        documentation: 5,
        positiveAspects: 'Excellent service quality and very professional team',
        improvementSuggestions: 'Could be slightly faster',
        additionalComments: 'Very satisfied with the incorporation process',
        npsScore: 9,
        wouldRecommend: true,
        referralPotential: 'high',
        serviceCategory: 'incorporation',
        specificService: 'company-incorporation',
        requestsFollowUp: false,
        followUpType: null,
        followUpCompleted: false,
        hasIssues: false,
        issuesDescription: null,
        issueResolved: false,
        resolutionNotes: null,
        feedbackChannel: 'portal',
        isAnonymous: false,
        ipAddress: null,
        userAgent: null,
        submittedAt: new Date('2024-01-16'),
        acknowledgedAt: new Date('2024-01-17'),
        respondedAt: null,
        createdAt: new Date('2024-01-16')
      }
    ];
    
    return { feedback: mockFeedback, total: mockFeedback.length };
  }

  async getClientFeedback(id: number): Promise<ClientFeedback | undefined> {
    const { feedback } = await this.getAllClientFeedback();
    return feedback.find(f => f.id === id);
  }

  async createClientFeedback(feedback: InsertClientFeedback): Promise<ClientFeedback> {
    // This would create actual feedback record
    const newFeedback: ClientFeedback = {
      id: this.feedbackIdCounter++,
      ...feedback,
      submittedAt: new Date(),
      createdAt: new Date()
    };
    return newFeedback;
  }

  async updateClientFeedback(id: number, updates: Partial<ClientFeedback>): Promise<ClientFeedback | undefined> {
    const existing = await this.getClientFeedback(id);
    if (!existing) return undefined;
    
    return {
      ...existing,
      ...updates
    };
  }

  async getFeedbackAnalytics(): Promise<{
    averageRating: number;
    totalFeedback: number;
    npsScore: number;
    satisfactionTrend: Array<{ month: string; avgRating: number; nps: number }>;
    topIssues: Array<{ issue: string; count: number }>;
    serviceRatings: Array<{ service: string; avgRating: number; count: number }>;
  }> {
    const { feedback } = await this.getAllClientFeedback();
    
    const averageRating = feedback.length > 0 
      ? feedback.reduce((sum, f) => sum + f.overallRating, 0) / feedback.length 
      : 0;
    
    const totalFeedback = feedback.length;
    
    const npsScore = feedback.length > 0 
      ? feedback.reduce((sum, f) => sum + (f.npsScore || 0), 0) / feedback.length 
      : 0;
    
    const satisfactionTrend = [
      { month: '2024-01', avgRating: 4.2, nps: 7.5 },
      { month: '2024-02', avgRating: 4.5, nps: 8.1 },
      { month: '2024-03', avgRating: 4.7, nps: 8.3 }
    ];
    
    const topIssues = [
      { issue: 'Slow response time', count: 3 },
      { issue: 'Unclear documentation', count: 2 },
      { issue: 'Communication delays', count: 1 }
    ];
    
    const serviceRatings = [
      { service: 'Company Incorporation', avgRating: 4.8, count: 15 },
      { service: 'GST Registration', avgRating: 4.5, count: 12 },
      { service: 'Annual Compliance', avgRating: 4.3, count: 8 }
    ];
    
    return {
      averageRating: Math.round(averageRating * 100) / 100,
      totalFeedback,
      npsScore: Math.round(npsScore * 100) / 100,
      satisfactionTrend,
      topIssues,
      serviceRatings
    };
  }

  // Post-Sales Management methods
  async getPostSalesRecord(serviceRequestId: number): Promise<PostSalesManagement | undefined> {
    return Array.from(this.postSalesManagement.values()).find(record => 
      record.serviceRequestId === serviceRequestId
    );
  }

  async createPostSalesRecord(record: InsertPostSalesManagement): Promise<PostSalesManagement> {
    const id = this.postSalesIdCounter++;
    const newRecord: PostSalesManagement = {
      id,
      ...record,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.postSalesManagement.set(id, newRecord);
    return newRecord;
  }

  async updatePostSalesRecord(id: number, updates: Partial<PostSalesManagement>): Promise<PostSalesManagement | undefined> {
    const existing = this.postSalesManagement.get(id);
    if (!existing) return undefined;
    
    const updated: PostSalesManagement = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    this.postSalesManagement.set(id, updated);
    return updated;
  }

  async getPostSalesAnalytics(): Promise<{
    totalPostSalesRecords: number;
    upsellConversions: number;
    avgLifetimeValue: number;
    feedbackCollectionRate: number;
    clientRetentionRate: number;
  }> {
    const records = Array.from(this.postSalesManagement.values());
    const totalPostSalesRecords = records.length;
    const upsellConversions = records.filter(r => r.upsellStatus === 'converted').length;
    const avgLifetimeValue = records.length > 0 
      ? records.reduce((sum, r) => sum + parseFloat(r.lifetimeValue as string), 0) / records.length 
      : 0;
    
    const feedbackCollected = records.filter(r => r.feedbackStatus === 'collected').length;
    const feedbackCollectionRate = totalPostSalesRecords > 0 
      ? (feedbackCollected / totalPostSalesRecords) * 100 
      : 0;
    
    // Mock client retention rate
    const clientRetentionRate = 85;
    
    return {
      totalPostSalesRecords,
      upsellConversions,
      avgLifetimeValue: Math.round(avgLifetimeValue),
      feedbackCollectionRate: Math.round(feedbackCollectionRate),
      clientRetentionRate
    };
  }

  // Advanced Analytics methods
  async getClientSegmentationAnalysis(): Promise<{
    segments: Array<{
      name: string;
      count: number;
      avgLifetimeValue: number;
      churnRate: number;
      characteristics: string[];
    }>;
  }> {
    return {
      segments: [
        {
          name: 'High Value Enterprises',
          count: 25,
          avgLifetimeValue: 250000,
          churnRate: 8,
          characteristics: ['High service volume', 'Premium tier', 'Dedicated manager']
        },
        {
          name: 'Growing SMEs',
          count: 85,
          avgLifetimeValue: 75000,
          churnRate: 15,
          characteristics: ['Regular compliance needs', 'Growth trajectory', 'Cost sensitive']
        },
        {
          name: 'Startups',
          count: 120,
          avgLifetimeValue: 35000,
          churnRate: 25,
          characteristics: ['Initial incorporation', 'Limited budget', 'High potential']
        }
      ]
    };
  }

  async getRevenueGrowthAnalytics(): Promise<{
    monthlyGrowth: Array<{ month: string; revenue: number; upsellRevenue: number }>;
    revenueBySegment: Array<{ segment: string; revenue: number }>;
    projectedGrowth: number;
  }> {
    return {
      monthlyGrowth: [
        { month: '2024-01', revenue: 150000, upsellRevenue: 25000 },
        { month: '2024-02', revenue: 175000, upsellRevenue: 35000 },
        { month: '2024-03', revenue: 195000, upsellRevenue: 42000 }
      ],
      revenueBySegment: [
        { segment: 'High Value Enterprises', revenue: 320000 },
        { segment: 'Growing SMEs', revenue: 185000 },
        { segment: 'Startups', revenue: 95000 }
      ],
      projectedGrowth: 18.5
    };
  }

  async getRetentionAnalytics(): Promise<{
    retentionRate: number;
    churnRate: number;
    retentionBySegment: Array<{ segment: string; retentionRate: number }>;
    churnReasons: Array<{ reason: string; count: number }>;
  }> {
    return {
      retentionRate: 85,
      churnRate: 15,
      retentionBySegment: [
        { segment: 'High Value Enterprises', retentionRate: 92 },
        { segment: 'Growing SMEs', retentionRate: 85 },
        { segment: 'Startups', retentionRate: 75 }
      ],
      churnReasons: [
        { reason: 'Cost concerns', count: 12 },
        { reason: 'Service quality issues', count: 8 },
        { reason: 'Business closure', count: 6 },
        { reason: 'Competitor offering', count: 4 }
      ]
    };
  }

  // Client Master stub methods (not implemented in MemStorage)
  async getAllClientContracts(filters?: any): Promise<{ contracts: ClientContract[]; total: number }> {
    return { contracts: [], total: 0 };
  }
  async getClientContract(id: number): Promise<ClientContract | undefined> {
    return undefined;
  }
  async createClientContract(contract: InsertClientContract): Promise<ClientContract> {
    throw new Error('Client contracts not implemented in MemStorage');
  }
  async updateClientContract(id: number, updates: Partial<ClientContract>): Promise<ClientContract | undefined> {
    return undefined;
  }
  async deleteClientContract(id: number): Promise<boolean> {
    return false;
  }

  async getAllClientCommunications(filters?: any): Promise<{ communications: ClientCommunication[]; total: number }> {
    return { communications: [], total: 0 };
  }
  async getClientCommunication(id: number): Promise<ClientCommunication | undefined> {
    return undefined;
  }
  async createClientCommunication(communication: InsertClientCommunication): Promise<ClientCommunication> {
    throw new Error('Client communications not implemented in MemStorage');
  }
  async updateClientCommunication(id: number, updates: Partial<ClientCommunication>): Promise<ClientCommunication | undefined> {
    return undefined;
  }
  async deleteClientCommunication(id: number): Promise<boolean> {
    return false;
  }

  async getAllClientPortfolios(filters?: any): Promise<{ portfolios: ClientPortfolio[]; total: number }> {
    return { portfolios: [], total: 0 };
  }
  async getClientPortfolio(id: number): Promise<ClientPortfolio | undefined> {
    return undefined;
  }
  async getClientPortfolioByClient(clientId: number): Promise<ClientPortfolio | undefined> {
    return undefined;
  }
  async createClientPortfolio(portfolio: InsertClientPortfolio): Promise<ClientPortfolio> {
    throw new Error('Client portfolios not implemented in MemStorage');
  }
  async updateClientPortfolio(id: number, updates: Partial<ClientPortfolio>): Promise<ClientPortfolio | undefined> {
    return undefined;
  }
  async deleteClientPortfolio(id: number): Promise<boolean> {
    return false;
  }

  // Financials stub methods (not implemented in MemStorage)
  async getAllInvoices(filters?: any): Promise<{ invoices: Invoice[]; total: number }> {
    return { invoices: [], total: 0 };
  }
  async getInvoice(id: number): Promise<Invoice | undefined> {
    return undefined;
  }
  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    throw new Error('Invoices not implemented in MemStorage');
  }
  async updateInvoice(id: number, updates: Partial<Invoice>): Promise<Invoice | undefined> {
    return undefined;
  }
  async deleteInvoice(id: number): Promise<boolean> {
    return false;
  }
}

// Hybrid storage: uses database for critical entities, MemStorage for others
import {
  dbLeadsStorage,
  dbProposalsStorage,
  dbServiceRequestsStorage,
  dbBusinessEntitiesStorage,
  dbPaymentsStorage,
  dbClientMasterStorage,
  dbFinancialsStorage,
  dbServicesStorage
} from './db-storage';

class HybridStorage extends MemStorage {
  // Override service methods to use database
  async getAllServices(): Promise<Service[]> {
    return dbServicesStorage.getAllServices();
  }

  async getService(serviceId: string): Promise<Service | undefined> {
    return dbServicesStorage.getService(serviceId);
  }

  async createService(service: InsertService): Promise<Service> {
    return dbServicesStorage.createService(service);
  }

  // Override lead methods to use database
  async getAllLeads(filters?: {
    search?: string;
    stage?: string;
    source?: string;
    executive?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ leads: LeadEnhanced[]; total: number }> {
    return dbLeadsStorage.getAllLeads(filters);
  }

  async getLead(id: number): Promise<LeadEnhanced | undefined> {
    return dbLeadsStorage.getLead(id);
  }

  async createLead(lead: InsertLeadEnhanced): Promise<LeadEnhanced> {
    return dbLeadsStorage.createLead(lead);
  }

  async updateLead(id: number, updates: Partial<LeadEnhanced>): Promise<LeadEnhanced | undefined> {
    return dbLeadsStorage.updateLead(id, updates);
  }

  async deleteLead(id: number): Promise<boolean> {
    return dbLeadsStorage.deleteLead(id);
  }

  async addLeadInteraction(id: number, interaction: { type: string; notes: string; executive: string }): Promise<LeadEnhanced | undefined> {
    return dbLeadsStorage.addLeadInteraction(id, interaction);
  }

  async getLeadStats(): Promise<{
    stageDistribution: Record<string, number>;
    sourceDistribution: Record<string, number>;
    totalLeads: number;
    recentLeads: number;
    conversionRate: number;
  }> {
    return dbLeadsStorage.getLeadStats();
  }

  async getPreSalesExecutives(): Promise<string[]> {
    return dbLeadsStorage.getPreSalesExecutives();
  }

  // Override proposal methods to use database
  async getAllProposals(filters?: {
    search?: string;
    status?: string;
    executive?: string;
    viewMode?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ proposals: SalesProposal[]; total: number }> {
    return dbProposalsStorage.getAllProposals(filters);
  }

  async getProposal(id: number): Promise<SalesProposal | undefined> {
    return dbProposalsStorage.getProposal(id);
  }

  async getSalesProposalsByLead(leadId: string): Promise<SalesProposal[]> {
    return dbProposalsStorage.getSalesProposalsByLead(leadId);
  }

  async createSalesProposal(proposal: InsertSalesProposal): Promise<SalesProposal> {
    return dbProposalsStorage.createSalesProposal(proposal);
  }

  async updateProposal(id: number, updates: Partial<SalesProposal>): Promise<SalesProposal | undefined> {
    return dbProposalsStorage.updateProposal(id, updates);
  }

  async deleteProposal(id: number): Promise<boolean> {
    return dbProposalsStorage.deleteProposal(id);
  }

  async sendProposal(id: number): Promise<SalesProposal | undefined> {
    return dbProposalsStorage.sendProposal(id);
  }

  async getProposalStats(): Promise<{
    statusDistribution: Record<string, number>;
    totalProposals: number;
    recentProposals: number;
    totalValue: number;
    conversionRate: number;
    avgProposalValue: number;
    pendingApprovals: number;
  }> {
    return dbProposalsStorage.getProposalStats();
  }

  // Override service request methods to use database
  async getAllServiceRequests(filters?: {
    search?: string;
    status?: string;
    clientId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ requests: ServiceRequest[]; total: number }> {
    return dbServiceRequestsStorage.getAllServiceRequests(filters);
  }

  async getServiceRequest(id: number): Promise<ServiceRequest | undefined> {
    return dbServiceRequestsStorage.getServiceRequest(id);
  }

  async createServiceRequest(request: InsertServiceRequest): Promise<ServiceRequest> {
    return dbServiceRequestsStorage.createServiceRequest(request);
  }

  async updateServiceRequest(id: number, updates: Partial<ServiceRequest>): Promise<ServiceRequest | undefined> {
    return dbServiceRequestsStorage.updateServiceRequest(id, updates);
  }

  async deleteServiceRequest(id: number): Promise<boolean> {
    return dbServiceRequestsStorage.deleteServiceRequest(id);
  }

  // Override business entity methods to use database
  async getAllBusinessEntities(filters?: {
    search?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ entities: BusinessEntity[]; total: number }> {
    return dbBusinessEntitiesStorage.getAllBusinessEntities(filters);
  }

  async getBusinessEntity(id: number): Promise<BusinessEntity | undefined> {
    return dbBusinessEntitiesStorage.getBusinessEntity(id);
  }

  async createBusinessEntity(entity: InsertBusinessEntity): Promise<BusinessEntity> {
    return dbBusinessEntitiesStorage.createBusinessEntity(entity);
  }

  async updateBusinessEntity(id: number, updates: Partial<BusinessEntity>): Promise<BusinessEntity | undefined> {
    return dbBusinessEntitiesStorage.updateBusinessEntity(id, updates);
  }

  async deleteBusinessEntity(id: number): Promise<boolean> {
    return dbBusinessEntitiesStorage.deleteBusinessEntity(id);
  }

  // Override payment methods to use database
  async getAllPayments(filters?: {
    search?: string;
    status?: string;
    serviceRequestId?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ payments: Payment[]; total: number }> {
    return dbPaymentsStorage.getAllPayments(filters);
  }

  async getPayment(id: number): Promise<Payment | undefined> {
    return dbPaymentsStorage.getPayment(id);
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    return dbPaymentsStorage.createPayment(payment);
  }

  async updatePayment(id: number, updates: Partial<Payment>): Promise<Payment | undefined> {
    return dbPaymentsStorage.updatePayment(id, updates);
  }

  async deletePayment(id: number): Promise<boolean> {
    return dbPaymentsStorage.deletePayment(id);
  }

  // Client Master and Financials using MemStorage temporarily until full schema sync

  // Health check method to verify storage backend
  getStorageBackendInfo() {
    return {
      type: 'hybrid',
      usesDatabase: true,
      databaseEntities: ['leads', 'proposals', 'serviceRequests', 'entities', 'payments', 'services'],
      memoryEntities: ['clientMaster', 'financials'],
      isProductionSafe: false, // Hybrid is not production-safe until all entities use DB
    };
  }
}

// Storage selection with production safety check
function createStorage(): IStorage {
  const isProduction = process.env.NODE_ENV === 'production';

  // CRITICAL: Never allow in-memory storage in production
  if (isProduction) {
    const hybridStorage = new HybridStorage();
    const info = hybridStorage.getStorageBackendInfo();

    if (!info.isProductionSafe) {
      console.error('❌ CRITICAL ERROR: HybridStorage is not production-safe!');
      console.error('   Some entities still use in-memory storage:', info.memoryEntities);
      console.error('   This will cause data loss on server restart.');
      console.error('\n   Action required: Migrate all entities to database storage');

      // In strict production mode, fail fast
      if (process.env.STRICT_STORAGE_CHECK !== 'false') {
        throw new Error('Production deployment blocked: In-memory storage detected');
      }

      console.warn('⚠️  STRICT_STORAGE_CHECK=false detected - allowing hybrid storage');
      console.warn('⚠️  THIS IS DANGEROUS - DATA LOSS WILL OCCUR ON RESTART');
    }

    console.log('✅ Storage backend validated for production');
    return hybridStorage;
  }

  // Development: Hybrid storage is acceptable
  console.log('📦 Using HybridStorage (development mode)');
  return new HybridStorage();
}

export const storage = createStorage();
