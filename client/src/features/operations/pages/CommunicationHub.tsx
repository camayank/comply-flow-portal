/**
 * Client Communication Hub
 *
 * Unified communication center for ops team:
 * - View all client communications (email, SMS, WhatsApp, calls)
 * - Log new communications
 * - Filter and search history
 * - Link communications to cases
 */

import { useState } from 'react';
import { DashboardLayout } from '@/layouts';
import { useAuth } from '@/hooks/use-auth';
import { useStandardQuery } from '@/hooks/useStandardQuery';
import { get, post } from '@/lib/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import {
  Mail,
  Phone,
  MessageSquare,
  MessageCircle,
  Plus,
  Search,
  Filter,
  Clock,
  User,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  XCircle,
  Calendar,
  FileText,
  RefreshCw,
} from 'lucide-react';

interface Communication {
  id: number;
  clientId: number;
  clientName: string;
  type: 'email' | 'sms' | 'whatsapp' | 'call';
  direction: 'inbound' | 'outbound';
  subject: string | null;
  content: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'pending';
  sentBy: string;
  sentAt: string;
  caseId: number | null;
  caseReference: string | null;
}

interface CommunicationStats {
  total: number;
  today: number;
  byType: {
    email: number;
    sms: number;
    whatsapp: number;
    call: number;
  };
  byDirection: {
    inbound: number;
    outbound: number;
  };
}

