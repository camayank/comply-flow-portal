
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { Router, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { GlobalErrorHandler } from "./components/GlobalErrorHandler";
import { queryClient } from "@/lib/queryClient";
import Onboarding from "./pages/Onboarding";
import BusinessType from "./pages/BusinessType";
import PackageSelection from "./pages/PackageSelection";
import FounderDetails from "./pages/FounderDetails";
import IndustryClassification from "./pages/IndustryClassification";
import ServiceSelection from "./pages/ServiceSelection";
import ServiceFlowDashboard from "./pages/ServiceFlowDashboard";
import DocumentUpload from "./pages/DocumentUpload";
import ESignAgreements from "./pages/ESignAgreements";
import PaymentGateway from "./pages/PaymentGateway";
import ComplianceTracker from "./pages/ComplianceTracker";
import Confirmation from "./pages/Confirmation";
import AdminPanel from "./pages/AdminPanel";
import MobileOperationsPanel from "./pages/MobileOperationsPanel";
import MobileAdminPanel from "./pages/MobileAdminPanel";
import SyncDashboard from "./pages/SyncDashboard";
import PlatformShowcase from "./pages/PlatformShowcase";
import ComplianceTrackerDashboard from "./pages/ComplianceTrackerDashboard";
import RetainershipPlans from "./pages/RetainershipPlans";
import SmartSuggestionsEngine from "./pages/SmartSuggestionsEngine";
import DocumentVault from "./pages/DocumentVault";
import LandingPage from "./pages/LandingPage";
import DigiComplyWorkflowDashboard from "./components/DigiComplyWorkflowDashboard";
import Footer from "./components/Footer";
import NotFound from "./pages/NotFound";
import StreamlinedOnboarding from "./pages/StreamlinedOnboarding";
import SmartStart from "./pages/SmartStart";
import WhatsAppOnboarding from "./pages/WhatsAppOnboarding";
import ComplianceScorecard from "./pages/ComplianceScorecard";
import ClientPortal from "./pages/ClientPortal";
import MobileClientPortal from "./pages/MobileClientPortal";
import OperationsPanel from "./pages/OperationsPanel";
import OperationsManager from "./components/OperationsManager";
import AgentPortal from "./pages/AgentPortal";
import MobileAgentPortal from "./pages/MobileAgentPortal";
import MasterBlueprintDashboard from "./pages/MasterBlueprintDashboard";
import UniversalAdminPanel from "./pages/UniversalAdminPanel";
import UniversalClientPortal from "./pages/UniversalClientPortal";
import UniversalOperationsPanel from "./pages/UniversalOperationsPanel";
import UniversalLandingPage from "./pages/UniversalLandingPage";
import MobileResponsiveLanding from "./pages/MobileResponsiveLanding";
import OnboardingFlow from "./pages/OnboardingFlow";
import PlatformDemo from "./pages/PlatformDemo";
import AdminServiceConfig from "./pages/AdminServiceConfig";
import PreSalesManager from "./pages/PreSalesManager";
import SalesProposalManager from "./pages/SalesProposalManager";
import QCDashboard from "./pages/QCDashboard";
import QualityMetricsDashboard from "./pages/QualityMetricsDashboard";
import DeliveryConfirmation from "./pages/DeliveryConfirmation";
import HRDashboard from "./pages/HRDashboard";
import ClientMasterDashboard from "./pages/ClientMasterDashboard";
import FinancialManagementDashboard from "./pages/FinancialManagementDashboard";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import BusinessIntelligence from "./pages/BusinessIntelligence";
import MobileDashboard from "./pages/MobileDashboard";
import DesignSystemShowcase from "./components/DesignSystemShowcase";
import ClientRegistration from "./pages/ClientRegistration";
import LeadManagement from "./pages/LeadManagement";

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
              <Switch>
                <Route path="/" component={MobileResponsiveLanding} />
                <Route path="/register" component={ClientRegistration} />
                <Route path="/client-registration" component={ClientRegistration} />
                <Route path="/signup" component={ClientRegistration} />
                <Route path="/leads" component={LeadManagement} />
                <Route path="/lead-management" component={LeadManagement} />
                <Route path="/design-system" component={DesignSystemShowcase} />
                <Route path="/landing" component={LandingPage} />
                <Route path="/onboarding-flow" component={OnboardingFlow} />
                <Route path="/platform-demo" component={PlatformDemo} />
                <Route path="/compliance-dashboard" component={ComplianceTrackerDashboard} />
                <Route path="/services" component={ServiceSelection} />
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
                <Route path="/agents" component={AgentPortal} />
                <Route path="/agent-portal" component={AgentPortal} />
                <Route path="/partner" component={AgentPortal} />
                <Route path="/partners" component={AgentPortal} />
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
            </main>
            <Footer />
          </div>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
