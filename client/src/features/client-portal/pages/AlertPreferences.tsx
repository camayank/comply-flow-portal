/**
 * Compliance Alert Preferences Page
 *
 * Allows clients to configure their compliance notification preferences including:
 * - Channel settings (email, SMS, WhatsApp, in-app)
 * - Compliance type preferences (GST, Income Tax, ROC, etc.)
 * - Alert severity settings
 * - Quiet hours configuration
 * - Test notifications
 */

import { useState } from "react";
import { DashboardLayout } from '@/layouts';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  BellOff,
  Mail,
  Phone,
  MessageSquare,
  Smartphone,
  Shield,
  AlertTriangle,
  Info,
  Clock,
  Calendar,
  Settings,
  Send,
  CheckCircle2,
  Loader2,
  ChevronRight,
  FileText,
  Building2,
  Receipt,
  Users,
  Gavel,
  RefreshCw,
  Save,
  TestTube2,
  Volume2,
  VolumeX,
  Moon,
  Sun,
  Zap,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";

// Types
interface ChannelSettings {
  enabled: boolean;
  primaryEmail?: string;
  secondaryEmail?: string | null;
  digestMode?: string;
  phoneNumber?: string;
  onlyCritical?: boolean;
  includeDocuments?: boolean;
  showBadge?: boolean;
  playSound?: boolean;
  deviceTokens?: string[];
}

interface ComplianceTypeSettings {
  enabled: boolean;
  reminderDays: number[];
  [key: string]: any;
}

interface SeveritySettings {
  enabled: boolean;
  channels: string[];
  sendImmediately: boolean;
}

interface AlertTypeSettings {
  enabled: boolean;
  description: string;
}

interface Preferences {
  notificationsEnabled: boolean;
  channels: {
    email: ChannelSettings;
    sms: ChannelSettings;
    whatsapp: ChannelSettings;
    inApp: ChannelSettings;
    push: ChannelSettings;
  };
  complianceTypes: {
    gst: ComplianceTypeSettings;
    income_tax: ComplianceTypeSettings;
    roc: ComplianceTypeSettings;
    pf_esi: ComplianceTypeSettings;
    other: ComplianceTypeSettings;
  };
  severityPreferences: {
    critical: SeveritySettings;
    warning: SeveritySettings;
    info: SeveritySettings;
  };
  alertTypes: Record<string, AlertTypeSettings>;
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
    exceptCritical: boolean;
  };
  escalation: {
    enabled: boolean;
    escalateAfterHours: number;
    escalateTo: string | null;
  };
}

// Channel icon component
const ChannelIcon = ({ channel, className }: { channel: string; className?: string }) => {
  const icons: Record<string, React.ReactNode> = {
    email: <Mail className={className} />,
    sms: <Phone className={className} />,
    whatsapp: <MessageSquare className={className} />,
    inApp: <Bell className={className} />,
    push: <Smartphone className={className} />,
  };
  return icons[channel] || <Bell className={className} />;
};

// Compliance type icon
const ComplianceIcon = ({ type, className }: { type: string; className?: string }) => {
  const icons: Record<string, React.ReactNode> = {
    gst: <Receipt className={className} />,
    income_tax: <FileText className={className} />,
    roc: <Building2 className={className} />,
    pf_esi: <Users className={className} />,
    other: <Gavel className={className} />,
  };
  return icons[type] || <FileText className={className} />;
};

// Severity badge
const SeverityBadge = ({ severity }: { severity: string }) => {
  const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
    critical: { variant: "destructive", icon: <AlertTriangle className="h-3 w-3" /> },
    warning: { variant: "secondary", icon: <AlertTriangle className="h-3 w-3" /> },
    info: { variant: "outline", icon: <Info className="h-3 w-3" /> },
  };
  const c = config[severity] || config.info;
  return (
    <Badge variant={c.variant} className="gap-1 capitalize">
      {c.icon}
      {severity}
    </Badge>
  );
};

