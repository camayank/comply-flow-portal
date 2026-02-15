/**
 * Sales Dashboard (v3 Redesign)
 *
 * Comprehensive sales management dashboard for Sales Manager and Sales Executive roles:
 * - Pipeline overview with deal stages
 * - Lead management with conversion tracking
 * - Proposal tracking
 * - Team performance (Manager only)
 * - Targets and forecasts
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
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout, PageShell, MetricCard } from '@/components/v3';
import {
  TrendingUp,
  Users,
  Target,
  FileText,
  UserPlus,
  Phone,
  Mail,
  Calendar,
  MoreVertical,
  Plus,
  Search,
  ArrowRight,
  CheckCircle,
  BarChart3,
  Building2,
  IndianRupee,
  LayoutDashboard,
  Briefcase,
} from 'lucide-react';

// Types
interface Lead {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  value: number;
  assignedTo: string;
  createdAt: string;
  lastContact: string;
}

interface Proposal {
  id: number;
  title: string;
  client: string;
  value: number;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected';
  createdAt: string;
  validUntil: string;
}

interface TeamMember {
  id: number;
  name: string;
  role: string;
  leads: number;
  conversions: number;
  revenue: number;
  target: number;
}

// API response interfaces
interface LeadsResponse {
  data: Lead[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface SalesMetrics {
  totalLeads: number;
  qualifiedLeads: number;
  pipelineValue: number;
  wonDeals: number;
  conversionRate: number;
  totalRevenue: number;
  totalTarget: number;
  targetProgress: number;
  activeProposals: number;
  proposalValue: number;
  teamSize: number;
  avgRevenuePerRep: number;
}

// Pipeline stages
const pipelineStages = [
  { key: 'new', label: 'New', color: 'bg-blue-500' },
  { key: 'contacted', label: 'Contacted', color: 'bg-purple-500' },
  { key: 'qualified', label: 'Qualified', color: 'bg-yellow-500' },
  { key: 'proposal', label: 'Proposal', color: 'bg-orange-500' },
  { key: 'negotiation', label: 'Negotiation', color: 'bg-pink-500' },
  { key: 'won', label: 'Won', color: 'bg-green-500' },
  { key: 'lost', label: 'Lost', color: 'bg-red-500' },
];

// Navigation configuration
const navigation = [
  {
    title: "Sales",
    items: [
      { label: "Dashboard", href: "/sales", icon: LayoutDashboard },
      { label: "Pipeline", href: "/sales/pipeline", icon: TrendingUp },
      { label: "Leads", href: "/lead-pipeline", icon: UserPlus },
      { label: "Proposals", href: "/proposals", icon: FileText },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Pre-Sales", href: "/pre-sales", icon: Briefcase },
      { label: "Forecasts", href: "/sales/forecasts", icon: BarChart3 },
      { label: "Targets", href: "/sales/targets", icon: Target },
    ],
  },
];

export default function SalesDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [isCreateLeadOpen, setIsCreateLeadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const isManager = user?.role === 'sales_manager';

  // Fetch leads from API
  const { data: leadsData, isLoading: leadsLoading } = useQuery<LeadsResponse>({
    queryKey: ['/api/sales/leads', statusFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);
      const response = await fetch(`/api/sales/leads?${params.toString()}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch leads');
      return response.json();
    },
  });

  // Fetch proposals from API
  const { data: proposals = [], isLoading: proposalsLoading } = useQuery<Proposal[]>({
    queryKey: ['/api/sales/proposals'],
    queryFn: async () => {
      const response = await fetch('/api/sales/proposals', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch proposals');
      return response.json();
    },
  });

  // Fetch team data from API
  const { data: team = [], isLoading: teamLoading } = useQuery<TeamMember[]>({
    queryKey: ['/api/sales/team'],
    queryFn: async () => {
      const response = await fetch('/api/sales/team', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch team');
      return response.json();
    },
  });

  // Fetch sales metrics from API
  const { data: metrics, isLoading: metricsLoading } = useQuery<SalesMetrics>({
    queryKey: ['/api/sales/metrics'],
    queryFn: async () => {
      const response = await fetch('/api/sales/metrics', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch metrics');
      return response.json();
    },
  });

  // Fetch pipeline data from API
  const { data: pipeline = [], isLoading: pipelineLoading } = useQuery({
    queryKey: ['/api/sales/pipeline'],
    queryFn: async () => {
      const response = await fetch('/api/sales/pipeline', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch pipeline');
      return response.json();
    },
  });

  // Create lead mutation
  const createLeadMutation = useMutation({
    mutationFn: async (leadData: Partial<Lead>) => {
      const response = await fetch('/api/sales/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(leadData),
      });
      if (!response.ok) throw new Error('Failed to create lead');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sales/leads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sales/metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sales/pipeline'] });
      toast({ title: 'Lead created successfully' });
      setIsCreateLeadOpen(false);
    },
    onError: () => {
      toast({ title: 'Failed to create lead', variant: 'destructive' });
    },
  });

  // Use API data
  const leads = leadsData?.data || [];
  const filteredLeads = leads;
  const totalLeads = metrics?.totalLeads || 0;
  const qualifiedLeads = metrics?.qualifiedLeads || 0;
  const pipelineValue = metrics?.pipelineValue || 0;
  const wonDeals = metrics?.wonDeals || 0;
  const conversionRate = metrics?.conversionRate || 0;

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-purple-100 text-purple-800',
      qualified: 'bg-yellow-100 text-yellow-800',
      proposal: 'bg-orange-100 text-orange-800',
      negotiation: 'bg-pink-100 text-pink-800',
      won: 'bg-green-100 text-green-800',
      lost: 'bg-red-100 text-red-800',
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      viewed: 'bg-purple-100 text-purple-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{status}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <DashboardLayout
      navigation={navigation}
      user={user ? {
        name: user.email || 'Sales User',
        email: user.email || '',
      } : undefined}
      logo={
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-blue-600" />
          <span className="text-lg font-bold text-slate-900">Sales</span>
        </div>
      }
    >
      <PageShell
        title="Sales Dashboard"
        subtitle={isManager ? 'Manage your sales team and pipeline' : 'Track your leads and deals'}
        actions={
          <Button onClick={() => setIsCreateLeadOpen(true)} className="bg-navy-800 hover:bg-navy-900 text-white">
            <Plus className="h-4 w-4 mr-2" />
            New Lead
          </Button>
        }
      >
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            label="Total Leads"
            value={totalLeads.toString()}
            trend={{ value: "+12% this month", direction: 'up' }}
            icon={UserPlus}
            accentColor="blue"
          />
          <MetricCard
            label="Qualified Leads"
            value={qualifiedLeads.toString()}
            trend={{ value: `${Math.round((qualifiedLeads / totalLeads) * 100)}% qualification rate`, direction: 'up' }}
            icon={Target}
            accentColor="orange"
          />
          <MetricCard
            label="Pipeline Value"
            value={formatCurrency(pipelineValue)}
            trend={{ value: "+8% vs last month", direction: 'up' }}
            icon={IndianRupee}
            accentColor="green"
          />
          <MetricCard
            label="Conversion Rate"
            value={`${conversionRate}%`}
            trend={{ value: `${wonDeals} deals closed`, direction: 'neutral' }}
            icon={BarChart3}
            accentColor="purple"
          />
        </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="proposals">Proposals</TabsTrigger>
          {isManager && <TabsTrigger value="team">Team</TabsTrigger>}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pipeline Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Pipeline Summary</CardTitle>
                <CardDescription>Leads by stage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(pipeline.length > 0 ? pipeline.slice(0, -1) : pipelineStages.slice(0, -1)).map((stage: any) => {
                    const count = stage.count ?? leads.filter((l: Lead) => l.status === stage.key).length;
                    const value = stage.value ?? leads.filter((l: Lead) => l.status === stage.key).reduce((sum: number, l: Lead) => sum + l.value, 0);
                    const percentage = totalLeads > 0 ? (count / totalLeads) * 100 : 0;

                    return (
                      <div key={stage.key} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className={`h-3 w-3 rounded-full ${stage.color}`} />
                            <span>{stage.label}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-muted-foreground">{count} leads</span>
                            <span className="font-medium">{formatCurrency(value)}</span>
                          </div>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { icon: UserPlus, text: 'New lead: Rajesh Kumar from Tech Solutions', time: '2 hours ago', color: 'text-blue-500' },
                    { icon: FileText, text: 'Proposal sent to StartupXYZ', time: '4 hours ago', color: 'text-purple-500' },
                    { icon: CheckCircle, text: 'Deal closed: FinServ India - ₹5L', time: '1 day ago', color: 'text-green-500' },
                    { icon: Phone, text: 'Follow-up call with Global Traders', time: '1 day ago', color: 'text-orange-500' },
                    { icon: Mail, text: 'Email sent to Manufacturing Co', time: '2 days ago', color: 'text-gray-500' },
                  ].map((activity, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className={`mt-0.5 ${activity.color}`}>
                        <activity.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{activity.text}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Tasks */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Follow-ups</CardTitle>
              <CardDescription>Scheduled activities for this week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { lead: 'Rajesh Kumar', company: 'Tech Solutions', task: 'Follow-up call', date: 'Today, 3:00 PM', priority: 'high' },
                  { lead: 'Priya Sharma', company: 'StartupXYZ', task: 'Send revised proposal', date: 'Tomorrow, 10:00 AM', priority: 'medium' },
                  { lead: 'Amit Patel', company: 'Global Traders', task: 'Product demo', date: 'Wed, 2:00 PM', priority: 'medium' },
                  { lead: 'Vikram Singh', company: 'Manufacturing Co', task: 'Discovery call', date: 'Thu, 11:00 AM', priority: 'low' },
                ].map((task, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${
                        task.priority === 'high' ? 'bg-red-500' :
                        task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`} />
                      <div>
                        <p className="font-medium text-sm">{task.task}</p>
                        <p className="text-xs text-muted-foreground">{task.lead} - {task.company}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        <Calendar className="h-3 w-3 mr-1" />
                        {task.date}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pipeline Tab */}
        <TabsContent value="pipeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales Pipeline</CardTitle>
              <CardDescription>Drag and drop to move leads between stages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 gap-4 overflow-x-auto">
                {(pipeline.length > 0 ? pipeline.slice(0, -1) : pipelineStages.slice(0, -1)).map((stage: any) => {
                  const stageLeads = stage.leads ?? leads.filter((l: Lead) => l.status === stage.key);
                  const stageValue = stage.value ?? stageLeads.reduce((sum: number, l: Lead) => sum + l.value, 0);

                  return (
                    <div key={stage.key} className="min-w-[200px]">
                      <div className={`${stage.color} text-white p-2 rounded-t-lg`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{stage.label}</span>
                          <Badge variant="secondary" className="bg-white/20 text-white">
                            {stage.count ?? stageLeads.length}
                          </Badge>
                        </div>
                        <p className="text-xs opacity-80">{formatCurrency(stageValue)}</p>
                      </div>
                      <div className="border border-t-0 rounded-b-lg p-2 space-y-2 min-h-[300px] bg-muted/30">
                        {stageLeads.map((lead: Lead) => (
                          <div key={lead.id} className="bg-white border rounded-lg p-3 cursor-move hover:shadow-md transition-shadow">
                            <p className="font-medium text-sm">{lead.name}</p>
                            <p className="text-xs text-muted-foreground">{lead.company}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs font-medium text-green-600">{formatCurrency(lead.value)}</span>
                              <span className="text-xs text-muted-foreground">{lead.source}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leads Tab */}
        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Leads</CardTitle>
                  <CardDescription>Manage and track your leads</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search leads..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-[200px]"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {pipelineStages.map(stage => (
                        <SelectItem key={stage.key} value={stage.key}>{stage.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Last Contact</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map(lead => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{lead.name}</p>
                          <p className="text-xs text-muted-foreground">{lead.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {lead.company}
                        </div>
                      </TableCell>
                      <TableCell>{lead.source}</TableCell>
                      <TableCell>{getStatusBadge(lead.status)}</TableCell>
                      <TableCell className="font-medium text-green-600">{formatCurrency(lead.value)}</TableCell>
                      <TableCell>{lead.assignedTo}</TableCell>
                      <TableCell>{formatDate(lead.lastContact)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm">
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Proposals Tab */}
        <TabsContent value="proposals" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Proposals</CardTitle>
                  <CardDescription>Track proposal status and conversions</CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Proposal
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proposal</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proposals.map(proposal => (
                    <TableRow key={proposal.id}>
                      <TableCell className="font-medium">{proposal.title}</TableCell>
                      <TableCell>{proposal.client}</TableCell>
                      <TableCell className="font-medium text-green-600">{formatCurrency(proposal.value)}</TableCell>
                      <TableCell>{getStatusBadge(proposal.status)}</TableCell>
                      <TableCell>{formatDate(proposal.createdAt)}</TableCell>
                      <TableCell>{formatDate(proposal.validUntil)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab (Manager Only) */}
        {isManager && (
          <TabsContent value="team" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {team.map(member => {
                const progress = (member.revenue / member.target) * 100;
                const isOnTrack = progress >= 80;

                return (
                  <Card key={member.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.role}</p>
                          </div>
                        </div>
                        <Badge variant={isOnTrack ? 'default' : 'secondary'}>
                          {isOnTrack ? 'On Track' : 'Behind'}
                        </Badge>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-lg font-bold">{member.leads}</p>
                            <p className="text-xs text-muted-foreground">Leads</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold">{member.conversions}</p>
                            <p className="text-xs text-muted-foreground">Conversions</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold">{Math.round((member.conversions / member.leads) * 100)}%</p>
                            <p className="text-xs text-muted-foreground">Conv. Rate</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Revenue vs Target</span>
                            <span className={isOnTrack ? 'text-green-600' : 'text-orange-600'}>
                              {formatCurrency(member.revenue)} / {formatCurrency(member.target)}
                            </span>
                          </div>
                          <Progress value={Math.min(progress, 100)} className="h-2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Team Performance Table */}
            <Card>
              <CardHeader>
                <CardTitle>Team Performance</CardTitle>
                <CardDescription>Detailed metrics for this month</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team Member</TableHead>
                      <TableHead>Leads</TableHead>
                      <TableHead>Conversions</TableHead>
                      <TableHead>Conversion Rate</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Achievement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {team.map(member => {
                      const achievement = Math.round((member.revenue / member.target) * 100);
                      return (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">{member.name}</TableCell>
                          <TableCell>{member.leads}</TableCell>
                          <TableCell>{member.conversions}</TableCell>
                          <TableCell>{Math.round((member.conversions / member.leads) * 100)}%</TableCell>
                          <TableCell className="text-green-600 font-medium">{formatCurrency(member.revenue)}</TableCell>
                          <TableCell>{formatCurrency(member.target)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={Math.min(achievement, 100)} className="h-2 w-16" />
                              <span className={achievement >= 100 ? 'text-green-600' : achievement >= 80 ? 'text-yellow-600' : 'text-red-600'}>
                                {achievement}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Create Lead Dialog */}
      <Dialog open={isCreateLeadOpen} onOpenChange={setIsCreateLeadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Lead</DialogTitle>
            <DialogDescription>
              Enter lead details to add to your pipeline
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leadName">Name *</Label>
                <Input id="leadName" placeholder="Full name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company *</Label>
                <Input id="company" placeholder="Company name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" placeholder="email@company.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" placeholder="+91 98765 43210" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="source">Lead Source</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="cold_call">Cold Call</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">Estimated Value</Label>
                <Input id="value" type="number" placeholder="0" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" placeholder="Additional information..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateLeadOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast({ title: 'Lead Created', description: 'New lead has been added to your pipeline.' });
              setIsCreateLeadOpen(false);
            }}>
              Create Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </PageShell>
    </DashboardLayout>
  );
}
