import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { Router, Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { GlobalErrorHandler } from "./components/GlobalErrorHandler";
import { queryClient } from "@/lib/queryClient";
import { ChatWidget } from "./components/ChatWidget";
import { CommandPalette } from "./components/CommandPalette";
import { SkeletonPage } from "./components/ui/skeleton-loader";
import { useAuth } from "@/hooks/use-auth";
import { canAccessRoute, getRoleDashboardRoute } from "@/utils/roleBasedRouting";

// Loading component for lazy routes
const PageLoader = () => <SkeletonPage />;

// Lazy load all pages for code splitting
const LandingPageV3 = lazy(() => import("@/pages/v3/LandingPage"));
const UnifiedDashboard = lazy(() => import("./pages/UnifiedDashboard"));
const MobileResponsiveLanding = lazy(() => import("./pages/MobileResponsiveLanding"));
const Login = lazy(() => import("./pages/Login"));
const ClientRegistration = lazy(() => import("./pages/ClientRegistration"));
const LeadManagement = lazy(() => import("./pages/LeadManagement"));
const ServiceRequestUI = lazy(() => import("./pages/ServiceRequestUI"));
const ServiceRequestsHub = lazy(() => import("./pages/ServiceRequestsHub"));
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
// DEPRECATED: Consolidated into SmartStart
// const Onboarding = lazy(() => import("./pages/Onboarding"));
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
// DEPRECATED: AdminPanel, MobileOperationsPanel, MobileAdminPanel - Using refactored versions instead
const SyncDashboard = lazy(() => import("./pages/SyncDashboard"));
const PlatformShowcase = lazy(() => import("./pages/PlatformShowcase"));
const ComplianceTrackerDashboard = lazy(() => import("./pages/ComplianceTrackerDashboard"));
const RetainershipPlans = lazy(() => import("./pages/RetainershipPlans"));
const SmartSuggestionsEngine = lazy(() => import("./pages/SmartSuggestionsEngine"));
const DocumentVault = lazy(() => import("./pages/DocumentVault"));
// DEPRECATED: Consolidated into SmartStart
// const StreamlinedOnboarding = lazy(() => import("./pages/StreamlinedOnboarding"));
const SmartStart = lazy(() => import("./pages/SmartStart"));
const WhatsAppOnboarding = lazy(() => import("./pages/WhatsAppOnboarding"));
const ComplianceScorecard = lazy(() => import("./pages/ComplianceScorecard"));
const ClientServiceCatalog = lazy(() => import("./pages/ClientServiceCatalog"));
const ServiceRequestCreate = lazy(() => import("./pages/ServiceRequestCreate"));
const ServiceRequestDetail = lazy(() => import("./pages/ServiceRequestDetail"));
const ClientComplianceCalendar = lazy(() => import("./pages/ClientComplianceCalendar"));
const ClientProfile = lazy(() => import("./pages/ClientProfile"));
// DEPRECATED: OperationsPanel - Using MobileOperationsPanelRefactored instead
// DEPRECATED: AgentPortal - Consolidated into MobileAgentPortal
const MobileAgentPortal = lazy(() => import("./pages/MobileAgentPortal"));
const MasterBlueprintDashboard = lazy(() => import("./pages/MasterBlueprintDashboard"));
// DEPRECATED: UniversalAdminPanel, UniversalOperationsPanel - Merged into refactored panels
const UniversalLandingPage = lazy(() => import("./pages/UniversalLandingPage"));
const WorkflowImport = lazy(() => import("./pages/WorkflowImport"));
const AdminServiceConfig = lazy(() => import("./pages/AdminServiceConfig"));
const StatusManagement = lazy(() => import("./pages/StatusManagement"));
const OperationsWorkQueue = lazy(() => import("./pages/OperationsWorkQueue"));
const OperationsDocumentReview = lazy(() => import("./pages/OperationsDocumentReview"));
const ClientServicesDashboard = lazy(() => import("./pages/ClientServicesDashboard"));
const ServiceCatalogBrowser = lazy(() => import("./pages/ServiceCatalogBrowser"));
const AdminServicesOverview = lazy(() => import("./pages/AdminServicesOverview"));
const RoleBasedDashboard = lazy(() => import("./pages/RoleBasedDashboard"));
const LeadPipeline = lazy(() => import("./pages/LeadPipeline"));
const ConfigurationManager = lazy(() => import("./pages/ConfigurationManager"));
const ComplianceManagementDashboard = lazy(() => import("./pages/ComplianceManagementDashboard"));
const PreSalesManager = lazy(() => import("./pages/PreSalesManager"));
const QCDashboard = lazy(() => import("./pages/QCDashboard"));
const QCDeliveryHandoff = lazy(() => import("./pages/QCDeliveryHandoff"));
const QualityMetricsDashboard = lazy(() => import("./pages/QualityMetricsDashboard"));
const AccountIndex = lazy(() => import("./pages/portal-v2/AccountIndex"));
const AccountBusinesses = lazy(() => import("./pages/portal-v2/AccountBusinesses"));
const AccountBilling = lazy(() => import("./pages/portal-v2/AccountBilling"));
const AccountDocuments = lazy(() => import("./pages/portal-v2/AccountDocuments"));
const AccountSecurity = lazy(() => import("./pages/portal-v2/AccountSecurity"));
const AccountNotifications = lazy(() => import("./pages/portal-v2/AccountNotifications"));
const WebhookManagement = lazy(() => import("./pages/admin/WebhookManagement"));
const APIKeyManagement = lazy(() => import("./pages/admin/APIKeyManagement"));
const DeliveryConfirmation = lazy(() => import("./pages/DeliveryConfirmation"));
const HRDashboard = lazy(() => import("./pages/HRDashboard"));
const ClientMasterDashboard = lazy(() => import("./pages/ClientMasterDashboard"));
const FinancialManagementDashboard = lazy(() => import("./pages/FinancialManagementDashboard"));
const ExecutiveDashboard = lazy(() => import("./pages/ExecutiveDashboard"));
const BusinessIntelligence = lazy(() => import("./pages/BusinessIntelligence"));
// DEPRECATED: Consolidated into ClientDashboardV3
// const MobileDashboard = lazy(() => import("./pages/MobileDashboard"));
const AgentDashboard = lazy(() => import("./pages/AgentDashboard"));
const AgentLeadManagement = lazy(() => import("./pages/AgentLeadManagement"));
const AgentCommissionTracker = lazy(() => import("./pages/AgentCommissionTracker"));
const AgentPerformance = lazy(() => import("./pages/AgentPerformance"));
const AgentProfileSettings = lazy(() => import("./pages/AgentProfileSettings"));
const CustomerServiceDashboard = lazy(() => import("./pages/CustomerServiceDashboard"));
const ClientSupport = lazy(() => import("./pages/ClientSupport"));
const SuperAdminPortal = lazy(() => import("./pages/SuperAdminPortal"));
const SuperAdminDashboard = lazy(() => import("./pages/super-admin/SuperAdminDashboard"));
const TenantManagement = lazy(() => import("./pages/super-admin/TenantManagement"));
const PricingEngine = lazy(() => import("./pages/super-admin/PricingEngine"));
const CommissionConfig = lazy(() => import("./pages/super-admin/CommissionConfig"));
const SecurityCenter = lazy(() => import("./pages/super-admin/SecurityCenter"));
const Operations = lazy(() => import("./pages/super-admin/Operations"));
const Analytics = lazy(() => import("./pages/super-admin/Analytics"));
const RoleSelection = lazy(() => import("./pages/RoleSelection"));
const LifecycleDashboard = lazy(() => import("./pages/LifecycleDashboard"));
const ComplianceDetail = lazy(() => import("./pages/ComplianceDetail"));
const ServicesDetail = lazy(() => import("./pages/ServicesDetail"));
const DocumentsDetail = lazy(() => import("./pages/DocumentsDetail"));
const FundingDetail = lazy(() => import("./pages/FundingDetail"));
const Timeline = lazy(() => import("./pages/Timeline"));
const NotFound = lazy(() => import("./pages/NotFound"));
const BulkUploadCenter = lazy(() => import("./pages/BulkUploadCenter"));
const DigiComplyWorkflowDashboard = lazy(() => import("./components/DigiComplyWorkflowDashboard"));
const Footer = lazy(() => import("./components/Footer"));
const FounderLiteDashboard = lazy(() => import("./pages/FounderLiteDashboard"));
const MobileClientPortalRefactored = lazy(() => import("./pages/MobileClientPortalRefactored"));
const ClientDashboardV3 = lazy(() => import("@/pages/v3/client/ClientDashboard"));
const MobileOperationsPanelRefactored = lazy(() => import("./pages/MobileOperationsPanelRefactored"));
const MobileAdminPanelRefactored = lazy(() => import("./pages/MobileAdminPanelRefactored"));
const SalesProposalManagerRefactored = lazy(() => import("./pages/SalesProposalManagerRefactored"));
const DevHub = lazy(() => import("./pages/DevHub"));
const PlaybookManagement = lazy(() => import("./pages/customer-success/PlaybookManagement"));
const RenewalPipeline = lazy(() => import("./pages/customer-success/RenewalPipeline"));
const SalesDashboard = lazy(() => import("./pages/sales/SalesDashboard"));
const AuditLogViewer = lazy(() => import("./pages/compliance/AuditLogViewer"));
const DataDeletionRequests = lazy(() => import("./pages/compliance/DataDeletionRequests"));
const AccessReviews = lazy(() => import("./pages/admin/AccessReviews"));
const BlueprintManagement = lazy(() => import("./pages/admin/BlueprintManagement"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUserManagement = lazy(() => import("./pages/admin/AdminUserManagement"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const SecurityIncidents = lazy(() => import("./pages/security/SecurityIncidents"));
const EscalationDashboard = lazy(() => import("./pages/operations/EscalationDashboard"));
const NotificationCenter = lazy(() => import("./pages/notifications/NotificationCenter"));
const MessageCenter = lazy(() => import("./pages/messaging/MessageCenter"));
const CommissionDisputes = lazy(() => import("./pages/agent/CommissionDisputes"));
const AgentKYC = lazy(() => import("./pages/agent/AgentKYC"));
const ComplianceAlertPreferences = lazy(() => import("./pages/client/ComplianceAlertPreferences"));
const ExecutiveSummary = lazy(() => import("./pages/ExecutiveSummary"));

const publicRoutePrefixes = [
  '/',
  '/landing',
  '/login',
  '/signin',
  '/register',
  '/client-registration',
  '/signup',
  '/onboarding',
  '/onboarding-flow',
  '/platform-demo',
  '/select-role',
  '/role-selection',
  '/mobile-landing',
  '/smart-start',
  '/whatsapp-onboarding',
  '/design-system',
  '/universal-landing',
  '/compliance-scorecard',
  '/10k',
];

const isPublicRoute = (path: string) =>
  publicRoutePrefixes.some((route) => path === route || path.startsWith(`${route}/`));

const AppContent = () => {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();

  // Scroll to top and focus main content on route change
  useEffect(() => {
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Focus main content area
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.focus({ preventScroll: true });
    }
  }, [location]);

  // PRODUCTION READY: Full route protection enabled
  useEffect(() => {
    if (isLoading) {
      return;
    }

    const isPublic = isPublicRoute(location);

    // Redirect unauthenticated users to login for protected routes
    if (!isAuthenticated && !isPublic) {
      sessionStorage.setItem('redirectAfterLogin', location);
      setLocation('/login');
      return;
    }

    // Handle authenticated users
    if (isAuthenticated && user?.role) {
      // Redirect away from auth pages to dashboard
      if (['/login', '/signin', '/select-role', '/role-selection'].includes(location)) {
        const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
        if (redirectUrl && canAccessRoute(user.role, redirectUrl)) {
          sessionStorage.removeItem('redirectAfterLogin');
          setLocation(redirectUrl);
        } else {
          setLocation(getRoleDashboardRoute(user.role));
        }
        return;
      }

      // Redirect users who don't have access to the current route
      if (!isPublic && !canAccessRoute(user.role, location)) {
        console.warn(`[RBAC] Access denied for role "${user.role}" to route "${location}"`);
        setLocation(getRoleDashboardRoute(user.role));
      }
    }
  }, [isAuthenticated, isLoading, location, setLocation, user]);

  return (
    <ErrorBoundary>
        <GlobalErrorHandler />
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <CommandPalette />
          <Router>
            <div className="min-h-screen flex flex-col">
              <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded">
                Skip to main content
              </a>
              <main id="main-content" className="flex-grow focus:outline-none" tabIndex={-1}>
                <Suspense fallback={<PageLoader />}>
                  <Switch>
                <Route path="/" component={LandingPageV3} />
                <Route path="/hub" component={DevHub} />
                <Route path="/dev" component={DevHub} />
                <Route path="/landing" component={LandingPageV3} />
                <Route path="/dashboard" component={UnifiedDashboard} />
                <Route path="/my-dashboard" component={RoleBasedDashboard} />
                <Route path="/role-dashboard" component={RoleBasedDashboard} />
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
                <Route path="/lead-pipeline" component={LeadPipeline} />
                <Route path="/pipeline" component={LeadPipeline} />
                <Route path="/crm" component={LeadPipeline} />
                <Route path="/service-requests" component={ServiceRequestsHub} />
                <Route path="/requests" component={ServiceRequestsHub} />
                <Route path="/my-requests" component={ServiceRequestsHub} />
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
                <Route path="/ai-documents" component={AiDocumentPreparation} />
                <Route path="/doc-prep" component={AiDocumentPreparation} />
                <Route path="/document-preparation" component={AiDocumentPreparation} />
                <Route path="/doc-generator" component={AiDocumentPreparation} />
                <Route path="/design-system" component={DesignSystemShowcase} />
                {/* Legacy landing retained for policy pages only */}
                <Route path="/onboarding-flow" component={OnboardingFlow} />
                <Route path="/platform-demo" component={PlatformDemo} />
                <Route path="/compliance-dashboard" component={ComplianceTrackerDashboard} />
                <Route path="/services" component={ClientServiceCatalog} />
                <Route path="/service-catalog" component={ClientServiceCatalog} />
                <Route path="/service-request/create" component={ServiceRequestCreate} />
                <Route path="/service-request/:id" component={ServiceRequestDetail} />
                <Route path="/compliance-calendar" component={ClientComplianceCalendar} />
                <Route path="/compliance-management" component={ComplianceManagementDashboard} />
                <Route path="/compliance-admin" component={ComplianceManagementDashboard} />
                <Route path="/compliance-ops" component={ComplianceManagementDashboard} />
                <Route path="/client-profile" component={ClientProfile} />
                <Route path="/workflow-dashboard" component={DigiComplyWorkflowDashboard} />
                <Route path="/smart-start" component={SmartStart} />
                <Route path="/whatsapp-onboarding" component={WhatsAppOnboarding} />
                <Route path="/10k" component={ComplianceScorecard} />
                <Route path="/compliance-scorecard" component={ComplianceScorecard} />
                <Route path="/lifecycle" component={LifecycleDashboard} />
                <Route path="/lifecycle-dashboard" component={LifecycleDashboard} />
                <Route path="/lifecycle/compliance" component={ComplianceDetail} />
                <Route path="/lifecycle/services" component={ServicesDetail} />
                <Route path="/lifecycle/documents" component={DocumentsDetail} />
                <Route path="/lifecycle/funding" component={FundingDetail} />
                <Route path="/lifecycle/timeline" component={Timeline} />
                <Route path="/lifecycle/compliance" component={ComplianceDetail} />
                <Route path="/lifecycle/services" component={ServicesDetail} />
                <Route path="/portal-v2" component={ClientDashboardV3} />
                <Route path="/portal-v2/account" component={AccountIndex} />
                <Route path="/portal-v2/account/businesses" component={AccountBusinesses} />
                <Route path="/portal-v2/account/billing" component={AccountBilling} />
                <Route path="/portal-v2/account/documents" component={AccountDocuments} />
                <Route path="/portal-v2/account/security" component={AccountSecurity} />
                <Route path="/portal-v2/account/notifications" component={AccountNotifications} />

                {/* Enterprise Admin Routes */}
                <Route path="/admin/webhooks" component={WebhookManagement} />
                <Route path="/admin/api-keys" component={APIKeyManagement} />
                <Route path="/developer/api-keys" component={APIKeyManagement} />
                <Route path="/admin/clients" component={ClientMasterDashboard} />
                <Route path="/admin/users" component={AdminUserManagement} />
                <Route path="/admin/dashboard" component={AdminDashboard} />
                <Route path="/admin/reports" component={AdminReports} />
                <Route path="/admin/workflow-import" component={WorkflowImport} />

                {/* Customer Success Routes */}
                <Route path="/customer-success/playbooks" component={PlaybookManagement} />
                <Route path="/playbooks" component={PlaybookManagement} />
                <Route path="/customer-success/renewals" component={RenewalPipeline} />
                <Route path="/renewals" component={RenewalPipeline} />
                <Route path="/renewal-pipeline" component={RenewalPipeline} />

                {/* Sales Dashboard Routes */}
                <Route path="/sales" component={SalesDashboard} />
                <Route path="/sales/dashboard" component={SalesDashboard} />
                <Route path="/sales/pipeline" component={SalesDashboard} />
                <Route path="/sales/team" component={SalesDashboard} />
                <Route path="/sales/forecasts" component={SalesDashboard} />
                <Route path="/sales/targets" component={SalesDashboard} />

                {/* Audit & Compliance Routes */}
                <Route path="/compliance/audit-log" component={AuditLogViewer} />
                <Route path="/audit-log" component={AuditLogViewer} />
                <Route path="/compliance/data-requests" component={DataDeletionRequests} />
                <Route path="/data-requests" component={DataDeletionRequests} />
                <Route path="/admin/access-reviews" component={AccessReviews} />
                <Route path="/access-reviews" component={AccessReviews} />
                <Route path="/admin/blueprints" component={BlueprintManagement} />
                <Route path="/admin/enterprise" component={BlueprintManagement} />
                <Route path="/enterprise-config" component={BlueprintManagement} />

                {/* Security Incidents Routes */}
                <Route path="/security/incidents" component={SecurityIncidents} />
                <Route path="/incidents" component={SecurityIncidents} />
                <Route path="/security-incidents" component={SecurityIncidents} />

                {/* Escalation Management Routes (Ops Manager) */}
                <Route path="/escalations" component={EscalationDashboard} />
                <Route path="/ops/escalations" component={EscalationDashboard} />
                <Route path="/escalation-dashboard" component={EscalationDashboard} />

                {/* Notification Center (All Roles) */}
                <Route path="/notifications" component={NotificationCenter} />
                <Route path="/notification-center" component={NotificationCenter} />
                <Route path="/alerts" component={NotificationCenter} />

                {/* Messaging Center (Client-Ops Communication) */}
                <Route path="/messages" component={MessageCenter} />
                <Route path="/messaging" component={MessageCenter} />
                <Route path="/conversations" component={MessageCenter} />
                <Route path="/inbox" component={MessageCenter} />

                <Route path="/portal" component={MobileClientPortalRefactored} />
                <Route path="/client-portal" component={MobileClientPortalRefactored} />
                <Route path="/client-portal/entities" component={MobileClientPortalRefactored} />
                <Route path="/client-portal/services" component={ServiceRequestUI} />
                <Route path="/client-portal/documents" component={DocumentVault} />
                <Route path="/operations" component={MobileOperationsPanelRefactored} />
                <Route path="/ops" component={MobileOperationsPanelRefactored} />
                <Route path="/universal-ops" component={MobileOperationsPanelRefactored} />
                {/* CONSOLIDATED: /operations-manager merged into /operations */}
                <Route path="/admin" component={MobileAdminPanelRefactored} />
                <Route path="/admin-control" component={MobileAdminPanelRefactored} />
                <Route path="/blueprint" component={MasterBlueprintDashboard} />
                <Route path="/master-blueprint" component={MasterBlueprintDashboard} />
                {/* CONSOLIDATED: /universal-admin and /universal-ops merged into /admin and /operations */}
                <Route path="/admin-config" component={AdminServiceConfig} />
                <Route path="/status-management" component={StatusManagement} />
                <Route path="/workflow-statuses" component={StatusManagement} />
                <Route path="/work-queue" component={OperationsWorkQueue} />
                <Route path="/ops/work-queue" component={OperationsWorkQueue} />
                <Route path="/operations/work-queue" component={OperationsWorkQueue} />
                <Route path="/operations-queue" component={OperationsWorkQueue} />
                <Route path="/ops/document-review" component={OperationsDocumentReview} />
                <Route path="/operations/document-review" component={OperationsDocumentReview} />
                <Route path="/document-review" component={OperationsDocumentReview} />

                {/* Client Service Tracking */}
                <Route path="/my-services" component={ClientServicesDashboard} />
                <Route path="/client/services" component={ClientServicesDashboard} />
                <Route path="/client/alert-preferences" component={ComplianceAlertPreferences} />
                <Route path="/service-tracker" component={ClientServicesDashboard} />

                {/* Service Catalog Browser (96+ services) */}
                <Route path="/service-catalog" component={ServiceCatalogBrowser} />
                <Route path="/browse-services" component={ServiceCatalogBrowser} />

                {/* Admin Services Management */}
                <Route path="/admin/services" component={AdminServicesOverview} />
                <Route path="/services-management" component={AdminServicesOverview} />
                <Route path="/manage-services" component={AdminServicesOverview} />

                {/* Configuration Management */}
                <Route path="/config" component={ConfigurationManager} />
                <Route path="/configuration" component={ConfigurationManager} />
                <Route path="/admin/config" component={ConfigurationManager} />
                <Route path="/settings" component={ConfigurationManager} />

                <Route path="/workflow-import" component={WorkflowImport} />

                {/* Bulk Upload Routes */}
                <Route path="/bulk-upload" component={BulkUploadCenter} />
                <Route path="/bulk-import" component={BulkUploadCenter} />
                <Route path="/data-import" component={BulkUploadCenter} />
                <Route path="/admin/bulk-upload" component={BulkUploadCenter} />

                <Route path="/pre-sales" component={PreSalesManager} />
                <Route path="/sales-proposals" component={SalesProposalManagerRefactored} />
                <Route path="/qc" component={QCDashboard} />
                <Route path="/qc/queue" component={QCDashboard} />
                <Route path="/qc-dashboard" component={QCDashboard} />
                <Route path="/quality-control" component={QCDashboard} />
                <Route path="/qc-delivery-handoff" component={QCDeliveryHandoff} />
                <Route path="/delivery-handoff" component={QCDeliveryHandoff} />
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
                {/* CONSOLIDATED: Mobile routes redirect to responsive portal-v2 */}
                <Route path="/mobile-dashboard" component={ClientDashboardV3} />
                <Route path="/mobile" component={ClientDashboardV3} />
                <Route path="/command-center" component={ClientDashboardV3} />
                <Route path="/founder" component={FounderLiteDashboard} />
                <Route path="/compliance-state" component={FounderLiteDashboard} />
                <Route path="/executive-summary" component={ExecutiveSummary} />
                <Route path="/investor-summary" component={ExecutiveSummary} />
                <Route path="/compliance-report" component={ExecutiveSummary} />
                <Route path="/agent" component={MobileAgentPortal} />
                <Route path="/agent/dashboard" component={AgentDashboard} />
                <Route path="/agent/leads" component={AgentLeadManagement} />
                <Route path="/agent/clients" component={AgentLeadManagement} />
                <Route path="/agent/commissions" component={AgentCommissionTracker} />
                <Route path="/agent/performance" component={AgentPerformance} />
                <Route path="/agent/profile" component={AgentProfileSettings} />
                <Route path="/agent/disputes" component={CommissionDisputes} />
                <Route path="/agent/kyc" component={AgentKYC} />
                <Route path="/agent/commission-disputes" component={CommissionDisputes} />
                <Route path="/commission-disputes" component={CommissionDisputes} />
                {/* CONSOLIDATED: All agent portal routes point to main agent */}
                <Route path="/agents" component={MobileAgentPortal} />
                <Route path="/agent-portal" component={MobileAgentPortal} />
                <Route path="/partner" component={MobileAgentPortal} />
                <Route path="/partners" component={MobileAgentPortal} />
                <Route path="/customer-service" component={CustomerServiceDashboard} />
                <Route path="/support" component={ClientSupport} />
                <Route path="/help" component={ClientSupport} />
                <Route path="/tickets" component={ClientSupport} />
                <Route path="/super-admin" component={SuperAdminPortal} />
                <Route path="/super-admin/dashboard" component={SuperAdminDashboard} />
                <Route path="/super-admin/tenants" component={TenantManagement} />
                <Route path="/super-admin/pricing" component={PricingEngine} />
                <Route path="/super-admin/commissions" component={CommissionConfig} />
                <Route path="/super-admin/security" component={SecurityCenter} />
                <Route path="/super-admin/operations" component={Operations} />
                <Route path="/super-admin/analytics" component={Analytics} />
                {/* CONSOLIDATED: Single onboarding flow */}
                <Route path="/onboarding" component={SmartStart} />
                <Route path="/streamlined-onboarding" component={SmartStart} />
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

                {/* Legal/Policy Pages - placeholder routes */}
                <Route path="/privacy-policy" component={LandingPage} />
                <Route path="/terms-of-service" component={LandingPage} />
                <Route path="/refund-policy" component={LandingPage} />

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
    </ErrorBoundary>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <GlobalErrorHandler />
      <AppContent />
    </QueryClientProvider>
  );
};

export default App;
