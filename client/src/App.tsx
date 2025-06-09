
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
import DigiComplyWorkflowDashboard from "./components/DigiComplyWorkflowDashboard";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Router>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-grow">
              <Switch>
                <Route path="/" component={Onboarding} />
                <Route path="/business-type" component={BusinessType} />
                <Route path="/package-selection" component={PackageSelection} />
                <Route path="/founder-details" component={FounderDetails} />
                <Route path="/industry-classification" component={IndustryClassification} />
                <Route path="/services" component={ServiceSelection} />
                <Route path="/service-flow" component={ServiceFlowDashboard} />
                <Route path="/workflows" component={DigiComplyWorkflowDashboard} />
                <Route path="/documents" component={DocumentUpload} />
                <Route path="/document-upload" component={DocumentUpload} />
                <Route path="/esign-agreements" component={ESignAgreements} />
                <Route path="/payment-gateway" component={PaymentGateway} />
                <Route path="/tracker" component={ComplianceTracker} />
                <Route path="/confirmation" component={Confirmation} />
                <Route path="/admin" component={AdminPanel} />
                <Route path="/sync" component={SyncDashboard} />
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