interface CommunicationData {
  communications: Communication[];
  stats: CommunicationStats;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const navigation = [
  { label: 'Dashboard', href: '/operations' },
  { label: 'Work Queue', href: '/work-queue' },
  { label: 'Communications', href: '/ops/communications' },
  { label: 'Team', href: '/ops/team' },
];

export default function ClientCommunicationHub() {
  const { user: authUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [directionFilter, setDirectionFilter] = useState<string>('all');
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [newComm, setNewComm] = useState({
    clientId: '',
    type: 'call' as 'email' | 'sms' | 'whatsapp' | 'call',
    direction: 'outbound' as 'inbound' | 'outbound',
    subject: '',
    content: '',
    caseId: '',
  });

  const commQuery = useStandardQuery<CommunicationData>({
    queryKey: ['/api/ops/communications', typeFilter, directionFilter, searchQuery],
    queryFn: () => get<CommunicationData>(
      `/api/ops/communications?type=${typeFilter}&direction=${directionFilter}&search=${searchQuery}`
    ),
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <MessageSquare className="h-4 w-4" />;
      case 'whatsapp': return <MessageCircle className="h-4 w-4" />;
      case 'call': return <Phone className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'email': return 'bg-blue-100 text-blue-700';
      case 'sms': return 'bg-purple-100 text-purple-700';
      case 'whatsapp': return 'bg-green-100 text-green-700';
      case 'call': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="outline" className="text-blue-600">Sent</Badge>;
      case 'delivered':
        return <Badge variant="outline" className="text-green-600">Delivered</Badge>;
      case 'read':
        return <Badge className="bg-green-500">Read</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleLogCommunication = async () => {
    try {
      await post('/api/ops/communications', {
        clientId: parseInt(newComm.clientId),
        type: newComm.type,
        direction: newComm.direction,
        subject: newComm.subject || null,
        content: newComm.content,
        caseId: newComm.caseId ? parseInt(newComm.caseId) : null,
      });
      setIsLogDialogOpen(false);
      setNewComm({
        clientId: '',
        type: 'call',
        direction: 'outbound',
        subject: '',
        content: '',
        caseId: '',
      });
      commQuery.refetch();
    } catch (error) {
      console.error('Failed to log communication:', error);
    }
  };

  return (
    <DashboardLayout
      title="Communications"
      navigation={navigation}
      user={{ name: authUser?.fullName || 'User', email: authUser?.email || '' }}
    >
      <div className="space-y-6 p-4 lg:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Communication Hub</h2>
            <p className="text-gray-600">Track all client communications</p>
          </div>
          <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Log Communication
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Log Communication</DialogTitle>
                <DialogDescription>
                  Record a client interaction (call, meeting, etc.)
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Client ID</Label>
                    <Input
                      placeholder="Enter client ID"
                      value={newComm.clientId}
                      onChange={(e) => setNewComm({ ...newComm, clientId: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Case ID (Optional)</Label>
                    <Input
                      placeholder="Link to case"
                      value={newComm.caseId}
                      onChange={(e) => setNewComm({ ...newComm, caseId: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={newComm.type}
                      onValueChange={(v: any) => setNewComm({ ...newComm, type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="call">Phone Call</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Direction</Label>
                    <Select
                      value={newComm.direction}
                      onValueChange={(v: any) => setNewComm({ ...newComm, direction: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="outbound">Outbound (We called)</SelectItem>
                        <SelectItem value="inbound">Inbound (Client called)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    placeholder="Brief subject/topic"
                    value={newComm.subject}
                    onChange={(e) => setNewComm({ ...newComm, subject: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes/Content</Label>
                  <Textarea
                    placeholder="Describe the communication..."
                    rows={4}
                    value={newComm.content}
                    onChange={(e) => setNewComm({ ...newComm, content: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsLogDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleLogCommunication} disabled={!newComm.clientId || !newComm.content}>
                  Log Communication
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        {commQuery.render((data) => (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-gray-600">Today</p>
                  <p className="text-2xl font-bold">{data?.stats?.today || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold">{data?.stats?.total || 0}</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-50">
                <CardContent className="p-4 flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-xs text-blue-700">Emails</p>
                    <p className="text-lg font-bold text-blue-800">{data?.stats?.byType?.email || 0}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-orange-50">
                <CardContent className="p-4 flex items-center gap-2">
                  <Phone className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-xs text-orange-700">Calls</p>
                    <p className="text-lg font-bold text-orange-800">{data?.stats?.byType?.call || 0}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-green-50">
                <CardContent className="p-4 flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-xs text-green-700">WhatsApp</p>
                    <p className="text-lg font-bold text-green-800">{data?.stats?.byType?.whatsapp || 0}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-purple-50">
                <CardContent className="p-4 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-xs text-purple-700">SMS</p>
                    <p className="text-lg font-bold text-purple-800">{data?.stats?.byType?.sms || 0}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by client name or content..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={directionFilter} onValueChange={setDirectionFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Direction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="outbound">Outbound</SelectItem>
                      <SelectItem value="inbound">Inbound</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => commQuery.refetch()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Communication Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Communications</CardTitle>
                <CardDescription>All client interactions across channels</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data?.communications?.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No communications found</p>
                      <p className="text-sm">Log your first client interaction above</p>
                    </div>
                  )}
                  {data?.communications?.map((comm) => (
                    <div
                      key={comm.id}
                      className="flex gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {/* Type Icon */}
                      <div className={`p-2 rounded-full h-fit ${getTypeColor(comm.type)}`}>
                        {getTypeIcon(comm.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{comm.clientName}</span>
                              {comm.direction === 'outbound' ? (
                                <ArrowUpRight className="h-4 w-4 text-blue-500" />
                              ) : (
                                <ArrowDownLeft className="h-4 w-4 text-green-500" />
                              )}
                              <Badge variant="outline" className="text-xs">
                                {comm.direction}
                              </Badge>
                            </div>
                            {comm.subject && (
                              <p className="text-sm font-medium text-gray-700 mt-1">
                                {comm.subject}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">{formatTime(comm.sentAt)}</p>
                            {getStatusBadge(comm.status)}
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {comm.content}
                        </p>

                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {comm.sentBy}
                          </span>
                          {comm.caseReference && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {comm.caseReference}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {data?.pagination && data.pagination.totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-6">
                    <Button variant="outline" size="sm" disabled={data.pagination.page <= 1}>
                      Previous
                    </Button>
                    <span className="flex items-center px-3 text-sm text-gray-600">
                      Page {data.pagination.page} of {data.pagination.totalPages}
                    </span>
                    <Button variant="outline" size="sm" disabled={data.pagination.page >= data.pagination.totalPages}>
                      Next
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ))}
      </div>
    </DashboardLayout>
  );
}
