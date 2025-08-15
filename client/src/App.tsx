
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
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
import OperationsPanel from "./pages/OperationsPanel";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Router>
          <div className="min-h-screen flex flex-col">
            <main className="flex-grow">
              <Switch>
                <Route path="/" component={LandingPage} />
                <Route path="/compliance-dashboard" component={ComplianceTrackerDashboard} />
                <Route path="/services" component={ServiceSelection} />
                <Route path="/workflows" component={DigiComplyWorkflowDashboard} />
                <Route path="/smart-start" component={SmartStart} />
                <Route path="/whatsapp-onboarding" component={WhatsAppOnboarding} />
                <Route path="/10k" component={ComplianceScorecard} />
                <Route path="/compliance-scorecard" component={ComplianceScorecard} />
                <Route path="/portal" component={ClientPortal} />
                <Route path="/client-portal" component={ClientPortal} />
                <Route path="/operations" component={OperationsPanel} />
                <Route path="/ops" component={OperationsPanel} />
                <Route path="/admin" component={AdminPanel} />
                <Route path="/admin-control" component={AdminPanel} />
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
