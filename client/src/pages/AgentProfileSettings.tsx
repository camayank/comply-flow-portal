import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  User,
  Lock,
  Bell,
  Wallet,
  Building,
  Mail,
  Phone,
  MapPin,
  Save,
  Copy,
  Check
} from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';

export default function AgentProfileSettings() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['/api/agent/profile'],
  });

  const profile = (profileData as any) || {
    name: 'Rajesh Kumar',
    email: 'rajesh@example.com',
    phone: '+91 9876543210',
    agentCode: 'AGT-2024-0047',
    territory: 'Delhi NCR',
    commissionRate: 15,
    bankName: 'HDFC Bank',
    accountNumber: '****6789',
    ifscCode: 'HDFC0001234',
    panCard: 'ABCDE1234F',
    referralCode: 'RAJESH2024',
    joinedDate: '2024-01-15',
  };

  const [profileForm, setProfileForm] = useState({
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    territory: profile.territory,
  });

  const [bankDetails, setBankDetails] = useState({
    bankName: profile.bankName,
    accountNumber: '',
    ifscCode: profile.ifscCode,
    panCard: profile.panCard,
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: true,
    whatsappNotifications: false,
    leadAssignments: true,
    commissionUpdates: true,
    performanceAlerts: true,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileForm) => {
      return apiRequest('PUT', '/api/agent/profile', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agent/profile'] });
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    },
  });

  const updateBankDetailsMutation = useMutation({
    mutationFn: async (data: typeof bankDetails) => {
      return apiRequest('PUT', '/api/agent/bank-details', data);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Bank details updated successfully',
      });
    },
  });

  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: typeof notifications) => {
      return apiRequest('PUT', '/api/agent/notifications', data);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Notification preferences updated',
      });
    },
  });

  const handleCopyReferralCode = () => {
    navigator.clipboard.writeText(profile.referralCode);
    setCopied(true);
    toast({
      title: 'Copied!',
      description: 'Referral code copied to clipboard',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Link href="/agent/dashboard">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Profile & Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your profile and preferences
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="profile" data-testid="tab-profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="bank" data-testid="tab-bank">
            <Wallet className="h-4 w-4 mr-2" />
            Bank Details
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="referral" data-testid="tab-referral">
            <Building className="h-4 w-4 mr-2" />
            Referral
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
                  <Label htmlFor="agentCode">Agent Code</Label>
                  <Input
                    id="agentCode"
                    value={profile.agentCode}
                    disabled
                    data-testid="input-agent-code"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="territory">Territory</Label>
                  <Input
                    id="territory"
                    value={profileForm.territory}
                    onChange={(e) => setProfileForm({ ...profileForm, territory: e.target.value })}
                    data-testid="input-territory"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    data-testid="input-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    data-testid="input-email"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    data-testid="input-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commissionRate">Commission Rate</Label>
                  <Input
                    id="commissionRate"
                    value={`${profile.commissionRate}%`}
                    disabled
                    data-testid="input-commission-rate"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => updateProfileMutation.mutate(profileForm)}
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-save-profile"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bank Details Tab */}
        <TabsContent value="bank">
          <Card>
            <CardHeader>
              <CardTitle>Bank Account Details</CardTitle>
              <CardDescription>Update your bank details for commission payouts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    value={bankDetails.bankName}
                    onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                    placeholder="HDFC Bank"
                    data-testid="input-bank-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    value={bankDetails.accountNumber}
                    onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                    placeholder="Enter account number"
                    data-testid="input-account-number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ifscCode">IFSC Code</Label>
                  <Input
                    id="ifscCode"
                    value={bankDetails.ifscCode}
                    onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value })}
                    placeholder="HDFC0001234"
                    data-testid="input-ifsc-code"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="panCard">PAN Card</Label>
                  <Input
                    id="panCard"
                    value={bankDetails.panCard}
                    onChange={(e) => setBankDetails({ ...bankDetails, panCard: e.target.value })}
                    placeholder="ABCDE1234F"
                    data-testid="input-pan-card"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => updateBankDetailsMutation.mutate(bankDetails)}
                  disabled={updateBankDetailsMutation.isPending}
                  data-testid="button-save-bank"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateBankDetailsMutation.isPending ? 'Saving...' : 'Save Bank Details'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Manage how you receive updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Communication Channels</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="font-medium">Email Notifications</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Receive updates via email
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.emailNotifications}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, emailNotifications: checked })
                      }
                      data-testid="switch-email"
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="font-medium">SMS Notifications</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Receive updates via SMS
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.smsNotifications}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, smsNotifications: checked })
                      }
                      data-testid="switch-sms"
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="font-medium">WhatsApp Notifications</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Receive updates via WhatsApp
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.whatsappNotifications}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, whatsappNotifications: checked })
                      }
                      data-testid="switch-whatsapp"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Alert Types</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Lead Assignments</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Get notified when new leads are assigned
                      </p>
                    </div>
                    <Switch
                      checked={notifications.leadAssignments}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, leadAssignments: checked })
                      }
                      data-testid="switch-lead-assignments"
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Commission Updates</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Get notified about commission status changes
                      </p>
                    </div>
                    <Switch
                      checked={notifications.commissionUpdates}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, commissionUpdates: checked })
                      }
                      data-testid="switch-commission-updates"
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Performance Alerts</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Get notified about performance milestones
                      </p>
                    </div>
                    <Switch
                      checked={notifications.performanceAlerts}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, performanceAlerts: checked })
                      }
                      data-testid="switch-performance-alerts"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => updateNotificationsMutation.mutate(notifications)}
                  disabled={updateNotificationsMutation.isPending}
                  data-testid="button-save-notifications"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateNotificationsMutation.isPending ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Referral Tab */}
        <TabsContent value="referral">
          <Card>
            <CardHeader>
              <CardTitle>Referral Program</CardTitle>
              <CardDescription>Earn by referring new agents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-6 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                <h3 className="text-lg font-semibold mb-4">Your Referral Code</h3>
                <div className="flex items-center gap-3">
                  <Input
                    value={profile.referralCode}
                    readOnly
                    className="text-lg font-mono"
                    data-testid="input-referral-code"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyReferralCode}
                    data-testid="button-copy-referral"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                  Share this code with others to earn referral bonuses
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Total Referrals</CardDescription>
                    <CardTitle className="text-2xl">8</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Active Referrals</CardDescription>
                    <CardTitle className="text-2xl text-green-600">5</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Referral Earnings</CardDescription>
                    <CardTitle className="text-2xl text-primary">₹12,400</CardTitle>
                  </CardHeader>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
