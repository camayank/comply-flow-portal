// Fallback index page - redirects to landing page
import { useEffect } from "react";
import { useLocation } from "wouter";
import { MinimalLayout } from "@/layouts";

const Index = () => {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to the main landing page
    setLocation("/");
  }, [setLocation]);

  return (
    <MinimalLayout showHeader={false}>
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting to DigiComply...</p>
        </div>
      </div>
    </MinimalLayout>
  );
};

export default Index;
