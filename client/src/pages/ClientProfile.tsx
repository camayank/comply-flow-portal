import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { DashboardLayout, PageShell } from '@/components/v3';
import {
  Home,
  Briefcase,
  FileText,
  Calendar,
  Shield,
  HelpCircle,
  Settings,
  User,
  Mail,
  Phone,
  MapPin,
  Key,
  Bell,
  CreditCard,
  Gift,
  Copy,
  Check,
} from 'lucide-react';
import { useAuth } from '@/components/ProtectedRoute';

// Navigation configuration for client portal
const clientNavigation = [
  {
    title: "Client Portal",
    items: [
      { label: "Dashboard", href: "/client", icon: Home },
      { label: "My Services", href: "/client/services", icon: Briefcase },
      { label: "Documents", href: "/client/documents", icon: FileText },
    ],
  },
  {
    title: "Compliance",
    items: [
      { label: "Calendar", href: "/client/calendar", icon: Calendar },
      { label: "Compliance Status", href: "/client/compliance", icon: Shield },
    ],
  },
  {
    title: "Support",
    items: [
      { label: "Help Center", href: "/client/help", icon: HelpCircle },
      { label: "Profile & Settings", href: "/client/profile", icon: Settings },
    ],
  },
];

// User configuration
const clientUser = {
  name: "Client",
  email: "client@digicomply.com",
};

const ClientProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copiedReferral, setCopiedReferral] = useState(false);

  // Fetch user profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['/api/client/profile'],
  });

  // Fetch wallet balance
  const { data: wallet } = useQuery({
    queryKey: ['/api/client/wallet'],
  });

  // Fetch referral stats
  const { data: referralStats } = useQuery({
    queryKey: ['/api/client/referrals/stats'],
  });

  const [profileData, setProfileData] = useState({
    name: (profile as any)?.name || '',
    email: (profile as any)?.email || '',
    phone: (profile as any)?.phone || '',
    address: (profile as any)?.address || '',
    city: (profile as any)?.city || '',
    state: (profile as any)?.state || '',
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/client/profile', 'PATCH', data);
    },
    onSuccess: () => {
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/client/profile'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleUpdateProfile = () => {
    updateProfileMutation.mutate(profileData);
  };

  const handleCopyReferralCode = () => {
    const referralCode = (referralStats as any)?.referralCode || 'DEMO123';
    navigator.clipboard.writeText(referralCode);
    setCopiedReferral(true);
    toast({
      title: 'Copied!',
      description: 'Referral code copied to clipboard',
    });
    setTimeout(() => setCopiedReferral(false), 2000);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DashboardLayout
      navigation={clientNavigation}
      user={clientUser}
    >
      <PageShell
        title="My Profile"
        subtitle="Manage your account settings and preferences"
        breadcrumbs={[
          { label: "Client Portal", href: "/client" },
          { label: "Profile" },
        ]}
        actions={
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-blue-600 text-white text-lg">
                {getInitials((profile as any)?.name || user?.name || 'User')}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block">
              <p className="text-sm font-medium">{(profile as any)?.name || user?.name || 'User'}</p>
              <p className="text-xs text-gray-500">{(profile as any)?.email || user?.email}</p>
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Settings */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="profile" data-testid="tab-profile">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="security" data-testid="tab-security">
                  <Shield className="h-4 w-4 mr-2" />
                  Security
                </TabsTrigger>
                <TabsTrigger value="notifications" data-testid="tab-notifications">
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                </TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile">
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Update your personal details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={profileData.name}
                          onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                          placeholder="John Doe"
                          data-testid="input-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                          placeholder="john@example.com"
                          data-testid="input-email"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          value={profileData.phone}
                          onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                          placeholder="+91 98765 43210"
                          data-testid="input-phone"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={profileData.city}
                          onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                          placeholder="Mumbai"
                          data-testid="input-city"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={profileData.address}
                        onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                        placeholder="Complete address"
                        data-testid="input-address"
                      />
                    </div>

                    <Button
                      onClick={handleUpdateProfile}
                      disabled={updateProfileMutation.isPending}
                      data-testid="button-save-profile"
                    >
                      {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security">
                <Card>
                  <CardHeader>
                    <CardTitle>Security Settings</CardTitle>
                    <CardDescription>Manage your account security</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Change Password</Label>
                      <p className="text-sm text-gray-600 mb-2">
                        We'll send you an OTP to verify your identity
                      </p>
                      <Button variant="outline" data-testid="button-change-password">
                        <Key className="h-4 w-4 mr-2" />
                        Change Password
                      </Button>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-2">Two-Factor Authentication</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Add an extra layer of security to your account
                      </p>
                      <Badge variant="outline">Coming Soon</Badge>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-2">Active Sessions</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">Current Session</p>
                            <p className="text-xs text-gray-600">Mumbai, India • Chrome</p>
                          </div>
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            Active
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications">
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>Choose how you want to be notified</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Email Notifications</p>
                        <p className="text-sm text-gray-600">Receive updates via email</p>
                      </div>
                      <input type="checkbox" className="toggle" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">SMS Notifications</p>
                        <p className="text-sm text-gray-600">Get text messages for important updates</p>
                      </div>
                      <input type="checkbox" className="toggle" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">WhatsApp Notifications</p>
                        <p className="text-sm text-gray-600">Updates via WhatsApp</p>
                      </div>
                      <input type="checkbox" className="toggle" defaultChecked />
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">Notification Types</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" id="service-updates" defaultChecked />
                          <Label htmlFor="service-updates">Service Request Updates</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" id="compliance-alerts" defaultChecked />
                          <Label htmlFor="compliance-alerts">Compliance Deadline Alerts</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" id="payment-reminders" defaultChecked />
                          <Label htmlFor="payment-reminders">Payment Reminders</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" id="marketing" />
                          <Label htmlFor="marketing">Marketing & Promotions</Label>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Wallet & Referrals */}
          <div className="space-y-6">
            {/* Wallet Card */}
            <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Wallet Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-4">
                  ₹{(wallet as any)?.balance?.toLocaleString() || '0'}
                </div>
                <Button className="w-full bg-white text-blue-600 hover:bg-gray-100">
                  View Transactions
                </Button>
              </CardContent>
            </Card>

            {/* Referral Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-purple-600" />
                  Referral Program
                </CardTitle>
                <CardDescription>Earn ₹500 for every referral!</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Your Referral Code</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 font-mono text-lg font-bold text-purple-600">
                      {(referralStats as any)?.referralCode || 'DEMO123'}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyReferralCode}
                      data-testid="button-copy-referral"
                    >
                      {copiedReferral ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      {(referralStats as any)?.totalReferrals || 0}
                    </p>
                    <p className="text-xs text-gray-600">Total Referrals</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      ₹{(referralStats as any)?.totalEarned?.toLocaleString() || '0'}
                    </p>
                    <p className="text-xs text-gray-600">Total Earned</p>
                  </div>
                </div>

                <Button className="w-full" variant="outline" data-testid="button-share-referral">
                  <Gift className="h-4 w-4 mr-2" />
                  Share & Earn
                </Button>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Account Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Member Since</span>
                  <span className="font-medium">Jan 2025</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Services</span>
                  <span className="font-medium">12</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Active Entities</span>
                  <span className="font-medium">3</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageShell>
    </DashboardLayout>
  );
};

export default ClientProfile;
