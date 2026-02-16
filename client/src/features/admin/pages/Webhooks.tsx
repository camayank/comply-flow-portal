/**
 * Webhook Management Page
 *
 * Admin interface for managing outbound webhooks:
 * - Create, edit, and delete webhook endpoints
 * - View delivery history and retry failed deliveries
 * - Test webhook endpoints
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout, PageShell } from '@/layouts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  LayoutDashboard,
  FileBarChart,
  Users,
  Building2,
  Shield,
  Settings,
  FileText,
  Webhook as WebhookIcon,
  Key as KeyIcon,
  ClipboardCheck,
  Blocks,
  Server,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Webhook,
  Plus,
  RefreshCw,
  Trash2,
  Edit2,
  Key,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

interface WebhookEndpoint {
  id: number;
  name: string;
  url: string;
  secret: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface WebhookDelivery {
  id: number;
  endpointId: number;
  eventType: string;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  statusCode?: number;
  responseTimeMs?: number;
  attemptCount: number;
  createdAt: string;
  completedAt?: string;
}

interface WebhookEvent {
  key: string;
  type: string;
  category: string;
}

const adminNavigation = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { label: "Reports", href: "/admin/reports", icon: FileBarChart },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Clients", href: "/admin/clients", icon: Building2 },
      { label: "Access Reviews", href: "/admin/access-reviews", icon: ClipboardCheck },
    ],
  },
  {
    title: "Configuration",
    items: [
      { label: "Blueprints", href: "/admin/blueprints", icon: Blocks },
      { label: "Services", href: "/admin/services", icon: Server },
      { label: "Documents", href: "/admin/documents", icon: FileText },
    ],
  },
  {
    title: "Developer",
    items: [
      { label: "Webhooks", href: "/admin/webhooks", icon: WebhookIcon },
      { label: "API Keys", href: "/admin/api-keys", icon: KeyIcon },
    ],
  },
];

const adminUser = {
  name: "Admin",
  email: "admin@digicomply.com",
};

export default function WebhookManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<WebhookEndpoint | null>(null);
  const [newEndpoint, setNewEndpoint] = useState({
    name: '',
    url: '',
    events: [] as string[],
  });

  // Fetch webhook endpoints
  const { data: endpointsData, isLoading: loadingEndpoints } = useQuery({
    queryKey: ['/api/webhooks/endpoints'],
  });

  // Fetch available events
  const { data: eventsData } = useQuery({
    queryKey: ['/api/webhooks/events'],
  });

  // Fetch webhook stats
  const { data: statsData } = useQuery({
    queryKey: ['/api/webhooks/stats'],
  });

  // Fetch recent deliveries
  const { data: deliveriesData } = useQuery({
    queryKey: ['/api/webhooks/deliveries', { limit: 50 }],
  });

  // Create endpoint mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof newEndpoint) => {
      const response = await fetch('/api/webhooks/endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create endpoint');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/webhooks/endpoints'] });
      setIsCreateOpen(false);
      setNewEndpoint({ name: '', url: '', events: [] });
      toast({
        title: 'Webhook Created',
        description: `Save your secret: ${data.endpoint.secret}`,
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create webhook endpoint',
        variant: 'destructive',
      });
    },
  });

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/webhooks/endpoints/${id}/toggle`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to toggle endpoint');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/webhooks/endpoints'] });
    },
  });

  // Test endpoint mutation
  const testMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/webhooks/endpoints/${id}/test`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Test failed');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Test Successful',
        description: `Response time: ${data.responseTimeMs}ms`,
      });
    },
    onError: () => {
      toast({
        title: 'Test Failed',
        description: 'Could not reach the webhook endpoint',
        variant: 'destructive',
      });
    },
  });

  // Retry delivery mutation
  const retryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/webhooks/deliveries/${id}/retry`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Retry failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/webhooks/deliveries'] });
      toast({
        title: 'Retry Queued',
        description: 'The delivery will be retried shortly',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/webhooks/endpoints/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/webhooks/endpoints'] });
      toast({
        title: 'Endpoint Deleted',
        description: 'Webhook endpoint has been removed',
      });
    },
  });

  // Rotate secret mutation
  const rotateSecretMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/webhooks/endpoints/${id}/rotate-secret`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to rotate secret');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Secret Rotated',
        description: `New secret: ${data.secret}`,
      });
    },
  });

  const endpoints = (endpointsData as any)?.endpoints || [];
  const events = (eventsData as any)?.events || [];
  const stats = (statsData as any) || {};
  const deliveries = (deliveriesData as any)?.deliveries || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Success</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'retrying':
        return <Badge className="bg-orange-100 text-orange-800"><RefreshCw className="w-3 h-3 mr-1" /> Retrying</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout
      navigation={adminNavigation}
      user={adminUser}
      logo={<span className="text-xl font-bold text-primary">DigiComply</span>}
    >
      <PageShell
        title="Webhook Management"
        subtitle="Configure and monitor outbound webhooks for real-time event notifications"
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Webhooks" },
        ]}
        actions={
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Webhook
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Webhook Endpoint</DialogTitle>
                <DialogDescription>
                  Add a new endpoint to receive event notifications
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="My Webhook"
                    value={newEndpoint.name}
                    onChange={(e) => setNewEndpoint({ ...newEndpoint, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="url">Endpoint URL</Label>
                  <Input
                    id="url"
                    placeholder="https://your-server.com/webhook"
                    value={newEndpoint.url}
                    onChange={(e) => setNewEndpoint({ ...newEndpoint, url: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Events to Subscribe</Label>
                  <div className="mt-2 max-h-48 overflow-y-auto border rounded-md p-2">
                    {events.map((event: WebhookEvent) => (
                      <label key={event.key} className="flex items-center space-x-2 py-1">
                        <input
                          type="checkbox"
                          checked={newEndpoint.events.includes(event.type)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewEndpoint({
                                ...newEndpoint,
                                events: [...newEndpoint.events, event.type],
                              });
                            } else {
                              setNewEndpoint({
                                ...newEndpoint,
                                events: newEndpoint.events.filter((t) => t !== event.type),
                              });
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{event.type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => createMutation.mutate(newEndpoint)}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Webhook'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      >
        {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Endpoints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.endpoints?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats.endpoints?.active || 0} active, {stats.endpoints?.inactive || 0} inactive
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.successRate || '0%'}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.deliveries?.total || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.summary?.pendingDeliveries || 0}
            </div>
            <p className="text-xs text-muted-foreground">In queue</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="endpoints" className="space-y-4">
        <TabsList>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="deliveries">Delivery History</TabsTrigger>
          <TabsTrigger value="events">Available Events</TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Endpoints</CardTitle>
              <CardDescription>
                Manage your configured webhook endpoints
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingEndpoints ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                </div>
              ) : endpoints.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Webhook className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No webhook endpoints configured</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setIsCreateOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create your first webhook
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Events</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {endpoints.map((endpoint: WebhookEndpoint) => (
                      <TableRow key={endpoint.id}>
                        <TableCell className="font-medium">{endpoint.name}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {endpoint.url.length > 40
                              ? endpoint.url.slice(0, 40) + '...'
                              : endpoint.url}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {endpoint.events?.length || 0} events
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={endpoint.isActive}
                            onCheckedChange={() => toggleMutation.mutate(endpoint.id)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => testMutation.mutate(endpoint.id)}
                              disabled={testMutation.isPending}
                            >
                              <Play className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rotateSecretMutation.mutate(endpoint.id)}
                            >
                              <Key className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteMutation.mutate(endpoint.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deliveries">
          <Card>
            <CardHeader>
              <CardTitle>Delivery History</CardTitle>
              <CardDescription>
                Recent webhook delivery attempts and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {deliveries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No deliveries yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Response Code</TableHead>
                      <TableHead>Response Time</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveries.map((delivery: WebhookDelivery) => (
                      <TableRow key={delivery.id}>
                        <TableCell>
                          <code className="text-xs">{delivery.eventType}</code>
                        </TableCell>
                        <TableCell>{getStatusBadge(delivery.status)}</TableCell>
                        <TableCell>{delivery.statusCode || '-'}</TableCell>
                        <TableCell>
                          {delivery.responseTimeMs ? `${delivery.responseTimeMs}ms` : '-'}
                        </TableCell>
                        <TableCell>{delivery.attemptCount}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(delivery.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {delivery.status === 'failed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => retryMutation.mutate(delivery.id)}
                            >
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Retry
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Available Webhook Events</CardTitle>
              <CardDescription>
                Events that can trigger webhook notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Object.entries(
                  events.reduce((acc: Record<string, WebhookEvent[]>, event: WebhookEvent) => {
                    if (!acc[event.category]) acc[event.category] = [];
                    acc[event.category].push(event);
                    return acc;
                  }, {})
                ).map(([category, categoryEvents]) => (
                  <Card key={category}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm capitalize">{category}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {(categoryEvents as WebhookEvent[]).map((event) => (
                          <li key={event.key} className="text-xs text-muted-foreground">
                            {event.type}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </PageShell>
    </DashboardLayout>
  );
}
