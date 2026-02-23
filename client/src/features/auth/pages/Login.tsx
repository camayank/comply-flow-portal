import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Shield, Mail, Lock } from "lucide-react";
import { canAccessRoute, getRoleDashboardRoute } from "@/utils/roleBasedRouting";
import { PublicLayout } from '@/layouts';
import type { User } from "@/store/authStore";

export default function Login() {
  const [activeTab, setActiveTab] = useState<"client" | "staff">("client");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const selectedRole = params.get('role') || sessionStorage.getItem('selectedRole');
    const registered = params.get('registered');
    const email = params.get('email');

    if (registered) {
      sessionStorage.setItem('showRegisteredMessage', '1');
      if (email) {
        sessionStorage.setItem('prefillEmail', email);
      }
    }

    if (selectedRole) {
      const normalizedRole = selectedRole.toLowerCase();
      if (normalizedRole === 'client') {
        setActiveTab('client');
      } else {
        setActiveTab('staff');
      }
    }
  }, []);

  return (
    <PublicLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Welcome Back</h1>
            <p className="text-muted-foreground mt-2">Sign in to your account</p>
          </div>

          <Card>
            <CardHeader>
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "client" | "staff")} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="client">Client Login</TabsTrigger>
                  <TabsTrigger value="staff">Staff Login</TabsTrigger>
                </TabsList>

                <TabsContent value="client" className="space-y-4 mt-4">
                  <ClientLogin />
                </TabsContent>

                <TabsContent value="staff" className="space-y-4 mt-4">
                  <StaffLogin />
                </TabsContent>
              </Tabs>
            </CardHeader>
          </Card>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>
              New client?{" "}
              <a href="/register" className="text-primary hover:underline font-medium">
                Register here
              </a>
            </p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

function ClientLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    const showRegistered = sessionStorage.getItem('showRegisteredMessage');
    const prefillEmail = sessionStorage.getItem('prefillEmail');

    if (prefillEmail) {
      setEmail(prefillEmail);
      sessionStorage.removeItem('prefillEmail');
    }

    if (showRegistered) {
      toast({
        title: "Registration successful",
        description: "Please sign in with your email and password.",
      });
      sessionStorage.removeItem('showRegisteredMessage');
    }
  }, [toast]);

  const loginMutation = useMutation<
    { user: User; accessToken: string },
    Error,
    { email: string; password: string }
  >({
    mutationFn: (data: { email: string; password: string }) =>
      apiRequest<{ user: User; accessToken: string }>('/api/auth/client/login', 'POST', data),
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Login successful!",
      });
      const redirectPath = sessionStorage.getItem('redirectAfterLogin');
      const dashboardRoute = getRoleDashboardRoute(data.user.role);
      if (redirectPath && canAccessRoute(data.user.role, redirectPath)) {
        sessionStorage.removeItem('redirectAfterLogin');
        setLocation(redirectPath);
      } else {
        setLocation(dashboardRoute);
      }
      queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please enter email and password",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate({ email, password });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="client-email">Email Address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="client-email"
            type="email"
            placeholder="you@company.com"
            className="pl-10"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="input-client-email"
            autoFocus
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="client-password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="client-password"
            type="password"
            placeholder="Enter your password"
            className="pl-10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="input-client-password"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setLocation('/forgot-password')}
          className="text-sm text-primary hover:underline bg-transparent border-none cursor-pointer"
        >
          Forgot password?
        </button>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={loginMutation.isPending}
        data-testid="button-client-login"
      >
        {loginMutation.isPending ? "Signing in..." : "Sign In"}
      </Button>

      <div className="text-center text-sm text-muted-foreground">
        For registered clients only
      </div>
    </form>
  );
}

function StaffLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const loginMutation = useMutation<
    { user: User; accessToken: string },
    Error,
    { username: string; password: string }
  >({
    mutationFn: (data: { username: string; password: string }) =>
      apiRequest<{ user: User; accessToken: string }>('/api/auth/staff/login', 'POST', data),
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Login successful!",
      });
      const redirectPath = sessionStorage.getItem('redirectAfterLogin');
      const dashboardRoute = getRoleDashboardRoute(data.user.role);
      if (redirectPath && canAccessRoute(data.user.role, redirectPath)) {
        sessionStorage.removeItem('redirectAfterLogin');
        setLocation(redirectPath);
      } else {
        setLocation(dashboardRoute);
      }
      queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({
        title: "Error",
        description: "Please enter username and password",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate({ username, password });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="username"
            type="text"
            placeholder="Enter your username"
            className="pl-10"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            data-testid="input-username"
            autoFocus
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            className="pl-10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="input-password"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setLocation('/forgot-password')}
          className="text-sm text-primary hover:underline bg-transparent border-none cursor-pointer"
        >
          Forgot password?
        </button>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={loginMutation.isPending}
        data-testid="button-staff-login"
      >
        {loginMutation.isPending ? "Signing in..." : "Sign In"}
      </Button>

      <div className="text-center text-sm text-muted-foreground">
        For internal staff members only
      </div>
    </form>
  );
}
