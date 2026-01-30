/**
 * API Key Management Page
 *
 * Admin interface for managing API keys:
 * - Create, revoke, and rotate API keys
 * - View usage statistics
 * - Configure rate limits and IP whitelists
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Key,
  Plus,
  RefreshCw,
  Trash2,
  Copy,
  Shield,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  BarChart3,
} from 'lucide-react';

interface APIKey {
  id: number;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimit: number;
  rateLimitWindow: string;
  ipWhitelist: string[] | null;
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  usageCount: number;
  createdAt: string;
}

interface UsageLog {
  id: number;
  apiKeyId: number;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  ipAddress: string;
  createdAt: string;
}

export default function APIKeyManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  const [selectedKeyId, setSelectedKeyId] = useState<number | null>(null);
  const [newKey, setNewKey] = useState({
    name: '',
    scopes: [] as string[],
    rateLimit: 1000,
    rateLimitWindow: 'hour',
    ipWhitelist: '',
    expiresInDays: '',
  });

  // Fetch API keys
  const { data: keysData, isLoading: loadingKeys } = useQuery({
    queryKey: ['/api/api-keys'],
  });

  // Fetch available scopes
  const { data: scopesData } = useQuery({
    queryKey: ['/api/api-keys/scopes'],
  });

  // Fetch usage logs for selected key
  const { data: usageData } = useQuery({
    queryKey: ['/api/api-keys', selectedKeyId, 'usage'],
    enabled: !!selectedKeyId,
  });

  // Create key mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof newKey) => {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          ipWhitelist: data.ipWhitelist
            ? data.ipWhitelist.split(',').map((ip) => ip.trim())
            : null,
          expiresInDays: data.expiresInDays ? parseInt(data.expiresInDays) : undefined,
        }),
      });
      if (!response.ok) throw new Error('Failed to create API key');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/api-keys'] });
      setIsCreateOpen(false);
      setShowNewKey(data.fullKey);
      setNewKey({
        name: '',
        scopes: [],
        rateLimit: 1000,
        rateLimitWindow: 'hour',
        ipWhitelist: '',
        expiresInDays: '',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create API key',
        variant: 'destructive',
      });
    },
  });

  // Revoke key mutation
  const revokeMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/api-keys/${id}/revoke`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to revoke key');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/api-keys'] });
      toast({
        title: 'Key Revoked',
        description: 'The API key has been deactivated',
      });
    },
  });

  // Rotate key mutation
  const rotateMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/api-keys/${id}/rotate`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to rotate key');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/api-keys'] });
      setShowNewKey(data.fullKey);
    },
  });

  // Delete key mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/api-keys/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete key');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/api-keys'] });
      toast({
        title: 'Key Deleted',
        description: 'The API key has been permanently removed',
      });
    },
  });

  const keys = (keysData as any)?.keys || [];
  const scopes = (scopesData as any)?.scopes || [];
  const usageLogs = (usageData as any)?.logs || [];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'API key copied to clipboard',
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Key className="w-8 h-8" />
            API Key Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate and manage API keys for external integrations
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Generate New Key
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Generate API Key</DialogTitle>
              <DialogDescription>
                Create a new API key for external integrations
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Key Name</Label>
                <Input
                  id="name"
                  placeholder="Production Integration"
                  value={newKey.name}
                  onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                />
              </div>
              <div>
                <Label>API Scopes</Label>
                <div className="mt-2 max-h-40 overflow-y-auto border rounded-md p-2">
                  {scopes.map((scope: { name: string; description: string }) => (
                    <label key={scope.name} className="flex items-center space-x-2 py-1">
                      <input
                        type="checkbox"
                        checked={newKey.scopes.includes(scope.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewKey({
                              ...newKey,
                              scopes: [...newKey.scopes, scope.name],
                            });
                          } else {
                            setNewKey({
                              ...newKey,
                              scopes: newKey.scopes.filter((s) => s !== scope.name),
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <div>
                        <span className="text-sm font-medium">{scope.name}</span>
                        <p className="text-xs text-muted-foreground">{scope.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rateLimit">Rate Limit</Label>
                  <Input
                    id="rateLimit"
                    type="number"
                    value={newKey.rateLimit}
                    onChange={(e) =>
                      setNewKey({ ...newKey, rateLimit: parseInt(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="rateLimitWindow">Per</Label>
                  <Select
                    value={newKey.rateLimitWindow}
                    onValueChange={(value) =>
                      setNewKey({ ...newKey, rateLimitWindow: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minute">Minute</SelectItem>
                      <SelectItem value="hour">Hour</SelectItem>
                      <SelectItem value="day">Day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="ipWhitelist">IP Whitelist (comma-separated)</Label>
                <Input
                  id="ipWhitelist"
                  placeholder="192.168.1.1, 10.0.0.0/8"
                  value={newKey.ipWhitelist}
                  onChange={(e) => setNewKey({ ...newKey, ipWhitelist: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="expiry">Expires In (days, optional)</Label>
                <Input
                  id="expiry"
                  type="number"
                  placeholder="Leave blank for no expiry"
                  value={newKey.expiresInDays}
                  onChange={(e) => setNewKey({ ...newKey, expiresInDays: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate(newKey)}
                disabled={createMutation.isPending || !newKey.name}
              >
                {createMutation.isPending ? 'Generating...' : 'Generate Key'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* New Key Dialog */}
      <Dialog open={!!showNewKey} onOpenChange={() => setShowNewKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              API Key Generated
            </DialogTitle>
            <DialogDescription>
              Copy this key now. You won't be able to see it again!
            </DialogDescription>
          </DialogHeader>
          <div className="my-4">
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 bg-muted rounded-md text-sm break-all">
                {showNewKey}
              </code>
              <Button
                size="icon"
                variant="outline"
                onClick={() => copyToClipboard(showNewKey || '')}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowNewKey(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{keys.length}</div>
            <p className="text-xs text-muted-foreground">
              {keys.filter((k: APIKey) => k.isActive).length} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total API Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {keys.reduce((sum: number, k: APIKey) => sum + (k.usageCount || 0), 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {keys.filter((k: APIKey) => {
                if (!k.expiresAt) return false;
                const daysUntilExpiry = Math.ceil(
                  (new Date(k.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );
                return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">Within 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revoked Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {keys.filter((k: APIKey) => !k.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">Inactive</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="keys" className="space-y-4">
        <TabsList>
          <TabsTrigger value="keys">API Keys</TabsTrigger>
          <TabsTrigger value="usage">Usage Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="keys">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Manage your API keys and their permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingKeys ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                </div>
              ) : keys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No API keys generated</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setIsCreateOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Generate your first key
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Key Prefix</TableHead>
                      <TableHead>Scopes</TableHead>
                      <TableHead>Rate Limit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keys.map((key: APIKey) => (
                      <TableRow key={key.id}>
                        <TableCell className="font-medium">{key.name}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {key.keyPrefix}...
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {key.scopes?.length || 0} scopes
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {key.rateLimit}/{key.rateLimitWindow}
                        </TableCell>
                        <TableCell>
                          {key.isActive ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" /> Active
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">
                              <XCircle className="w-3 h-3 mr-1" /> Revoked
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {key.lastUsedAt
                            ? new Date(key.lastUsedAt).toLocaleString()
                            : 'Never'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedKeyId(key.id)}
                            >
                              <BarChart3 className="w-3 h-3" />
                            </Button>
                            {key.isActive && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => rotateMutation.mutate(key.id)}
                                >
                                  <RefreshCw className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => revokeMutation.mutate(key.id)}
                                >
                                  <Shield className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive">
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete API Key?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete the API key and all its usage data.
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate(key.id)}
                                    className="bg-destructive text-destructive-foreground"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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

        <TabsContent value="usage">
          <Card>
            <CardHeader>
              <CardTitle>API Usage Logs</CardTitle>
              <CardDescription>
                Recent API calls made with your keys
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedKeyId ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select a key to view usage logs</p>
                </div>
              ) : usageLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No usage logs for this key</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Response Time</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usageLogs.map((log: UsageLog) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <code className="text-xs">{log.endpoint}</code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.method}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              log.statusCode < 400
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }
                          >
                            {log.statusCode}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.responseTimeMs}ms</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {log.ipAddress}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
