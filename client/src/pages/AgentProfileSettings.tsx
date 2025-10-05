import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  ArrowLeft,
  User,
  Bell,
  Wallet,
  Building,
  Mail,
  Phone,
  Save,
  Copy,
  Check
} from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';

const profileFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^[+]?[\d\s-()]+$/, 'Invalid phone number'),
  territory: z.string().min(2, 'Territory is required'),
});

const bankDetailsSchema = z.object({
  bankName: z.string().min(2, 'Bank name is required'),
  accountNumber: z.string().min(8, 'Account number must be at least 8 digits'),
  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code'),
  panCard: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN card format'),
});

export default function AgentProfileSettings() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState({
    emailNotifications: true,
    smsNotifications: true,
    whatsappNotifications: false,
    leadAssignments: true,
    commissionUpdates: true,
    performanceAlerts: true,
  });

  const { data: profileData, isLoading, error } = useQuery({
    queryKey: ['/api/agent/profile'],
  });

  const profile = (profileData as any);

  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      territory: '',
    },
  });

  const bankForm = useForm<z.infer<typeof bankDetailsSchema>>({
    resolver: zodResolver(bankDetailsSchema),
    defaultValues: {
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      panCard: '',
    },
  });

  useEffect(() => {
    if (profile) {
      profileForm.reset({
        name: profile.name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        territory: profile.territory || '',
      });
      
      bankForm.reset({
        bankName: profile.bankName || '',
        accountNumber: '',
        ifscCode: profile.ifscCode || '',
        panCard: profile.panCard || '',
      });

      if (profile.notifications) {
        setNotificationPrefs(profile.notifications);
      }
    }
  }, [profile, profileForm, bankForm]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileFormSchema>) => {
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
    mutationFn: async (data: z.infer<typeof bankDetailsSchema>) => {
      return apiRequest('PUT', '/api/agent/bank-details', data);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Bank details updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update bank details',
        variant: 'destructive',
      });
    },
  });

  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: typeof notificationPrefs) => {
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
    if (profile?.referralCode) {
      navigator.clipboard.writeText(profile.referralCode);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Referral code copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const onProfileSubmit = (data: z.infer<typeof profileFormSchema>) => {
    updateProfileMutation.mutate(data);
  };

  const onBankSubmit = (data: z.infer<typeof bankDetailsSchema>) => {
    updateBankDetailsMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6 lg:p-8">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <Link href="/agent/dashboard">
              <Button variant="ghost" size="icon">
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
        <Skeleton className="h-12 w-full mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6 lg:p-8">
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
            </div>
          </div>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500 mb-4">Unable to load profile data. Please try again later.</p>
            <Button onClick={() => window.location.reload()} data-testid="button-retry">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

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
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormItem>
                      <FormLabel>Agent Code</FormLabel>
                      <Input
                        value={profile.agentCode || 'N/A'}
                        disabled
                        data-testid="input-agent-code"
                      />
                    </FormItem>
                    <FormField
                      control={profileForm.control}
                      name="territory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Territory</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-territory" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} data-testid="input-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormItem>
                      <FormLabel>Commission Rate</FormLabel>
                      <Input
                        value={`${profile.commissionRate || 0}%`}
                        disabled
                        data-testid="input-commission-rate"
                      />
                    </FormItem>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      data-testid="button-save-profile"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </Form>
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
            <CardContent>
              <Form {...bankForm}>
                <form onSubmit={bankForm.handleSubmit(onBankSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={bankForm.control}
                      name="bankName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="HDFC Bank" data-testid="input-bank-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={bankForm.control}
                      name="accountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter account number"
                              data-testid="input-account-number"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={bankForm.control}
                      name="ifscCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>IFSC Code</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="HDFC0001234" data-testid="input-ifsc-code" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={bankForm.control}
                      name="panCard"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PAN Card</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="ABCDE1234F" data-testid="input-pan-card" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      type="submit"
                      disabled={updateBankDetailsMutation.isPending}
                      data-testid="button-save-bank"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {updateBankDetailsMutation.isPending ? 'Saving...' : 'Save Bank Details'}
                    </Button>
                  </div>
                </form>
              </Form>
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
                      checked={notificationPrefs.emailNotifications}
                      onCheckedChange={(checked) =>
                        setNotificationPrefs({ ...notificationPrefs, emailNotifications: checked })
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
                      checked={notificationPrefs.smsNotifications}
                      onCheckedChange={(checked) =>
                        setNotificationPrefs({ ...notificationPrefs, smsNotifications: checked })
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
                      checked={notificationPrefs.whatsappNotifications}
                      onCheckedChange={(checked) =>
                        setNotificationPrefs({ ...notificationPrefs, whatsappNotifications: checked })
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
                      checked={notificationPrefs.leadAssignments}
                      onCheckedChange={(checked) =>
                        setNotificationPrefs({ ...notificationPrefs, leadAssignments: checked })
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
                      checked={notificationPrefs.commissionUpdates}
                      onCheckedChange={(checked) =>
                        setNotificationPrefs({ ...notificationPrefs, commissionUpdates: checked })
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
                      checked={notificationPrefs.performanceAlerts}
                      onCheckedChange={(checked) =>
                        setNotificationPrefs({ ...notificationPrefs, performanceAlerts: checked })
                      }
                      data-testid="switch-performance-alerts"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => updateNotificationsMutation.mutate(notificationPrefs)}
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
              {profile.referralCode && (
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
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Total Referrals</CardDescription>
                    <CardTitle className="text-2xl">{profile.totalReferrals || 0}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Active Referrals</CardDescription>
                    <CardTitle className="text-2xl text-green-600">
                      {profile.activeReferrals || 0}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Referral Earnings</CardDescription>
                    <CardTitle className="text-2xl text-primary">
                      ₹{(profile.referralEarnings || 0).toLocaleString('en-IN')}
                    </CardTitle>
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
