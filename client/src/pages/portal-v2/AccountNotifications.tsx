/**
 * Notification Preferences Page
 *
 * User interface for managing notification preferences:
 * - Channel toggles (email, SMS, WhatsApp, push, in-app)
 * - Notification type selection
 * - Quiet hours configuration
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Moon,
  Clock,
  RefreshCw,
  CheckCircle,
  Volume2,
  VolumeX,
  Globe,
  Save,
} from 'lucide-react';

interface NotificationPreference {
  notificationType: string;
  channels: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
    push: boolean;
    inApp: boolean;
  };
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  enabled: boolean;
}

interface QuietHours {
  enabled: boolean;
  startTime: string;
  endTime: string;
  timezone: string;
}

const NOTIFICATION_CATEGORIES = {
  compliance: {
    label: 'Compliance',
    description: 'Notifications about compliance deadlines and status',
    icon: CheckCircle,
    types: [
      { type: 'compliance.deadline_approaching', label: 'Deadline Approaching' },
      { type: 'compliance.deadline_missed', label: 'Deadline Missed' },
      { type: 'compliance.status_changed', label: 'Status Changed' },
      { type: 'compliance.action_required', label: 'Action Required' },
    ],
  },
  documents: {
    label: 'Documents',
    description: 'Notifications about document updates',
    icon: Mail,
    types: [
      { type: 'document.uploaded', label: 'Document Uploaded' },
      { type: 'document.signed', label: 'Document Signed' },
      { type: 'document.expiring', label: 'Document Expiring' },
      { type: 'document.rejected', label: 'Document Rejected' },
    ],
  },
  services: {
    label: 'Services',
    description: 'Notifications about service requests',
    icon: RefreshCw,
    types: [
      { type: 'service.request_created', label: 'Request Created' },
      { type: 'service.request_updated', label: 'Request Updated' },
      { type: 'service.request_completed', label: 'Request Completed' },
      { type: 'service.payment_received', label: 'Payment Received' },
    ],
  },
  tasks: {
    label: 'Tasks',
    description: 'Notifications about assigned tasks',
    icon: Clock,
    types: [
      { type: 'task.assigned', label: 'Task Assigned' },
      { type: 'task.due_soon', label: 'Task Due Soon' },
      { type: 'task.overdue', label: 'Task Overdue' },
      { type: 'task.completed', label: 'Task Completed' },
    ],
  },
  system: {
    label: 'System',
    description: 'System notifications and alerts',
    icon: Bell,
    types: [
      { type: 'system.announcement', label: 'Announcement' },
      { type: 'system.maintenance', label: 'Maintenance Notice' },
      { type: 'system.security_alert', label: 'Security Alert' },
      { type: 'security.login_new_device', label: 'New Device Login' },
    ],
  },
};

const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central Europe (CET)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
];

export default function AccountNotifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current preferences
  const { data: preferencesData, isLoading } = useQuery({
    queryKey: ['/api/notification-preferences'],
  });

  // Local state for preferences
  const [preferences, setPreferences] = useState<Record<string, NotificationPreference>>({});
  const [quietHours, setQuietHours] = useState<QuietHours>({
    enabled: false,
    startTime: '22:00',
    endTime: '07:00',
    timezone: 'Asia/Kolkata',
  });
  const [globalEmail, setGlobalEmail] = useState(true);
  const [globalSms, setGlobalSms] = useState(false);
  const [globalWhatsapp, setGlobalWhatsapp] = useState(false);
  const [globalPush, setGlobalPush] = useState(true);
  const [globalInApp, setGlobalInApp] = useState(true);

  // Initialize from fetched data
  useEffect(() => {
    if (preferencesData) {
      const data = preferencesData as any;
      if (data.preferences) {
        const prefs: Record<string, NotificationPreference> = {};
        data.preferences.forEach((p: any) => {
          prefs[p.notificationType] = p;
        });
        setPreferences(prefs);
      }
      if (data.quietHours) {
        setQuietHours(data.quietHours);
      }
      if (data.globalChannels) {
        setGlobalEmail(data.globalChannels.email ?? true);
        setGlobalSms(data.globalChannels.sms ?? false);
        setGlobalWhatsapp(data.globalChannels.whatsapp ?? false);
        setGlobalPush(data.globalChannels.push ?? true);
        setGlobalInApp(data.globalChannels.inApp ?? true);
      }
    }
  }, [preferencesData]);

  // Save preferences mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/notification-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          preferences: Object.values(preferences),
          quietHours,
          globalChannels: {
            email: globalEmail,
            sms: globalSms,
            whatsapp: globalWhatsapp,
            push: globalPush,
            inApp: globalInApp,
          },
        }),
      });
      if (!response.ok) throw new Error('Failed to save preferences');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notification-preferences'] });
      toast({
        title: 'Preferences Saved',
        description: 'Your notification preferences have been updated',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to save notification preferences',
        variant: 'destructive',
      });
    },
  });

  // Update quiet hours mutation
  const updateQuietHoursMutation = useMutation({
    mutationFn: async (data: QuietHours) => {
      const response = await fetch('/api/notification-preferences/quiet-hours', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update quiet hours');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notification-preferences'] });
      toast({
        title: 'Quiet Hours Updated',
        description: 'Your quiet hours settings have been saved',
      });
    },
  });

  const togglePreference = (type: string, field: keyof NotificationPreference['channels']) => {
    setPreferences((prev) => {
      const existing = prev[type] || {
        notificationType: type,
        channels: { email: true, sms: false, whatsapp: false, push: true, inApp: true },
        frequency: 'immediate' as const,
        enabled: true,
      };
      return {
        ...prev,
        [type]: {
          ...existing,
          channels: {
            ...existing.channels,
            [field]: !existing.channels[field],
          },
        },
      };
    });
  };

  const setFrequency = (type: string, frequency: NotificationPreference['frequency']) => {
    setPreferences((prev) => {
      const existing = prev[type] || {
        notificationType: type,
        channels: { email: true, sms: false, whatsapp: false, push: true, inApp: true },
        frequency: 'immediate' as const,
        enabled: true,
      };
      return {
        ...prev,
        [type]: {
          ...existing,
          frequency,
        },
      };
    });
  };

  const toggleEnabled = (type: string) => {
    setPreferences((prev) => {
      const existing = prev[type] || {
        notificationType: type,
        channels: { email: true, sms: false, whatsapp: false, push: true, inApp: true },
        frequency: 'immediate' as const,
        enabled: true,
      };
      return {
        ...prev,
        [type]: {
          ...existing,
          enabled: !existing.enabled,
        },
      };
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="w-8 h-8" />
            Notification Preferences
          </h1>
          <p className="text-muted-foreground mt-1">
            Control how and when you receive notifications
          </p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Tabs defaultValue="channels" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="notifications">Notification Types</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="channels">
          <Card>
            <CardHeader>
              <CardTitle>Global Channel Settings</CardTitle>
              <CardDescription>
                Enable or disable notification channels globally
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-blue-100">
                      <Mail className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <Label className="text-base">Email</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via email
                      </p>
                    </div>
                  </div>
                  <Switch checked={globalEmail} onCheckedChange={setGlobalEmail} />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-green-100">
                      <MessageSquare className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <Label className="text-base">SMS</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive text messages
                      </p>
                    </div>
                  </div>
                  <Switch checked={globalSms} onCheckedChange={setGlobalSms} />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-emerald-100">
                      <svg className="w-5 h-5 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </div>
                    <div>
                      <Label className="text-base">WhatsApp</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive WhatsApp messages
                      </p>
                    </div>
                  </div>
                  <Switch checked={globalWhatsapp} onCheckedChange={setGlobalWhatsapp} />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-purple-100">
                      <Smartphone className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <Label className="text-base">Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Browser & mobile push
                      </p>
                    </div>
                  </div>
                  <Switch checked={globalPush} onCheckedChange={setGlobalPush} />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-orange-100">
                      <Bell className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <Label className="text-base">In-App</Label>
                      <p className="text-sm text-muted-foreground">
                        Notifications within the app
                      </p>
                    </div>
                  </div>
                  <Switch checked={globalInApp} onCheckedChange={setGlobalInApp} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Types</CardTitle>
              <CardDescription>
                Configure how you receive each type of notification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="space-y-2">
                {Object.entries(NOTIFICATION_CATEGORIES).map(([key, category]) => {
                  const Icon = category.icon;
                  return (
                    <AccordionItem key={key} value={key} className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5" />
                          <div className="text-left">
                            <div className="font-medium">{category.label}</div>
                            <div className="text-sm text-muted-foreground">
                              {category.description}
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-4 pb-2">
                        <div className="space-y-4">
                          {category.types.map((item) => {
                            const pref = preferences[item.type] || {
                              notificationType: item.type,
                              channels: { email: true, sms: false, whatsapp: false, push: true, inApp: true },
                              frequency: 'immediate' as const,
                              enabled: true,
                            };
                            return (
                              <div
                                key={item.type}
                                className={`p-4 rounded-lg border ${
                                  pref.enabled ? 'bg-background' : 'bg-muted/50'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={pref.enabled}
                                      onCheckedChange={() => toggleEnabled(item.type)}
                                    />
                                    <Label className="font-medium">{item.label}</Label>
                                  </div>
                                  <Select
                                    value={pref.frequency}
                                    onValueChange={(value) =>
                                      setFrequency(item.type, value as NotificationPreference['frequency'])
                                    }
                                    disabled={!pref.enabled}
                                  >
                                    <SelectTrigger className="w-32">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="immediate">Immediate</SelectItem>
                                      <SelectItem value="hourly">Hourly</SelectItem>
                                      <SelectItem value="daily">Daily</SelectItem>
                                      <SelectItem value="weekly">Weekly</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                {pref.enabled && (
                                  <div className="flex gap-2 mt-2">
                                    <Badge
                                      variant={pref.channels.email ? 'default' : 'outline'}
                                      className="cursor-pointer"
                                      onClick={() => togglePreference(item.type, 'email')}
                                    >
                                      <Mail className="w-3 h-3 mr-1" /> Email
                                    </Badge>
                                    <Badge
                                      variant={pref.channels.sms ? 'default' : 'outline'}
                                      className="cursor-pointer"
                                      onClick={() => togglePreference(item.type, 'sms')}
                                    >
                                      <MessageSquare className="w-3 h-3 mr-1" /> SMS
                                    </Badge>
                                    <Badge
                                      variant={pref.channels.push ? 'default' : 'outline'}
                                      className="cursor-pointer"
                                      onClick={() => togglePreference(item.type, 'push')}
                                    >
                                      <Smartphone className="w-3 h-3 mr-1" /> Push
                                    </Badge>
                                    <Badge
                                      variant={pref.channels.inApp ? 'default' : 'outline'}
                                      className="cursor-pointer"
                                      onClick={() => togglePreference(item.type, 'inApp')}
                                    >
                                      <Bell className="w-3 h-3 mr-1" /> In-App
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="w-5 h-5" />
                Quiet Hours
              </CardTitle>
              <CardDescription>
                Pause notifications during specific hours
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  {quietHours.enabled ? (
                    <VolumeX className="w-6 h-6 text-orange-600" />
                  ) : (
                    <Volume2 className="w-6 h-6 text-muted-foreground" />
                  )}
                  <div>
                    <Label className="text-base">Enable Quiet Hours</Label>
                    <p className="text-sm text-muted-foreground">
                      Pause non-urgent notifications during set hours
                    </p>
                  </div>
                </div>
                <Switch
                  checked={quietHours.enabled}
                  onCheckedChange={(enabled) => setQuietHours({ ...quietHours, enabled })}
                />
              </div>

              {quietHours.enabled && (
                <div className="grid gap-6 md:grid-cols-3 p-4 rounded-lg border bg-muted/30">
                  <div className="space-y-2">
                    <Label htmlFor="startTime" className="flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Start Time
                    </Label>
                    <input
                      type="time"
                      id="startTime"
                      value={quietHours.startTime}
                      onChange={(e) =>
                        setQuietHours({ ...quietHours, startTime: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-md border bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime" className="flex items-center gap-2">
                      <Clock className="w-4 h-4" /> End Time
                    </Label>
                    <input
                      type="time"
                      id="endTime"
                      value={quietHours.endTime}
                      onChange={(e) =>
                        setQuietHours({ ...quietHours, endTime: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-md border bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone" className="flex items-center gap-2">
                      <Globe className="w-4 h-4" /> Timezone
                    </Label>
                    <Select
                      value={quietHours.timezone}
                      onValueChange={(value) =>
                        setQuietHours({ ...quietHours, timezone: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={() => updateQuietHoursMutation.mutate(quietHours)}
                  disabled={updateQuietHoursMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Quiet Hours
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
