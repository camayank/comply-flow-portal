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
import { UnifiedLayoutProvider } from "@/layouts";

// Loading component for lazy routes
const PageLoader = () => <SkeletonPage />;

// ============================================================
// LAZY IMPORTS - Organized by Feature Domain
// ============================================================

// --- Shared / Public Pages ---
const LandingPageV3 = lazy(() => import("@/features/shared/pages/LandingPage"));
const NotFound = lazy(() => import("@/features/shared/pages/NotFound"));
const PrivacyPolicy = lazy(() => import("@/features/shared/pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("@/features/shared/pages/TermsOfService"));
const RefundPolicy = lazy(() => import("@/features/shared/pages/RefundPolicy"));
const DevHub = lazy(() => import("@/features/shared/pages/DevHub"));
const TaskManagement = lazy(() => import("@/features/shared/pages/TaskManagement"));
const AiDocumentPreparation = lazy(() => import("@/features/shared/pages/AiDocumentPreparation"));
const PlatformDemo = lazy(() => import("@/features/shared/pages/PlatformDemo"));
const PlatformShowcase = lazy(() => import("@/features/shared/pages/PlatformShowcase"));
const SyncDashboard = lazy(() => import("@/features/shared/pages/SyncDashboard"));
const SmartSuggestionsEngine = lazy(() => import("@/features/shared/pages/SmartSuggestions"));
const WhatsAppOnboarding = lazy(() => import("@/features/shared/pages/WhatsAppOnboarding"));
const KnowledgeBase = lazy(() => import("@/features/shared/pages/KnowledgeBase"));
const DesignSystemShowcase = lazy(() => import("./components/DesignSystemShowcase"));
const DigiComplyWorkflowDashboard = lazy(() => import("./components/DigiComplyWorkflowDashboard"));

// --- Auth Pages ---
const Login = lazy(() => import("@/features/auth/pages/Login"));
const ForgotPassword = lazy(() => import("@/features/auth/pages/ForgotPassword"));
const RoleSelection = lazy(() => import("@/features/auth/pages/RoleSelection"));
const RoleBasedDashboard = lazy(() => import("@/features/auth/pages/RoleBasedDashboard"));

// --- Onboarding Pages ---
const ClientRegistration = lazy(() => import("@/features/onboarding/pages/Registration"));
const OnboardingFlow = lazy(() => import("@/features/onboarding/pages/OnboardingFlow"));
const BusinessType = lazy(() => import("@/features/onboarding/pages/BusinessType"));
const PackageSelection = lazy(() => import("@/features/onboarding/pages/PackageSelection"));
const FounderDetails = lazy(() => import("@/features/onboarding/pages/FounderDetails"));
const IndustryClassification = lazy(() => import("@/features/onboarding/pages/IndustryClassification"));
const ServiceFlowDashboard = lazy(() => import("@/features/onboarding/pages/ServiceFlow"));
const DocumentUpload = lazy(() => import("@/features/onboarding/pages/DocumentUpload"));
const ESignAgreements = lazy(() => import("@/features/onboarding/pages/ESignAgreements"));
const PaymentGateway = lazy(() => import("@/features/onboarding/pages/PaymentGateway"));
const Confirmation = lazy(() => import("@/features/onboarding/pages/Confirmation"));

// --- Client Portal Pages ---
const MobileClientPortalRefactored = lazy(() => import("@/features/client-portal/pages/Dashboard"));
const ClientDashboardV3 = lazy(() => import("@/features/client-portal/pages/DashboardV3"));
const ClientServicesDashboard = lazy(() => import("@/features/client-portal/pages/MyServices"));
const ClientServiceCatalog = lazy(() => import("@/features/client-portal/pages/ServiceCatalog"));
const ServiceCatalogBrowser = lazy(() => import("@/features/client-portal/pages/ServiceCatalogAlt"));
const ServiceRequestUI = lazy(() => import("@/features/client-portal/pages/ServiceRequestUI"));
const ServiceRequestsHub = lazy(() => import("@/features/client-portal/pages/ServiceRequestsHub"));
const ServiceRequestCreate = lazy(() => import("@/features/client-portal/pages/ServiceRequestCreate"));
const ServiceRequestDetail = lazy(() => import("@/features/client-portal/pages/ServiceRequestDetail"));
const ClientComplianceCalendar = lazy(() => import("@/features/client-portal/pages/ComplianceCalendar"));
const ClientProfile = lazy(() => import("@/features/client-portal/pages/Profile"));
const DocumentVault = lazy(() => import("@/features/client-portal/pages/DocumentVault"));
const ReferralDashboard = lazy(() => import("@/features/client-portal/pages/Referrals"));
const RetainershipPlans = lazy(() => import("@/features/client-portal/pages/RetainershipPlans"));
const LifecycleDashboard = lazy(() => import("@/features/client-portal/pages/LifecycleDashboard"));
const ComplianceDetail = lazy(() => import("@/features/compliance/pages/Detail"));
const ServicesDetail = lazy(() => import("@/features/client-portal/pages/ServicesDetail"));
const DocumentsDetail = lazy(() => import("@/features/client-portal/pages/DocumentsDetail"));
const FundingDetail = lazy(() => import("@/features/client-portal/pages/FundingDetail"));
const Timeline = lazy(() => import("@/features/client-portal/pages/Timeline"));
const ClientSupport = lazy(() => import("@/features/client-portal/pages/Support"));
const ComplianceAlertPreferences = lazy(() => import("@/features/client-portal/pages/AlertPreferences"));
const FounderLiteDashboard = lazy(() => import("@/features/client-portal/pages/FounderLite"));

// --- Client Portal Account Pages ---
const AccountIndex = lazy(() => import("@/features/client-portal/pages/account/Index"));
const AccountBusinesses = lazy(() => import("@/features/client-portal/pages/account/Businesses"));
const AccountBilling = lazy(() => import("@/features/client-portal/pages/account/Billing"));
const AccountDocuments = lazy(() => import("@/features/client-portal/pages/account/Documents"));
const AccountSecurity = lazy(() => import("@/features/client-portal/pages/account/Security"));
const AccountNotifications = lazy(() => import("@/features/client-portal/pages/account/Notifications"));

// --- Compliance Pages ---
const AutoComply = lazy(() => import("@/features/compliance/pages/AutoComply"));
const TaxTracker = lazy(() => import("@/features/compliance/pages/TaxTracker"));
const DigiScore = lazy(() => import("@/features/compliance/pages/DigiScore"));
const ComplianceTrackerDashboard = lazy(() => import("@/features/compliance/pages/TrackerDashboard"));
const ComplianceScorecard = lazy(() => import("@/features/compliance/pages/Scorecard"));
const ComplianceManagementDashboard = lazy(() => import("@/features/compliance/pages/ManagementDashboard"));
const AuditLogViewer = lazy(() => import("@/features/compliance/pages/AuditLog"));
const DataDeletionRequests = lazy(() => import("@/features/compliance/pages/DataDeletion"));

// --- Operations Pages ---
const MobileOperationsPanelRefactored = lazy(() => import("@/features/operations/pages/Dashboard"));
const OperationsWorkQueue = lazy(() => import("@/features/operations/pages/WorkQueue"));
const OperationsDocumentReview = lazy(() => import("@/features/operations/pages/DocumentReview"));
const EscalationDashboard = lazy(() => import("@/features/operations/pages/Escalations"));
const OpsCaseDashboard = lazy(() => import("@/features/operations/pages/CaseDashboard"));
const OpsClientDashboard = lazy(() => import("@/features/operations/pages/ClientDashboard"));
const OpsTeamAssignment = lazy(() => import("@/features/operations/pages/TeamAssignment"));
const OpsPerformanceMetrics = lazy(() => import("@/features/operations/pages/PerformanceMetrics"));
const OpsClientCommunicationHub = lazy(() => import("@/features/operations/pages/CommunicationHub"));

// --- Admin Pages ---
const MobileAdminPanelRefactored = lazy(() => import("@/features/admin/pages/Dashboard"));
const AdminDashboardV3 = lazy(() => import("@/features/admin/pages/DashboardV3"));
const AdminUserManagement = lazy(() => import("@/features/admin/pages/UserManagement"));
const AdminReports = lazy(() => import("@/features/admin/pages/Reports"));
const AdminServiceConfig = lazy(() => import("@/features/admin/pages/ServiceConfig"));
const AdminServicesOverview = lazy(() => import("@/features/admin/pages/ServicesOverview"));
const StatusManagement = lazy(() => import("@/features/admin/pages/StatusManagement"));
const ConfigurationManager = lazy(() => import("@/features/admin/pages/Configuration"));
const WorkflowImport = lazy(() => import("@/features/admin/pages/WorkflowImport"));
const BulkUploadCenter = lazy(() => import("@/features/admin/pages/BulkUpload"));
const BlueprintManagement = lazy(() => import("@/features/admin/pages/Blueprints"));
const AccessReviews = lazy(() => import("@/features/admin/pages/AccessReviews"));
const MasterBlueprintDashboard = lazy(() => import("@/features/admin/pages/MasterBlueprint"));
const ClientMasterDashboard = lazy(() => import("@/features/admin/pages/ClientMaster"));
const WebhookManagement = lazy(() => import("@/features/admin/pages/Webhooks"));
const APIKeyManagement = lazy(() => import("@/features/admin/pages/ApiKeys"));

// --- Super Admin Pages ---
const SuperAdminDashboardV3 = lazy(() => import("@/features/super-admin/pages/Dashboard"));
const TenantManagement = lazy(() => import("@/features/super-admin/pages/Tenants"));
const PricingEngine = lazy(() => import("@/features/super-admin/pages/Pricing"));
const CommissionConfig = lazy(() => import("@/features/super-admin/pages/Commissions"));
const SecurityCenter = lazy(() => import("@/features/super-admin/pages/Security"));
const Operations = lazy(() => import("@/features/super-admin/pages/Operations"));
const Analytics = lazy(() => import("@/features/super-admin/pages/Analytics"));
const SuperAdminServices = lazy(() => import("@/features/super-admin/pages/Services"));

// --- Sales Pages ---
const LeadManagement = lazy(() => import("@/features/sales/pages/LeadManagement"));
const LeadPipeline = lazy(() => import("@/features/sales/pages/LeadPipeline"));
const ProposalManagement = lazy(() => import("@/features/sales/pages/Proposals"));
const PreSalesManager = lazy(() => import("@/features/sales/pages/PreSales"));
const SalesDashboard = lazy(() => import("@/features/sales/pages/Dashboard"));

// --- Agent Pages ---
const MobileAgentPortal = lazy(() => import("@/features/agent/pages/Portal"));
const AgentDashboard = lazy(() => import("@/features/agent/pages/Dashboard"));
const AgentLeadManagement = lazy(() => import("@/features/agent/pages/LeadManagement"));
const AgentCommissionTracker = lazy(() => import("@/features/agent/pages/CommissionTracker"));
const AgentPerformance = lazy(() => import("@/features/agent/pages/Performance"));
const AgentProfileSettings = lazy(() => import("@/features/agent/pages/ProfileSettings"));
const CommissionDisputes = lazy(() => import("@/features/agent/pages/Disputes"));
const AgentKYC = lazy(() => import("@/features/agent/pages/KYC"));

// --- QC Pages ---
const QCDashboard = lazy(() => import("@/features/qc/pages/Dashboard"));
const QCDeliveryHandoff = lazy(() => import("@/features/qc/pages/DeliveryHandoff"));
const QualityMetricsDashboard = lazy(() => import("@/features/qc/pages/Metrics"));
const DeliveryConfirmation = lazy(() => import("@/features/qc/pages/DeliveryConfirmation"));

// --- Customer Success Pages ---
const CustomerServiceDashboard = lazy(() => import("@/features/customer-success/pages/Dashboard"));
const PlaybookManagement = lazy(() => import("@/features/customer-success/pages/Playbooks"));
const RenewalPipeline = lazy(() => import("@/features/customer-success/pages/Renewals"));

// --- Executive Pages ---
const ExecutiveDashboard = lazy(() => import("@/features/executive/pages/Dashboard"));
const BusinessIntelligence = lazy(() => import("@/features/executive/pages/BusinessIntelligence"));
const ExecutiveSummary = lazy(() => import("@/features/executive/pages/Summary"));

// --- Finance & HR Pages ---
const FinancialManagementDashboard = lazy(() => import("@/features/finance/pages/Dashboard"));
const HRDashboard = lazy(() => import("@/features/hr/pages/Dashboard"));

// --- Messaging Pages ---
const NotificationCenter = lazy(() => import("@/features/messaging/pages/NotificationCenter"));
const MessageCenter = lazy(() => import("@/features/messaging/pages/MessageCenter"));

// --- Security Pages ---
const SecurityIncidents = lazy(() => import("@/features/security/pages/Incidents"));

// ============================================================
// Route Configuration
// ============================================================

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

  // Show loading state for protected routes while auth is being checked
  const showAuthLoading = isLoading && !isPublicRoute(location);

  if (showAuthLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8fafc',
          gap: '16px'
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e2e8f0',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}
        />
        <p style={{ color: '#64748b', fontSize: '14px' }}>Loading...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <ErrorBoundary>
        <GlobalErrorHandler />
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <CommandPalette />
          <Router>
            <UnifiedLayoutProvider isAuthenticated={!!user}>
              <div className="min-h-screen flex flex-col">
              <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded">
                Skip to main content
              </a>
              <main id="main-content" className="flex-grow focus:outline-none" tabIndex={-1}>
                <Suspense fallback={<PageLoader />}>
                  <Switch>
                {/* ========== PUBLIC ROUTES ========== */}
                <Route path="/" component={LandingPageV3} />
                <Route path="/hub" component={DevHub} />
                <Route path="/dev" component={DevHub} />
                <Route path="/landing" component={LandingPageV3} />
                <Route path="/mobile-landing" component={LandingPageV3} />
                <Route path="/design-system" component={DesignSystemShowcase} />
                <Route path="/platform-demo" component={PlatformDemo} />
                <Route path="/10k" component={ComplianceScorecard} />
                <Route path="/compliance-scorecard" component={ComplianceScorecard} />

                {/* ========== AUTH ROUTES ========== */}
                <Route path="/login" component={Login} />
                <Route path="/signin" component={Login} />
                <Route path="/forgot-password" component={ForgotPassword} />
                <Route path="/reset-password" component={ForgotPassword} />
                <Route path="/register" component={ClientRegistration} />
                <Route path="/client-registration" component={ClientRegistration} />
                <Route path="/signup" component={ClientRegistration} />
                <Route path="/select-role" component={RoleSelection} />
                <Route path="/role-selection" component={RoleSelection} />
                <Route path="/dashboard" component={RoleBasedDashboard} />
                <Route path="/my-dashboard" component={RoleBasedDashboard} />
                <Route path="/role-dashboard" component={RoleBasedDashboard} />

                {/* ========== ONBOARDING ROUTES ========== */}
                <Route path="/onboarding" component={OnboardingFlow} />
                <Route path="/onboarding-flow" component={OnboardingFlow} />
                <Route path="/streamlined-onboarding" component={OnboardingFlow} />
                <Route path="/smart-start" component={OnboardingFlow} />
                <Route path="/whatsapp-onboarding" component={WhatsAppOnboarding} />
                <Route path="/business-type" component={BusinessType} />
                <Route path="/package-selection" component={PackageSelection} />
                <Route path="/founder-details" component={FounderDetails} />
                <Route path="/industry-classification" component={IndustryClassification} />
                <Route path="/service-flow" component={ServiceFlowDashboard} />
                <Route path="/documents" component={DocumentUpload} />
                <Route path="/document-upload" component={DocumentUpload} />
                <Route path="/esign-agreements" component={ESignAgreements} />
                <Route path="/payment-gateway" component={PaymentGateway} />
                <Route path="/confirmation" component={Confirmation} />

                {/* ========== CLIENT PORTAL ROUTES ========== */}
                <Route path="/portal" component={MobileClientPortalRefactored} />
                <Route path="/client-portal" component={MobileClientPortalRefactored} />
                <Route path="/client-portal/entities" component={MobileClientPortalRefactored} />
                <Route path="/client-portal/services" component={ServiceRequestUI} />
                <Route path="/client-portal/documents" component={DocumentVault} />
                <Route path="/portal-v2" component={ClientDashboardV3} />
                <Route path="/portal-v2/account" component={AccountIndex} />
                <Route path="/portal-v2/account/businesses" component={AccountBusinesses} />
                <Route path="/portal-v2/account/billing" component={AccountBilling} />
                <Route path="/portal-v2/account/documents" component={AccountDocuments} />
                <Route path="/portal-v2/account/security" component={AccountSecurity} />
                <Route path="/portal-v2/account/notifications" component={AccountNotifications} />
                <Route path="/my-services" component={ClientServicesDashboard} />
                <Route path="/client/services" component={ClientServicesDashboard} />
                <Route path="/client/alert-preferences" component={ComplianceAlertPreferences} />
                <Route path="/service-tracker" component={ClientServicesDashboard} />
                <Route path="/services" component={ClientServiceCatalog} />
                <Route path="/service-catalog" component={ServiceCatalogBrowser} />
                <Route path="/browse-services" component={ServiceCatalogBrowser} />
                <Route path="/service-request/create" component={ServiceRequestCreate} />
                <Route path="/service-request/:id" component={ServiceRequestDetail} />
                <Route path="/service-requests" component={ServiceRequestsHub} />
                <Route path="/requests" component={ServiceRequestsHub} />
                <Route path="/my-requests" component={ServiceRequestsHub} />
                <Route path="/compliance-calendar" component={ClientComplianceCalendar} />
                <Route path="/client-profile" component={ClientProfile} />
                <Route path="/vault" component={DocumentVault} />
                <Route path="/referrals" component={ReferralDashboard} />
                <Route path="/referral-dashboard" component={ReferralDashboard} />
                <Route path="/wallet" component={ReferralDashboard} />
                <Route path="/retainership" component={RetainershipPlans} />
                <Route path="/lifecycle" component={LifecycleDashboard} />
                <Route path="/lifecycle-dashboard" component={LifecycleDashboard} />
                <Route path="/lifecycle/compliance" component={ComplianceDetail} />
                <Route path="/lifecycle/services" component={ServicesDetail} />
                <Route path="/lifecycle/documents" component={DocumentsDetail} />
                <Route path="/lifecycle/funding" component={FundingDetail} />
                <Route path="/lifecycle/timeline" component={Timeline} />
                <Route path="/support" component={ClientSupport} />
                <Route path="/help" component={ClientSupport} />
                <Route path="/tickets" component={ClientSupport} />
                <Route path="/founder" component={FounderLiteDashboard} />
                <Route path="/compliance-state" component={FounderLiteDashboard} />
                <Route path="/mobile-dashboard" component={ClientDashboardV3} />
                <Route path="/mobile" component={ClientDashboardV3} />
                <Route path="/command-center" component={ClientDashboardV3} />

                {/* ========== COMPLIANCE ROUTES ========== */}
                <Route path="/autocomply" component={AutoComply} />
                <Route path="/workflows" component={AutoComply} />
                <Route path="/automation" component={AutoComply} />
                <Route path="/taxtracker" component={TaxTracker} />
                <Route path="/tax" component={TaxTracker} />
                <Route path="/tax-management" component={TaxTracker} />
                <Route path="/digiscore" component={DigiScore} />
                <Route path="/compliance-score" component={DigiScore} />
                <Route path="/score" component={DigiScore} />
                <Route path="/tracker" component={ComplianceTrackerDashboard} />
                <Route path="/compliance-dashboard" component={ComplianceTrackerDashboard} />
                <Route path="/compliance-management" component={ComplianceManagementDashboard} />
                <Route path="/compliance-admin" component={ComplianceManagementDashboard} />
                <Route path="/compliance-ops" component={ComplianceManagementDashboard} />
                <Route path="/compliance/audit-log" component={AuditLogViewer} />
                <Route path="/audit-log" component={AuditLogViewer} />
                <Route path="/compliance/data-requests" component={DataDeletionRequests} />
                <Route path="/data-requests" component={DataDeletionRequests} />

                {/* ========== OPERATIONS ROUTES ========== */}
                <Route path="/operations" component={MobileOperationsPanelRefactored} />
                <Route path="/ops" component={MobileOperationsPanelRefactored} />
                <Route path="/universal-ops" component={MobileOperationsPanelRefactored} />
                <Route path="/work-queue" component={OperationsWorkQueue} />
                <Route path="/ops/work-queue" component={OperationsWorkQueue} />
                <Route path="/operations/work-queue" component={OperationsWorkQueue} />
                <Route path="/operations-queue" component={OperationsWorkQueue} />
                <Route path="/ops/document-review" component={OperationsDocumentReview} />
                <Route path="/operations/document-review" component={OperationsDocumentReview} />
                <Route path="/document-review" component={OperationsDocumentReview} />
                <Route path="/escalations" component={EscalationDashboard} />
                <Route path="/ops/escalations" component={EscalationDashboard} />
                <Route path="/escalation-dashboard" component={EscalationDashboard} />
                <Route path="/ops/case/:id" component={OpsCaseDashboard} />
                <Route path="/ops/client/:clientId" component={OpsClientDashboard} />
                <Route path="/ops/team" component={OpsTeamAssignment} />
                <Route path="/ops/team-assignment" component={OpsTeamAssignment} />
                <Route path="/ops/performance" component={OpsPerformanceMetrics} />
                <Route path="/ops/performance-metrics" component={OpsPerformanceMetrics} />
                <Route path="/ops/communications" component={OpsClientCommunicationHub} />
                <Route path="/ops/communication-hub" component={OpsClientCommunicationHub} />

                {/* ========== ADMIN ROUTES ========== */}
                <Route path="/admin" component={MobileAdminPanelRefactored} />
                <Route path="/admin-control" component={MobileAdminPanelRefactored} />
                <Route path="/admin/dashboard" component={AdminDashboardV3} />
                <Route path="/admin/users" component={AdminUserManagement} />
                <Route path="/admin/reports" component={AdminReports} />
                <Route path="/admin/services" component={AdminServicesOverview} />
                <Route path="/services-management" component={AdminServicesOverview} />
                <Route path="/manage-services" component={AdminServicesOverview} />
                <Route path="/admin-config" component={AdminServiceConfig} />
                <Route path="/status-management" component={StatusManagement} />
                <Route path="/workflow-statuses" component={StatusManagement} />
                <Route path="/config" component={ConfigurationManager} />
                <Route path="/configuration" component={ConfigurationManager} />
                <Route path="/admin/config" component={ConfigurationManager} />
                <Route path="/settings" component={ConfigurationManager} />
                <Route path="/workflow-import" component={WorkflowImport} />
                <Route path="/admin/workflow-import" component={WorkflowImport} />
                <Route path="/bulk-upload" component={BulkUploadCenter} />
                <Route path="/bulk-import" component={BulkUploadCenter} />
                <Route path="/data-import" component={BulkUploadCenter} />
                <Route path="/admin/bulk-upload" component={BulkUploadCenter} />
                <Route path="/admin/blueprints" component={BlueprintManagement} />
                <Route path="/admin/enterprise" component={BlueprintManagement} />
                <Route path="/enterprise-config" component={BlueprintManagement} />
                <Route path="/admin/access-reviews" component={AccessReviews} />
                <Route path="/access-reviews" component={AccessReviews} />
                <Route path="/blueprint" component={MasterBlueprintDashboard} />
                <Route path="/master-blueprint" component={MasterBlueprintDashboard} />
                <Route path="/admin/clients" component={ClientMasterDashboard} />
                <Route path="/client-master" component={ClientMasterDashboard} />
                <Route path="/clients" component={ClientMasterDashboard} />
                <Route path="/client-management" component={ClientMasterDashboard} />
                <Route path="/admin/webhooks" component={WebhookManagement} />
                <Route path="/admin/api-keys" component={APIKeyManagement} />
                <Route path="/developer/api-keys" component={APIKeyManagement} />

                {/* ========== SUPER ADMIN ROUTES ========== */}
                <Route path="/super-admin" component={SuperAdminDashboardV3} />
                <Route path="/super-admin/dashboard" component={SuperAdminDashboardV3} />
                <Route path="/super-admin/tenants" component={TenantManagement} />
                <Route path="/super-admin/pricing" component={PricingEngine} />
                <Route path="/super-admin/commissions" component={CommissionConfig} />
                <Route path="/super-admin/security" component={SecurityCenter} />
                <Route path="/super-admin/operations" component={Operations} />
                <Route path="/super-admin/analytics" component={Analytics} />
                <Route path="/super-admin/services" component={SuperAdminServices} />

                {/* ========== SALES ROUTES ========== */}
                <Route path="/leads" component={LeadManagement} />
                <Route path="/lead-management" component={LeadManagement} />
                <Route path="/lead-pipeline" component={LeadPipeline} />
                <Route path="/pipeline" component={LeadPipeline} />
                <Route path="/crm" component={LeadPipeline} />
                <Route path="/proposals" component={ProposalManagement} />
                <Route path="/proposal-management" component={ProposalManagement} />
                <Route path="/sales-proposals" component={ProposalManagement} />
                <Route path="/pre-sales" component={PreSalesManager} />
                <Route path="/sales" component={SalesDashboard} />
                <Route path="/sales/dashboard" component={SalesDashboard} />
                <Route path="/sales/pipeline" component={SalesDashboard} />
                <Route path="/sales/team" component={SalesDashboard} />
                <Route path="/sales/forecasts" component={SalesDashboard} />
                <Route path="/sales/targets" component={SalesDashboard} />

                {/* ========== AGENT ROUTES ========== */}
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
                <Route path="/agents" component={MobileAgentPortal} />
                <Route path="/agent-portal" component={MobileAgentPortal} />
                <Route path="/partner" component={MobileAgentPortal} />
                <Route path="/partners" component={MobileAgentPortal} />

                {/* ========== QC ROUTES ========== */}
                <Route path="/qc" component={QCDashboard} />
                <Route path="/qc/queue" component={QCDashboard} />
                <Route path="/qc-dashboard" component={QCDashboard} />
                <Route path="/quality-control" component={QCDashboard} />
                <Route path="/qc-delivery-handoff" component={QCDeliveryHandoff} />
                <Route path="/delivery-handoff" component={QCDeliveryHandoff} />
                <Route path="/quality-metrics" component={QualityMetricsDashboard} />
                <Route path="/qc-metrics" component={QualityMetricsDashboard} />
                <Route path="/delivery/:deliveryId" component={DeliveryConfirmation} />

                {/* ========== CUSTOMER SUCCESS ROUTES ========== */}
                <Route path="/customer-service" component={CustomerServiceDashboard} />
                <Route path="/customer-success/playbooks" component={PlaybookManagement} />
                <Route path="/playbooks" component={PlaybookManagement} />
                <Route path="/customer-success/renewals" component={RenewalPipeline} />
                <Route path="/renewals" component={RenewalPipeline} />
                <Route path="/renewal-pipeline" component={RenewalPipeline} />

                {/* ========== EXECUTIVE ROUTES ========== */}
                <Route path="/executive-dashboard" component={ExecutiveDashboard} />
                <Route path="/analytics" component={ExecutiveDashboard} />
                <Route path="/business-intelligence" component={BusinessIntelligence} />
                <Route path="/bi" component={BusinessIntelligence} />
                <Route path="/insights" component={BusinessIntelligence} />
                <Route path="/executive-summary" component={ExecutiveSummary} />
                <Route path="/investor-summary" component={ExecutiveSummary} />
                <Route path="/compliance-report" component={ExecutiveSummary} />

                {/* ========== FINANCE & HR ROUTES ========== */}
                <Route path="/financial-management" component={FinancialManagementDashboard} />
                <Route path="/financials" component={FinancialManagementDashboard} />
                <Route path="/revenue-analytics" component={FinancialManagementDashboard} />
                <Route path="/hr" component={HRDashboard} />
                <Route path="/hr-dashboard" component={HRDashboard} />
                <Route path="/human-resources" component={HRDashboard} />

                {/* ========== MESSAGING ROUTES ========== */}
                <Route path="/notifications" component={NotificationCenter} />
                <Route path="/notification-center" component={NotificationCenter} />
                <Route path="/alerts" component={NotificationCenter} />
                <Route path="/messages" component={MessageCenter} />
                <Route path="/messaging" component={MessageCenter} />
                <Route path="/conversations" component={MessageCenter} />
                <Route path="/inbox" component={MessageCenter} />

                {/* ========== SECURITY ROUTES ========== */}
                <Route path="/security/incidents" component={SecurityIncidents} />
                <Route path="/incidents" component={SecurityIncidents} />
                <Route path="/security-incidents" component={SecurityIncidents} />

                {/* ========== SHARED / MISC ROUTES ========== */}
                <Route path="/tasks" component={TaskManagement} />
                <Route path="/task-management" component={TaskManagement} />
                <Route path="/my-tasks" component={TaskManagement} />
                <Route path="/ai-documents" component={AiDocumentPreparation} />
                <Route path="/doc-prep" component={AiDocumentPreparation} />
                <Route path="/document-preparation" component={AiDocumentPreparation} />
                <Route path="/doc-generator" component={AiDocumentPreparation} />
                <Route path="/sync" component={SyncDashboard} />
                <Route path="/excellence" component={PlatformShowcase} />
                <Route path="/suggestions" component={SmartSuggestionsEngine} />
                <Route path="/workflow-dashboard" component={DigiComplyWorkflowDashboard} />
                <Route path="/knowledge-base" component={KnowledgeBase} />

                {/* Legal/Policy Pages */}
                <Route path="/privacy-policy" component={PrivacyPolicy} />
                <Route path="/terms-of-service" component={TermsOfService} />
                <Route path="/refund-policy" component={RefundPolicy} />

                {/* 404 Fallback */}
                <Route component={NotFound} />
              </Switch>
              </Suspense>
            </main>
              <ChatWidget />
              </div>
            </UnifiedLayoutProvider>
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
