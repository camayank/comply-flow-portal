import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Shield, Mail, Lock, Smartphone } from "lucide-react";
import { getRoleDashboardRoute } from "@/utils/roleBasedRouting";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  return (
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
            <Tabs defaultValue="client" className="w-full">
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
  );
}

function ClientLogin() {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const sendOtpMutation = useMutation({
    mutationFn: (email: string) => apiRequest('/api/auth/client/send-otp', 'POST', { email }),
    onSuccess: () => {
      toast({
        title: "OTP Sent",
        description: "Check your email for the verification code",
      });
      setStep("otp");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP",
        variant: "destructive",
      });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: (data: { email: string; otp: string }) =>
      apiRequest('/api/auth/client/verify-otp', 'POST', data),
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Login successful!",
      });
      // Store user data and navigate to role-specific dashboard
      localStorage.setItem('user', JSON.stringify(data.user));
      const dashboardRoute = getRoleDashboardRoute(data.user.role);
      setLocation(dashboardRoute);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Invalid OTP",
        variant: "destructive",
      });
    },
  });

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Error", description: "Please enter your email", variant: "destructive" });
      return;
    }
    sendOtpMutation.mutate(email);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      toast({ title: "Error", description: "Please enter the OTP", variant: "destructive" });
      return;
    }
    verifyOtpMutation.mutate({ email, otp });
  };

  if (step === "otp") {
    return (
      <form onSubmit={handleVerifyOtp} className="space-y-4">
        <div className="text-center mb-4">
          <Smartphone className="h-12 w-12 mx-auto text-primary mb-2" />
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code sent to {email}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="otp">Verification Code</Label>
          <Input
            id="otp"
            type="text"
            placeholder="000000"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            className="text-center text-2xl tracking-widest"
            data-testid="input-otp"
            autoFocus
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={verifyOtpMutation.isPending || otp.length !== 6}
          data-testid="button-verify-otp"
        >
          {verifyOtpMutation.isPending ? "Verifying..." : "Verify & Login"}
        </Button>

        <div className="text-center">
          <Button
            type="button"
            variant="link"
            onClick={() => setStep("email")}
            className="text-sm"
          >
            Use different email
          </Button>
          <span className="mx-2">|</span>
          <Button
            type="button"
            variant="link"
            onClick={() => sendOtpMutation.mutate(email)}
            disabled={sendOtpMutation.isPending}
            className="text-sm"
          >
            {sendOtpMutation.isPending ? "Sending..." : "Resend OTP"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSendOtp} className="space-y-4">
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

      <Button
        type="submit"
        className="w-full"
        disabled={sendOtpMutation.isPending}
        data-testid="button-send-otp"
      >
        {sendOtpMutation.isPending ? "Sending..." : "Send Verification Code"}
      </Button>

      <div className="text-center text-sm text-muted-foreground">
        We'll send a 6-digit code to verify your identity
      </div>
    </form>
  );
}

function StaffLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const loginMutation = useMutation({
    mutationFn: (data: { username: string; password: string }) =>
      apiRequest('/api/auth/staff/login', 'POST', data),
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Login successful!",
      });
      // Store user data and navigate to role-specific dashboard
      localStorage.setItem('user', JSON.stringify(data.user));
      const dashboardRoute = getRoleDashboardRoute(data.user.role);
      setLocation(dashboardRoute);
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
        <a href="#" className="text-sm text-primary hover:underline">
          Forgot password?
        </a>
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