// Channel settings card
const ChannelCard = ({
  channel,
  settings,
  onUpdate,
  onTest,
  isTesting,
}: {
  channel: string;
  settings: ChannelSettings;
  onUpdate: (updates: Partial<ChannelSettings>) => void;
  onTest: () => void;
  isTesting: boolean;
}) => {
  const channelNames: Record<string, string> = {
    email: 'Email',
    sms: 'SMS',
    whatsapp: 'WhatsApp',
    inApp: 'In-App',
    push: 'Push Notifications',
  };

  const channelDescriptions: Record<string, string> = {
    email: 'Receive detailed alerts and documents via email',
    sms: 'Get urgent alerts via SMS (charges may apply)',
    whatsapp: 'Receive alerts and documents on WhatsApp',
    inApp: 'See alerts within the application',
    push: 'Get instant notifications on your device',
  };

  return (
    <Card className={!settings.enabled ? 'opacity-60' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${settings.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
              <ChannelIcon channel={channel} className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">{channelNames[channel]}</CardTitle>
              <CardDescription className="text-xs">{channelDescriptions[channel]}</CardDescription>
            </div>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) => onUpdate({ enabled: checked })}
          />
        </div>
      </CardHeader>
      {settings.enabled && (
        <CardContent className="space-y-4">
          {/* Email specific settings */}
          {channel === 'email' && (
            <>
              <div className="space-y-2">
                <Label htmlFor={`${channel}-primary`}>Primary Email</Label>
                <Input
                  id={`${channel}-primary`}
                  type="email"
                  value={settings.primaryEmail || ''}
                  onChange={(e) => onUpdate({ primaryEmail: e.target.value })}
                  placeholder="your@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${channel}-digest`}>Notification Mode</Label>
                <Select
                  value={settings.digestMode || 'immediate'}
                  onValueChange={(value) => onUpdate({ digestMode: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="daily_digest">Daily Digest</SelectItem>
                    <SelectItem value="weekly_digest">Weekly Digest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* SMS specific settings */}
          {channel === 'sms' && (
            <>
              <div className="space-y-2">
                <Label htmlFor={`${channel}-phone`}>Phone Number</Label>
                <Input
                  id={`${channel}-phone`}
                  type="tel"
                  value={settings.phoneNumber || ''}
                  onChange={(e) => onUpdate({ phoneNumber: e.target.value })}
                  placeholder="+91-XXXXX-XXXXX"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Critical Alerts Only</Label>
                  <p className="text-xs text-muted-foreground">Only send SMS for critical alerts to reduce costs</p>
                </div>
                <Switch
                  checked={settings.onlyCritical || false}
                  onCheckedChange={(checked) => onUpdate({ onlyCritical: checked })}
                />
              </div>
            </>
          )}

          {/* WhatsApp specific settings */}
          {channel === 'whatsapp' && (
            <>
              <div className="space-y-2">
                <Label htmlFor={`${channel}-phone`}>WhatsApp Number</Label>
                <Input
                  id={`${channel}-phone`}
                  type="tel"
                  value={settings.phoneNumber || ''}
                  onChange={(e) => onUpdate({ phoneNumber: e.target.value })}
                  placeholder="+91-XXXXX-XXXXX"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Include Documents</Label>
                  <p className="text-xs text-muted-foreground">Send related documents with alerts</p>
                </div>
                <Switch
                  checked={settings.includeDocuments || false}
                  onCheckedChange={(checked) => onUpdate({ includeDocuments: checked })}
                />
              </div>
            </>
          )}

          {/* In-App specific settings */}
          {channel === 'inApp' && (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Badge Count</Label>
                  <p className="text-xs text-muted-foreground">Display unread count on notification icon</p>
                </div>
                <Switch
                  checked={settings.showBadge || false}
                  onCheckedChange={(checked) => onUpdate({ showBadge: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sound Alerts</Label>
                  <p className="text-xs text-muted-foreground">Play sound for new notifications</p>
                </div>
                <Switch
                  checked={settings.playSound || false}
                  onCheckedChange={(checked) => onUpdate({ playSound: checked })}
                />
              </div>
            </>
          )}

          {/* Test button for email, sms, whatsapp */}
          {['email', 'sms', 'whatsapp'].includes(channel) && (
            <Button variant="outline" size="sm" onClick={onTest} disabled={isTesting} className="w-full">
              {isTesting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <TestTube2 className="h-4 w-4 mr-2" />
                  Send Test Notification
                </>
              )}
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
};

// Compliance type settings
const ComplianceTypeCard = ({
  type,
  settings,
  onUpdate,
}: {
  type: string;
  settings: ComplianceTypeSettings;
  onUpdate: (updates: Partial<ComplianceTypeSettings>) => void;
}) => {
  const typeNames: Record<string, string> = {
    gst: 'GST Compliances',
    income_tax: 'Income Tax',
    roc: 'ROC/MCA Filings',
    pf_esi: 'PF & ESI',
    other: 'Other Compliances',
  };

  const typeDescriptions: Record<string, string> = {
    gst: 'GSTR-1, GSTR-3B, Annual Returns',
    income_tax: 'TDS, Advance Tax, ITR',
    roc: 'AOC-4, MGT-7, DIR-3 KYC',
    pf_esi: 'Monthly & Annual filings',
    other: 'Trade license, FSSAI, etc.',
  };

  return (
    <Card className={!settings.enabled ? 'opacity-60' : ''}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${settings.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
              <ComplianceIcon type={type} className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-medium">{typeNames[type]}</h4>
              <p className="text-xs text-muted-foreground">{typeDescriptions[type]}</p>

              {settings.enabled && (
                <div className="mt-3 space-y-2">
                  <Label className="text-xs">Reminder Days Before Deadline</Label>
                  <div className="flex flex-wrap gap-1">
                    {[60, 30, 15, 7, 3, 1].map((day) => (
                      <Badge
                        key={day}
                        variant={settings.reminderDays?.includes(day) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => {
                          const current = settings.reminderDays || [];
                          const updated = current.includes(day)
                            ? current.filter(d => d !== day)
                            : [...current, day].sort((a, b) => b - a);
                          onUpdate({ reminderDays: updated });
                        }}
                      >
                        {day}d
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) => onUpdate({ enabled: checked })}
          />
        </div>
      </CardContent>
    </Card>
  );
};

// Main component
export default function ComplianceAlertPreferences() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [testingChannel, setTestingChannel] = useState<string | null>(null);

  // Fetch preferences
  const { data: preferences, isLoading } = useQuery<Preferences>({
    queryKey: ['/api/client/compliance-alerts/preferences'],
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (updates: Partial<Preferences>) => {
      const response = await fetch('/api/client/compliance-alerts/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to save preferences');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Preferences Saved",
        description: "Your notification preferences have been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/client/compliance-alerts/preferences'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Test notification mutation
  const testMutation = useMutation({
    mutationFn: async (channel: string) => {
      setTestingChannel(channel);
      const response = await fetch('/api/client/compliance-alerts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel }),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to send test');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Test Sent",
        description: data.note || "Test notification has been sent.",
      });
    },
    onError: () => {
      toast({
        title: "Test Failed",
        description: "Failed to send test notification.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setTestingChannel(null);
    },
  });

  // Local state for editing
  const [localPrefs, setLocalPrefs] = useState<Preferences | null>(null);

  // Sync local state with fetched data
  if (preferences && !localPrefs) {
    setLocalPrefs(preferences);
  }

  const handleChannelUpdate = (channel: string, updates: Partial<ChannelSettings>) => {
    if (!localPrefs) return;
    setLocalPrefs({
      ...localPrefs,
      channels: {
        ...localPrefs.channels,
        [channel]: { ...localPrefs.channels[channel as keyof typeof localPrefs.channels], ...updates },
      },
    });
  };

  const handleComplianceTypeUpdate = (type: string, updates: Partial<ComplianceTypeSettings>) => {
    if (!localPrefs) return;
    setLocalPrefs({
      ...localPrefs,
      complianceTypes: {
        ...localPrefs.complianceTypes,
        [type]: { ...localPrefs.complianceTypes[type as keyof typeof localPrefs.complianceTypes], ...updates },
      },
    });
  };

  const handleSave = () => {
    if (localPrefs) {
      saveMutation.mutate(localPrefs);
    }
  };

  if (isLoading || !localPrefs) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <DashboardLayout>
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Compliance Alert Preferences
          </h1>
          <p className="text-muted-foreground">
            Configure how and when you want to be notified about compliance deadlines and updates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 mr-4">
            <Label htmlFor="master-toggle">Notifications</Label>
            <Switch
              id="master-toggle"
              checked={localPrefs.notificationsEnabled}
              onCheckedChange={(checked) => setLocalPrefs({ ...localPrefs, notificationsEnabled: checked })}
            />
          </div>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Disabled state alert */}
      {!localPrefs.notificationsEnabled && (
        <Alert variant="destructive">
          <BellOff className="h-4 w-4" />
          <AlertTitle>Notifications Disabled</AlertTitle>
          <AlertDescription>
            You won't receive any compliance alerts. Enable notifications to stay informed about important deadlines.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className={!localPrefs.notificationsEnabled ? 'opacity-50 pointer-events-none' : ''}>
        <Tabs defaultValue="channels" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="channels">Channels</TabsTrigger>
            <TabsTrigger value="compliance">Compliance Types</TabsTrigger>
            <TabsTrigger value="alerts">Alert Settings</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
          </TabsList>

          {/* Channels Tab */}
          <TabsContent value="channels" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(localPrefs.channels).map(([channel, settings]) => (
                <ChannelCard
                  key={channel}
                  channel={channel}
                  settings={settings}
                  onUpdate={(updates) => handleChannelUpdate(channel, updates)}
                  onTest={() => testMutation.mutate(channel)}
                  isTesting={testingChannel === channel}
                />
              ))}
            </div>
          </TabsContent>

          {/* Compliance Types Tab */}
          <TabsContent value="compliance" className="mt-6">
            <div className="space-y-4">
              {Object.entries(localPrefs.complianceTypes).map(([type, settings]) => (
                <ComplianceTypeCard
                  key={type}
                  type={type}
                  settings={settings}
                  onUpdate={(updates) => handleComplianceTypeUpdate(type, updates)}
                />
              ))}
            </div>
          </TabsContent>

          {/* Alert Settings Tab */}
          <TabsContent value="alerts" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Severity Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Severity Levels</CardTitle>
                  <CardDescription>Configure how you receive alerts based on severity</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(localPrefs.severityPreferences).map(([severity, settings]) => (
                    <div key={severity} className="flex items-start justify-between p-3 border rounded-lg">
                      <div className="flex items-start gap-3">
                        <SeverityBadge severity={severity} />
                        <div className="space-y-1">
                          <div className="flex flex-wrap gap-1">
                            {settings.channels.map((ch) => (
                              <Badge key={ch} variant="outline" className="text-xs">
                                <ChannelIcon channel={ch} className="h-3 w-3 mr-1" />
                                {ch}
                              </Badge>
                            ))}
                          </div>
                          {settings.sendImmediately && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              Sent immediately
                            </p>
                          )}
                        </div>
                      </div>
                      <Switch
                        checked={settings.enabled}
                        onCheckedChange={(checked) => {
                          setLocalPrefs({
                            ...localPrefs,
                            severityPreferences: {
                              ...localPrefs.severityPreferences,
                              [severity]: { ...settings, enabled: checked },
                            },
                          });
                        }}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Alert Types */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Alert Types</CardTitle>
                  <CardDescription>Choose which types of alerts you want to receive</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {Object.entries(localPrefs.alertTypes).map(([type, settings]) => (
                        <div key={type} className="flex items-center justify-between p-2 hover:bg-muted rounded">
                          <div className="space-y-0.5">
                            <Label className="font-normal capitalize">{type.replace(/_/g, ' ')}</Label>
                            <p className="text-xs text-muted-foreground">{settings.description}</p>
                          </div>
                          <Switch
                            checked={settings.enabled}
                            onCheckedChange={(checked) => {
                              setLocalPrefs({
                                ...localPrefs,
                                alertTypes: {
                                  ...localPrefs.alertTypes,
                                  [type]: { ...settings, enabled: checked },
                                },
                              });
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quiet Hours */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Moon className="h-4 w-4" />
                        Quiet Hours
                      </CardTitle>
                      <CardDescription>Pause non-critical notifications during specific hours</CardDescription>
                    </div>
                    <Switch
                      checked={localPrefs.quietHours.enabled}
                      onCheckedChange={(checked) => {
                        setLocalPrefs({
                          ...localPrefs,
                          quietHours: { ...localPrefs.quietHours, enabled: checked },
                        });
                      }}
                    />
                  </div>
                </CardHeader>
                {localPrefs.quietHours.enabled && (
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Time</Label>
                        <Input
                          type="time"
                          value={localPrefs.quietHours.startTime}
                          onChange={(e) => {
                            setLocalPrefs({
                              ...localPrefs,
                              quietHours: { ...localPrefs.quietHours, startTime: e.target.value },
                            });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Time</Label>
                        <Input
                          type="time"
                          value={localPrefs.quietHours.endTime}
                          onChange={(e) => {
                            setLocalPrefs({
                              ...localPrefs,
                              quietHours: { ...localPrefs.quietHours, endTime: e.target.value },
                            });
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Allow Critical Alerts</Label>
                        <p className="text-xs text-muted-foreground">Still receive critical alerts during quiet hours</p>
                      </div>
                      <Switch
                        checked={localPrefs.quietHours.exceptCritical}
                        onCheckedChange={(checked) => {
                          setLocalPrefs({
                            ...localPrefs,
                            quietHours: { ...localPrefs.quietHours, exceptCritical: checked },
                          });
                        }}
                      />
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Escalation Settings */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Escalation
                      </CardTitle>
                      <CardDescription>Escalate alerts if not acknowledged</CardDescription>
                    </div>
                    <Switch
                      checked={localPrefs.escalation.enabled}
                      onCheckedChange={(checked) => {
                        setLocalPrefs({
                          ...localPrefs,
                          escalation: { ...localPrefs.escalation, enabled: checked },
                        });
                      }}
                    />
                  </div>
                </CardHeader>
                {localPrefs.escalation.enabled && (
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Escalate After (hours)</Label>
                      <Select
                        value={String(localPrefs.escalation.escalateAfterHours)}
                        onValueChange={(value) => {
                          setLocalPrefs({
                            ...localPrefs,
                            escalation: { ...localPrefs.escalation, escalateAfterHours: parseInt(value) },
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="12">12 hours</SelectItem>
                          <SelectItem value="24">24 hours</SelectItem>
                          <SelectItem value="48">48 hours</SelectItem>
                          <SelectItem value="72">72 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Escalation Email (Optional)</Label>
                      <Input
                        type="email"
                        value={localPrefs.escalation.escalateTo || ''}
                        onChange={(e) => {
                          setLocalPrefs({
                            ...localPrefs,
                            escalation: { ...localPrefs.escalation, escalateTo: e.target.value || null },
                          });
                        }}
                        placeholder="manager@company.com"
                      />
                      <p className="text-xs text-muted-foreground">
                        Send escalation to this email in addition to your primary email
                      </p>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Quick Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLocalPrefs({
                  ...localPrefs,
                  channels: Object.fromEntries(
                    Object.entries(localPrefs.channels).map(([k, v]) => [k, { ...v, enabled: true }])
                  ) as typeof localPrefs.channels,
                });
                toast({ title: "All channels enabled" });
              }}
            >
              Enable All Channels
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLocalPrefs({
                  ...localPrefs,
                  complianceTypes: Object.fromEntries(
                    Object.entries(localPrefs.complianceTypes).map(([k, v]) => [k, { ...v, enabled: true }])
                  ) as typeof localPrefs.complianceTypes,
                });
                toast({ title: "All compliance types enabled" });
              }}
            >
              Enable All Compliance Types
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLocalPrefs({
                  ...localPrefs,
                  alertTypes: Object.fromEntries(
                    Object.entries(localPrefs.alertTypes).map(([k, v]) => [k, { ...v, enabled: true }])
                  ),
                });
                toast({ title: "All alert types enabled" });
              }}
            >
              Enable All Alert Types
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
    </DashboardLayout>
  );
}
