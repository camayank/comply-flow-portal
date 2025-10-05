import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { Router, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { GlobalErrorHandler } from "./components/GlobalErrorHandler";
import { queryClient } from "@/lib/queryClient";
import { ChatWidget } from "./components/ChatWidget";

// Loading component for lazy routes
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

// Lazy load all pages for code splitting
const UnifiedLanding = lazy(() => import("./pages/UnifiedLanding"));
const UnifiedDashboard = lazy(() => import("./pages/UnifiedDashboard"));
const MobileResponsiveLanding = lazy(() => import("./pages/MobileResponsiveLanding"));
const Login = lazy(() => import("./pages/Login"));
const ClientRegistration = lazy(() => import("./pages/ClientRegistration"));
const LeadManagement = lazy(() => import("./pages/LeadManagement"));
const ServiceRequestUI = lazy(() => import("./pages/ServiceRequestUI"));
const ProposalManagement = lazy(() => import("./pages/ProposalManagement"));
const ReferralDashboard = lazy(() => import("./pages/ReferralDashboard"));
const AutoComply = lazy(() => import("./pages/AutoComply"));
const TaxTracker = lazy(() => import("./pages/TaxTracker"));
const DigiScore = lazy(() => import("./pages/DigiScore"));
const TaskManagement = lazy(() => import("./pages/TaskManagement"));
const AiDocumentPreparation = lazy(() => import("./pages/AiDocumentPreparation"));
const DesignSystemShowcase = lazy(() => import("./components/DesignSystemShowcase"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const OnboardingFlow = lazy(() => import("./pages/OnboardingFlow"));
const PlatformDemo = lazy(() => import("./pages/PlatformDemo"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const BusinessType = lazy(() => import("./pages/BusinessType"));
const PackageSelection = lazy(() => import("./pages/PackageSelection"));
const FounderDetails = lazy(() => import("./pages/FounderDetails"));
const IndustryClassification = lazy(() => import("./pages/IndustryClassification"));
const ServiceSelection = lazy(() => import("./pages/ServiceSelection"));
const ServiceFlowDashboard = lazy(() => import("./pages/ServiceFlowDashboard"));
const DocumentUpload = lazy(() => import("./pages/DocumentUpload"));
const ESignAgreements = lazy(() => import("./pages/ESignAgreements"));
const PaymentGateway = lazy(() => import("./pages/PaymentGateway"));
const ComplianceTracker = lazy(() => import("./pages/ComplianceTracker"));
const Confirmation = lazy(() => import("./pages/Confirmation"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const MobileOperationsPanel = lazy(() => import("./pages/MobileOperationsPanel"));
const MobileAdminPanel = lazy(() => import("./pages/MobileAdminPanel"));
const SyncDashboard = lazy(() => import("./pages/SyncDashboard"));
const PlatformShowcase = lazy(() => import("./pages/PlatformShowcase"));
const ComplianceTrackerDashboard = lazy(() => import("./pages/ComplianceTrackerDashboard"));
const RetainershipPlans = lazy(() => import("./pages/RetainershipPlans"));
const SmartSuggestionsEngine = lazy(() => import("./pages/SmartSuggestionsEngine"));
const DocumentVault = lazy(() => import("./pages/DocumentVault"));
const StreamlinedOnboarding = lazy(() => import("./pages/StreamlinedOnboarding"));
const SmartStart = lazy(() => import("./pages/SmartStart"));
const WhatsAppOnboarding = lazy(() => import("./pages/WhatsAppOnboarding"));
const ComplianceScorecard = lazy(() => import("./pages/ComplianceScorecard"));
const ClientPortal = lazy(() => import("./pages/ClientPortal"));
const MobileClientPortal = lazy(() => import("./pages/MobileClientPortal"));
const ClientServiceCatalog = lazy(() => import("./pages/ClientServiceCatalog"));
const ServiceRequestCreate = lazy(() => import("./pages/ServiceRequestCreate"));
const ServiceRequestDetail = lazy(() => import("./pages/ServiceRequestDetail"));
const ClientComplianceCalendar = lazy(() => import("./pages/ClientComplianceCalendar"));
const ClientProfile = lazy(() => import("./pages/ClientProfile"));
const OperationsPanel = lazy(() => import("./pages/OperationsPanel"));
const AgentPortal = lazy(() => import("./pages/AgentPortal"));
const MobileAgentPortal = lazy(() => import("./pages/MobileAgentPortal"));
const MasterBlueprintDashboard = lazy(() => import("./pages/MasterBlueprintDashboard"));
const UniversalAdminPanel = lazy(() => import("./pages/UniversalAdminPanel"));
const UniversalClientPortal = lazy(() => import("./pages/UniversalClientPortal"));
const UniversalOperationsPanel = lazy(() => import("./pages/UniversalOperationsPanel"));
const UniversalLandingPage = lazy(() => import("./pages/UniversalLandingPage"));
const WorkflowImport = lazy(() => import("./pages/WorkflowImport"));
const AdminServiceConfig = lazy(() => import("./pages/AdminServiceConfig"));
const PreSalesManager = lazy(() => import("./pages/PreSalesManager"));
const SalesProposalManager = lazy(() => import("./pages/SalesProposalManager"));
const QCDashboard = lazy(() => import("./pages/QCDashboard"));
const QualityMetricsDashboard = lazy(() => import("./pages/QualityMetricsDashboard"));
const DeliveryConfirmation = lazy(() => import("./pages/DeliveryConfirmation"));
const HRDashboard = lazy(() => import("./pages/HRDashboard"));
const ClientMasterDashboard = lazy(() => import("./pages/ClientMasterDashboard"));
const FinancialManagementDashboard = lazy(() => import("./pages/FinancialManagementDashboard"));
const ExecutiveDashboard = lazy(() => import("./pages/ExecutiveDashboard"));
const BusinessIntelligence = lazy(() => import("./pages/BusinessIntelligence"));
const MobileDashboard = lazy(() => import("./pages/MobileDashboard"));
const AgentDashboard = lazy(() => import("./pages/AgentDashboard"));
const AgentLeadManagement = lazy(() => import("./pages/AgentLeadManagement"));
const AgentCommissionTracker = lazy(() => import("./pages/AgentCommissionTracker"));
const AgentPerformance = lazy(() => import("./pages/AgentPerformance"));
const AgentProfileSettings = lazy(() => import("./pages/AgentProfileSettings"));
const CustomerServiceDashboard = lazy(() => import("./pages/CustomerServiceDashboard"));
const SuperAdminPortal = lazy(() => import("./pages/SuperAdminPortal"));
const RoleSelection = lazy(() => import("./pages/RoleSelection"));
const NotFound = lazy(() => import("./pages/NotFound"));
const DigiComplyWorkflowDashboard = lazy(() => import("./components/DigiComplyWorkflowDashboard"));
const OperationsManager = lazy(() => import("./components/OperationsManager"));
const Footer = lazy(() => import("./components/Footer"));

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <GlobalErrorHandler />
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Router>
          <div className="min-h-screen flex flex-col">
            <main className="flex-grow">
              <Suspense fallback={<PageLoader />}>
                <Switch>
                <Route path="/" component={UnifiedLanding} />
                <Route path="/dashboard" component={UnifiedDashboard} />
                <Route path="/select-role" component={RoleSelection} />
                <Route path="/role-selection" component={RoleSelection} />
                <Route path="/mobile-landing" component={MobileResponsiveLanding} />
                <Route path="/login" component={Login} />
                <Route path="/signin" component={Login} />
                <Route path="/register" component={ClientRegistration} />
                <Route path="/client-registration" component={ClientRegistration} />
                <Route path="/signup" component={ClientRegistration} />
                <Route path="/leads" component={LeadManagement} />
                <Route path="/lead-management" component={LeadManagement} />
                <Route path="/service-requests" component={ServiceRequestUI} />
                <Route path="/requests" component={ServiceRequestUI} />
                <Route path="/my-requests" component={ServiceRequestUI} />
                <Route path="/proposals" component={ProposalManagement} />
                <Route path="/proposal-management" component={ProposalManagement} />
                <Route path="/referrals" component={ReferralDashboard} />
                <Route path="/referral-dashboard" component={ReferralDashboard} />
                <Route path="/wallet" component={ReferralDashboard} />
                <Route path="/autocomply" component={AutoComply} />
                <Route path="/workflows" component={AutoComply} />
                <Route path="/automation" component={AutoComply} />
                <Route path="/taxtracker" component={TaxTracker} />
                <Route path="/tax" component={TaxTracker} />
                <Route path="/tax-management" component={TaxTracker} />
                <Route path="/digiscore" component={DigiScore} />
                <Route path="/compliance-score" component={DigiScore} />
                <Route path="/score" component={DigiScore} />
                <Route path="/tasks" component={TaskManagement} />
                <Route path="/task-management" component={TaskManagement} />
                <Route path="/my-tasks" component={TaskManagement} />
                <Route path="/documents" component={AiDocumentPreparation} />
                <Route path="/ai-documents" component={AiDocumentPreparation} />
                <Route path="/document-preparation" component={AiDocumentPreparation} />
                <Route path="/doc-generator" component={AiDocumentPreparation} />
                <Route path="/design-system" component={DesignSystemShowcase} />
                <Route path="/landing" component={LandingPage} />
                <Route path="/onboarding-flow" component={OnboardingFlow} />
                <Route path="/platform-demo" component={PlatformDemo} />
                <Route path="/compliance-dashboard" component={ComplianceTrackerDashboard} />
                <Route path="/services" component={ClientServiceCatalog} />
                <Route path="/service-catalog" component={ClientServiceCatalog} />
                <Route path="/service-request/create" component={ServiceRequestCreate} />
                <Route path="/service-request/:id" component={ServiceRequestDetail} />
                <Route path="/compliance-calendar" component={ClientComplianceCalendar} />
                <Route path="/client-profile" component={ClientProfile} />
                <Route path="/workflows" component={DigiComplyWorkflowDashboard} />
                <Route path="/smart-start" component={SmartStart} />
                <Route path="/whatsapp-onboarding" component={WhatsAppOnboarding} />
                <Route path="/10k" component={ComplianceScorecard} />
                <Route path="/compliance-scorecard" component={ComplianceScorecard} />
                <Route path="/portal" component={MobileClientPortal} />
                <Route path="/client-portal" component={MobileClientPortal} />
                <Route path="/operations" component={MobileOperationsPanel} />
                <Route path="/ops" component={MobileOperationsPanel} />
                <Route path="/operations-manager" component={OperationsManager} />
                <Route path="/ops-manager" component={OperationsManager} />
                <Route path="/admin" component={MobileAdminPanel} />
                <Route path="/admin-control" component={MobileAdminPanel} />
                <Route path="/blueprint" component={MasterBlueprintDashboard} />
                <Route path="/master-blueprint" component={MasterBlueprintDashboard} />
                <Route path="/universal-admin" component={UniversalAdminPanel} />
                <Route path="/universal-client" component={UniversalClientPortal} />
                <Route path="/universal-ops" component={UniversalOperationsPanel} />
                <Route path="/admin-config" component={AdminServiceConfig} />
                <Route path="/workflow-import" component={WorkflowImport} />
                <Route path="/pre-sales" component={PreSalesManager} />
                <Route path="/proposals" component={SalesProposalManager} />
                <Route path="/sales-proposals" component={SalesProposalManager} />
                <Route path="/qc" component={QCDashboard} />
                <Route path="/qc-dashboard" component={QCDashboard} />
                <Route path="/quality-control" component={QCDashboard} />
                <Route path="/quality-metrics" component={QualityMetricsDashboard} />
                <Route path="/qc-metrics" component={QualityMetricsDashboard} />
                <Route path="/delivery/:deliveryId" component={DeliveryConfirmation} />
                <Route path="/hr" component={HRDashboard} />
                <Route path="/hr-dashboard" component={HRDashboard} />
                <Route path="/human-resources" component={HRDashboard} />
                <Route path="/client-master" component={ClientMasterDashboard} />
                <Route path="/clients" component={ClientMasterDashboard} />
                <Route path="/client-management" component={ClientMasterDashboard} />
                <Route path="/financial-management" component={FinancialManagementDashboard} />
                <Route path="/financials" component={FinancialManagementDashboard} />
                <Route path="/revenue-analytics" component={FinancialManagementDashboard} />
                <Route path="/executive-dashboard" component={ExecutiveDashboard} />
                <Route path="/analytics" component={ExecutiveDashboard} />
                <Route path="/business-intelligence" component={BusinessIntelligence} />
                <Route path="/bi" component={BusinessIntelligence} />
                <Route path="/insights" component={BusinessIntelligence} />
                <Route path="/mobile-dashboard" component={MobileDashboard} />
                <Route path="/mobile" component={MobileDashboard} />
                <Route path="/command-center" component={MobileDashboard} />
                <Route path="/agent" component={MobileAgentPortal} />
                <Route path="/agent/dashboard" component={AgentDashboard} />
                <Route path="/agent/leads" component={AgentLeadManagement} />
                <Route path="/agent/commissions" component={AgentCommissionTracker} />
                <Route path="/agent/performance" component={AgentPerformance} />
                <Route path="/agent/profile" component={AgentProfileSettings} />
                <Route path="/agents" component={AgentPortal} />
                <Route path="/agent-portal" component={AgentPortal} />
                <Route path="/partner" component={AgentPortal} />
                <Route path="/partners" component={AgentPortal} />
                <Route path="/customer-service" component={CustomerServiceDashboard} />
                <Route path="/super-admin" component={SuperAdminPortal} />
                <Route path="/onboarding" component={Onboarding} />
                <Route path="/streamlined-onboarding" component={StreamlinedOnboarding} />
                <Route path="/business-type" component={BusinessType} />
                <Route path="/package-selection" component={PackageSelection} />
                <Route path="/founder-details" component={FounderDetails} />
                <Route path="/industry-classification" component={IndustryClassification} />
                <Route path="/service-flow" component={ServiceFlowDashboard} />
                <Route path="/documents" component={DocumentUpload} />
                <Route path="/document-upload" component={DocumentUpload} />
                <Route path="/esign-agreements" component={ESignAgreements} />
                <Route path="/payment-gateway" component={PaymentGateway} />
                <Route path="/tracker" component={ComplianceTracker} />
                <Route path="/confirmation" component={Confirmation} />
                <Route path="/sync" component={SyncDashboard} />
                <Route path="/excellence" component={PlatformShowcase} />
                <Route path="/retainership" component={RetainershipPlans} />
                <Route path="/suggestions" component={SmartSuggestionsEngine} />
                <Route path="/vault" component={DocumentVault} />
                <Route component={NotFound} />
              </Switch>
              </Suspense>
            </main>
            <Suspense fallback={null}>
              <Footer />
            </Suspense>
            <ChatWidget />
          </div>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
