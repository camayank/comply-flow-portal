
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Onboarding from "./pages/Onboarding";
import ServiceSelection from "./pages/ServiceSelection";
import DocumentUpload from "./pages/DocumentUpload";
import ComplianceTracker from "./pages/ComplianceTracker";
import Confirmation from "./pages/Confirmation";
import AdminPanel from "./pages/AdminPanel";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Onboarding />} />
              <Route path="/services" element={<ServiceSelection />} />
              <Route path="/documents" element={<DocumentUpload />} />
              <Route path="/tracker" element={<ComplianceTracker />} />
              <Route path="/confirmation" element={<Confirmation />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
