import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { DashboardLayout } from '@/layouts';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Headphones,
  Users,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Search,
  Filter,
  Menu,
  X,
  Send,
  Phone,
  Mail,
  Calendar,
  Star,
  FileText,
  UserPlus,
  ArrowUpCircle,
  TrendingUp,
  Award,
  Building2,
  ExternalLink,
  FileCheck,
  Ticket,
  History,
  Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface Ticket {
  id: number;
  ticketNumber: string;
  clientName: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  assignedTo?: number;
  slaStatus: string;
  satisfactionRating?: number;
  createdAt: string;
  age?: string;
}

interface ResponseTemplate {
  id: number;
  templateCode: string;
  title: string;
  category: string;
  subject?: string;
  body: string;
  variables?: string[];
}

interface Client {
  id: number;
  clientId: string;
  companyName: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  entityType: string;
  complianceStatus: string;
  onboardingStatus: string;
  activeServices?: number;
  openTickets?: number;
  createdAt: string;
}

interface ServiceRequest {
  id: number;
  requestId: string;
  serviceName: string;
  status: string;
  priority: string;
  createdAt: string;
  progress?: number;
}

export default function CustomerServiceDashboard() {
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('tickets');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketDetailOpen, setTicketDetailOpen] = useState(false);
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [messageBody, setMessageBody] = useState('');
  const [assignToId, setAssignToId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientDetailOpen, setClientDetailOpen] = useState(false);
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const [newTicketData, setNewTicketData] = useState({
    subject: '',
    description: '',
    category: 'general',
    priority: 'medium'
  });
  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false);
  const [escalationReason, setEscalationReason] = useState('');
  const [escalationDepartment, setEscalationDepartment] = useState('operations');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const { data: csStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/customer-service/stats'],
  });

  const { data: tickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ['/api/customer-service/tickets', { status: statusFilter, priority: priorityFilter }],
  });

  const { data: templates = [] } = useQuery<ResponseTemplate[]>({
    queryKey: ['/api/customer-service/templates'],
  });

  const { data: csTeam = [] } = useQuery({
    queryKey: ['/api/customer-service/cs-team'],
  });

  const { data: satisfactionStats } = useQuery({
    queryKey: ['/api/customer-service/satisfaction-stats'],
  });

  const { data: ticketDetails } = useQuery({
    queryKey: ['/api/customer-service/tickets', selectedTicket?.id],
    enabled: !!selectedTicket,
  });

  // Client lookup query - uses customer service client search endpoint
  const { data: clientsData = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ['/api/customer-service/clients', { search: clientSearch }],
    enabled: clientSearch.length >= 2,
  });

  // Selected client's service requests
  const { data: clientServiceRequests = [] } = useQuery<ServiceRequest[]>({
    queryKey: [`/api/customer-service/clients/${selectedClient?.id}/service-requests`],
    enabled: !!selectedClient?.id,
  });

  // Selected client's tickets
  const { data: clientTickets = [] } = useQuery<Ticket[]>({
    queryKey: [`/api/customer-service/clients/${selectedClient?.id}/tickets`],
    enabled: !!selectedClient?.id,
  });

  const updateTicketMutation = useMutation({
    mutationFn: async ({ ticketId, updates }: { ticketId: number; updates: any }) => {
      return await apiRequest(`/api/customer-service/tickets/${ticketId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer-service/tickets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customer-service/stats'] });
      toast({ title: 'Success', description: 'Ticket updated successfully' });
    },
  });

  const assignTicketMutation = useMutation({
    mutationFn: async ({ ticketId, assignedTo }: { ticketId: number; assignedTo: number }) => {
      return await apiRequest(`/api/customer-service/tickets/${ticketId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ assignedTo, reason: 'Manual assignment' }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer-service/tickets'] });
      toast({ title: 'Success', description: 'Ticket assigned successfully' });
      setAssignToId('');
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ ticketId, message, templateUsed }: { ticketId: number; message: string; templateUsed?: number }) => {
      return await apiRequest(`/api/customer-service/tickets/${ticketId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message, messageType: 'reply', isInternal: false, templateUsed }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer-service/tickets', selectedTicket?.id] });
      toast({ title: 'Success', description: 'Message sent successfully' });
      setMessageBody('');
      setSelectedTemplate(null);
      setNewMessageOpen(false);
    },
  });

  const rateSatisfactionMutation = useMutation({
    mutationFn: async ({ ticketId, rating, comment }: { ticketId: number; rating: number; comment?: string }) => {
      return await apiRequest(`/api/customer-service/tickets/${ticketId}/satisfaction`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer-service/tickets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customer-service/satisfaction-stats'] });
      toast({ title: 'Success', description: 'Satisfaction rating recorded' });
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data: {
      clientId?: number;
      clientName: string;
      subject: string;
      description: string;
      category: string;
      priority: string;
    }) => {
      return await apiRequest('/api/customer-service/tickets', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          status: 'open',
          slaStatus: 'on_track',
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer-service/tickets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customer-service/stats'] });
      toast({ title: 'Success', description: 'Support ticket created successfully' });
      setCreateTicketOpen(false);
      setNewTicketData({ subject: '', description: '', category: 'general', priority: 'medium' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create ticket', variant: 'destructive' });
    },
  });

  const escalateTicketMutation = useMutation({
    mutationFn: async ({ ticketId, department, reason }: { ticketId: number; department: string; reason: string }) => {
      return await apiRequest(`/api/customer-service/tickets/${ticketId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'escalated',
          escalatedTo: department,
          escalationReason: reason,
          escalatedAt: new Date().toISOString(),
          priority: 'high', // Auto-escalate priority
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer-service/tickets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customer-service/stats'] });
      toast({ title: 'Ticket Escalated', description: 'Ticket has been escalated to the appropriate team' });
      setEscalateDialogOpen(false);
      setTicketDetailOpen(false);
      setEscalationReason('');
      setEscalationDepartment('operations');
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to escalate ticket', variant: 'destructive' });
    },
  });

  const stats = csStats as any;
  const ticketsData = tickets as Ticket[];

  const handleTemplateSelect = (templateId: number) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setMessageBody(template.body);
    }
  };

  const handleStatusChange = (ticketId: number, newStatus: string) => {
    updateTicketMutation.mutate({ ticketId, updates: { status: newStatus } });
  };

  const handleAssign = (ticketId: number) => {
    if (!assignToId) return;
    assignTicketMutation.mutate({ ticketId, assignedTo: parseInt(assignToId) });
  };

  const handleSendMessage = () => {
    if (!selectedTicket || !messageBody.trim()) return;
    sendMessageMutation.mutate({ 
      ticketId: selectedTicket.id, 
      message: messageBody,
      templateUsed: selectedTemplate || undefined
    });
  };

  const getTicketPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getTicketStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'in_progress': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSlaStatusColor = (slaStatus: string) => {
    switch (slaStatus) {
      case 'on_track': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'at_risk': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'breached': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getComplianceStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'at_risk': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'non_compliant': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'pending': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getServiceStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'on_hold': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const handleCreateTicketForClient = () => {
    if (!selectedClient || !newTicketData.subject.trim()) return;
    createTicketMutation.mutate({
      clientId: selectedClient.id,
      clientName: selectedClient.companyName,
      subject: newTicketData.subject,
      description: newTicketData.description,
      category: newTicketData.category,
      priority: newTicketData.priority,
    });
  };

  return (
    <DashboardLayout>
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              <div className="flex items-center gap-2">
                <Headphones className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                <div>
                  <h1 className="font-bold text-lg dark:text-white">Customer Service</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Support & queries management</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter || 'all'} onValueChange={(val) => setStatusFilter(val === 'all' ? '' : val)}>
                <SelectTrigger className="w-32 text-xs" data-testid="filter-status">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="lg:hidden bg-white dark:bg-gray-800 border-t px-4 py-3 mt-3">
              <nav className="space-y-2">
                <button
                  onClick={() => {setActiveTab('tickets'); setMobileMenuOpen(false);}}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'tickets' ? 'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400' : 'text-gray-600 dark:text-gray-400'}`}
                  data-testid="tab-tickets"
                >
                  <MessageSquare className="h-4 w-4" />
                  Support Tickets
                </button>
                <button
                  onClick={() => {setActiveTab('templates'); setMobileMenuOpen(false);}}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'templates' ? 'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400' : 'text-gray-600 dark:text-gray-400'}`}
                  data-testid="tab-templates"
                >
                  <FileText className="h-4 w-4" />
                  Response Templates
                </button>
                <button
                  onClick={() => {setActiveTab('performance'); setMobileMenuOpen(false);}}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'performance' ? 'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400' : 'text-gray-600 dark:text-gray-400'}`}
                  data-testid="tab-performance"
                >
                  <BarChart3 className="h-4 w-4" />
                  Performance
                </button>
                <button
                  onClick={() => {setActiveTab('clients'); setMobileMenuOpen(false);}}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'clients' ? 'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400' : 'text-gray-600 dark:text-gray-400'}`}
                  data-testid="tab-clients"
                >
                  <Building2 className="h-4 w-4" />
                  Client Lookup
                </button>
              </nav>
            </div>
          )}
        </div>
      </header>

      <div className="p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow" data-testid="card-open-tickets">
            <CardHeader className="pb-3">
              <CardDescription>Open Tickets</CardDescription>
              <CardTitle className="text-3xl dark:text-white">{stats?.openTickets || 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <AlertCircle className="h-4 w-4" />
                <span>Pending resolution</span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow" data-testid="card-in-progress">
            <CardHeader className="pb-3">
              <CardDescription>In Progress</CardDescription>
              <CardTitle className="text-3xl dark:text-white">{stats?.inProgressTickets || 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="h-4 w-4" />
                <span>Being worked on</span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow" data-testid="card-resolved-today">
            <CardHeader className="pb-3">
              <CardDescription>Resolved Today</CardDescription>
              <CardTitle className="text-3xl dark:text-white">{stats?.resolvedToday || 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span>Tickets closed</span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow" data-testid="card-avg-response-time">
            <CardHeader className="pb-3">
              <CardDescription>Avg Response Time</CardDescription>
              <CardTitle className="text-3xl dark:text-white">{stats?.avgResponseTime || '0h 0m'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="h-4 w-4" />
                <span>First response</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="hidden lg:block mb-6">
          <TabsList>
            <TabsTrigger value="tickets" data-testid="tab-tickets-desktop">
              <MessageSquare className="h-4 w-4 mr-2" />
              Support Tickets
            </TabsTrigger>
            <TabsTrigger value="templates" data-testid="tab-templates-desktop">
              <FileText className="h-4 w-4 mr-2" />
              Response Templates
            </TabsTrigger>
            <TabsTrigger value="performance" data-testid="tab-performance-desktop">
              <BarChart3 className="h-4 w-4 mr-2" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="clients" data-testid="tab-clients-desktop">
              <Building2 className="h-4 w-4 mr-2" />
              Client Lookup
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {activeTab === 'tickets' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl lg:text-2xl font-bold dark:text-white mb-2">Support Tickets</h2>
                <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400">Manage client support requests</p>
              </div>
            </div>

            {ticketsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading tickets...</p>
              </div>
            ) : ticketsData.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {ticketsData.map((ticket: Ticket) => (
                  <Card key={ticket.id} className="hover:shadow-md transition-shadow" data-testid={`ticket-${ticket.id}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <Badge className={getTicketPriorityColor(ticket.priority)}>
                                {ticket.priority}
                              </Badge>
                              <Badge className={getTicketStatusColor(ticket.status)}>
                                {ticket.status.replace('_', ' ')}
                              </Badge>
                              <Badge className={getSlaStatusColor(ticket.slaStatus)}>
                                SLA: {ticket.slaStatus.replace('_', ' ')}
                              </Badge>
                              {ticket.satisfactionRating && (
                                <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                  <Star className="h-3 w-3 mr-1" />
                                  {ticket.satisfactionRating}/5
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-semibold text-base dark:text-white mb-1">
                              #{ticket.ticketNumber} - {ticket.subject}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{ticket.description}</p>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {ticket.clientName}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(ticket.createdAt).toLocaleDateString()}
                              </span>
                              {ticket.age && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {ticket.age}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedTicket(ticket);
                              setTicketDetailOpen(true);
                            }}
                            data-testid={`button-view-ticket-${ticket.id}`}
                          >
                            View Details
                          </Button>
                          
                          {ticket.status === 'open' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleStatusChange(ticket.id, 'in_progress')}
                              data-testid={`button-start-ticket-${ticket.id}`}
                            >
                              Start Working
                            </Button>
                          )}
                          
                          {ticket.status === 'in_progress' && (
                            <Button 
                              size="sm" 
                              variant="default"
                              onClick={() => handleStatusChange(ticket.id, 'resolved')}
                              data-testid={`button-resolve-ticket-${ticket.id}`}
                            >
                              Mark Resolved
                            </Button>
                          )}
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" data-testid={`button-assign-ticket-${ticket.id}`}>
                                <UserPlus className="h-3 w-3 mr-1" />
                                Assign
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Assign Ticket</DialogTitle>
                                <DialogDescription>Assign this ticket to a team member</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Team Member</Label>
                                  <Select value={assignToId} onValueChange={setAssignToId}>
                                    <SelectTrigger data-testid="select-assignee">
                                      <SelectValue placeholder="Select team member" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {csTeam.map((member: any) => (
                                        <SelectItem key={member.id} value={member.id.toString()}>
                                          {member.fullName || member.username}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button onClick={() => handleAssign(ticket.id)} data-testid="button-confirm-assign">
                                  Assign Ticket
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No tickets found</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">All support tickets will appear here</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl lg:text-2xl font-bold dark:text-white mb-2">Response Templates</h2>
              <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400">Quick responses for common queries</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow" data-testid={`template-${template.id}`}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg dark:text-white">{template.title}</CardTitle>
                        <CardDescription>{template.category}</CardDescription>
                      </div>
                      <Badge variant="outline">{template.templateCode}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-3">{template.body}</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleTemplateSelect(template.id)}
                      data-testid={`button-use-template-${template.id}`}
                    >
                      <FileText className="h-3 w-3 mr-2" />
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl lg:text-2xl font-bold dark:text-white mb-2">Performance Metrics</h2>
              <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400">Your customer service performance</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="dark:text-white">Response Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600 dark:text-gray-400">Avg. First Response</span>
                      <span className="font-semibold dark:text-white">{stats?.avgResponseTime || '0h 0m'}</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 w-3/4"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600 dark:text-gray-400">Resolution Rate</span>
                      <span className="font-semibold dark:text-white">87%</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{width: '87%'}}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="dark:text-white">Customer Satisfaction</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-5xl font-bold text-green-600 dark:text-green-400 mb-2">
                      {satisfactionStats?.averageRating || '0.0'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Average Rating</div>
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      {satisfactionStats?.totalRatings || 0} ratings
                    </div>
                    <div className="flex justify-center gap-1 mt-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`h-5 w-5 ${star <= Math.round(satisfactionStats?.averageRating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="dark:text-white">SLA Compliance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">On Track</span>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      {ticketsData.filter(t => t.slaStatus === 'on_track').length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">At Risk</span>
                    <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                      {ticketsData.filter(t => t.slaStatus === 'at_risk').length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Breached</span>
                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                      {ticketsData.filter(t => t.slaStatus === 'breached').length}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl lg:text-2xl font-bold dark:text-white mb-2">Client Lookup</h2>
                <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400">Search and view client information</p>
              </div>
            </div>

            {/* Search Bar */}
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by company name, email, phone, or client ID..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="pl-10"
                      data-testid="input-client-search"
                    />
                  </div>
                </div>
                {clientSearch.length > 0 && clientSearch.length < 2 && (
                  <p className="text-xs text-gray-500 mt-2">Type at least 2 characters to search</p>
                )}
              </CardContent>
            </Card>

            {/* Search Results */}
            {clientSearch.length >= 2 && (
              <div className="space-y-4">
                {clientsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Searching clients...</p>
                  </div>
                ) : clientsData.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {clientsData.map((client: Client) => (
                      <Card
                        key={client.id}
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => {
                          setSelectedClient(client);
                          setClientDetailOpen(true);
                        }}
                        data-testid={`client-card-${client.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                                <Building2 className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                              </div>
                              <div>
                                <h3 className="font-semibold dark:text-white">{client.companyName}</h3>
                                <p className="text-sm text-gray-500">{client.clientId}</p>
                              </div>
                            </div>
                            <Badge className={getComplianceStatusColor(client.complianceStatus)}>
                              {client.complianceStatus}
                            </Badge>
                          </div>
                          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>{client.contactPerson}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              <span>{client.contactEmail}</span>
                            </div>
                            {client.contactPhone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                <span>{client.contactPhone}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Badge variant="outline" className="text-xs">
                              {client.entityType?.replace('_', ' ')}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {client.onboardingStatus}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Users className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No clients found</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Try a different search term</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* No search state */}
            {clientSearch.length < 2 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Search className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Search for a client</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Enter a company name, email, phone number, or client ID to find client information
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Client Detail Dialog */}
      <Dialog open={clientDetailOpen} onOpenChange={setClientDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-pink-600" />
              {selectedClient?.companyName}
            </DialogTitle>
            <DialogDescription>
              Client ID: {selectedClient?.clientId} | {selectedClient?.entityType?.replace('_', ' ')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <Users className="h-4 w-4" />
                    Contact Person
                  </div>
                  <p className="font-medium dark:text-white">{selectedClient?.contactPerson}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <Mail className="h-4 w-4" />
                    Email
                  </div>
                  <p className="font-medium dark:text-white">{selectedClient?.contactEmail}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <Phone className="h-4 w-4" />
                    Phone
                  </div>
                  <p className="font-medium dark:text-white">{selectedClient?.contactPhone || 'Not provided'}</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setCreateTicketOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Support Ticket
              </Button>
              <Link href={`/ops/client/${selectedClient?.id}`}>
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Full Profile
                </Button>
              </Link>
            </div>

            {/* Service Requests */}
            <div>
              <h4 className="font-semibold dark:text-white mb-3 flex items-center gap-2">
                <FileCheck className="h-4 w-4" />
                Active Service Requests
              </h4>
              {clientServiceRequests.length > 0 ? (
                <div className="space-y-2">
                  {clientServiceRequests.slice(0, 5).map((sr: ServiceRequest) => (
                    <Card key={sr.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm dark:text-white">{sr.serviceName}</p>
                          <p className="text-xs text-gray-500">{sr.requestId}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getServiceStatusColor(sr.status)}>
                            {sr.status.replace('_', ' ')}
                          </Badge>
                          <Link href={`/service-request/${sr.id}`}>
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No active service requests</p>
              )}
            </div>

            {/* Support Tickets */}
            <div>
              <h4 className="font-semibold dark:text-white mb-3 flex items-center gap-2">
                <Ticket className="h-4 w-4" />
                Support Tickets
              </h4>
              {clientTickets.length > 0 ? (
                <div className="space-y-2">
                  {clientTickets.slice(0, 5).map((ticket: Ticket) => (
                    <Card key={ticket.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm dark:text-white">{ticket.subject}</p>
                          <p className="text-xs text-gray-500">#{ticket.ticketNumber}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getTicketStatusColor(ticket.status)}>
                            {ticket.status.replace('_', ' ')}
                          </Badge>
                          <Badge className={getTicketPriorityColor(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No support tickets</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Ticket for Client Dialog */}
      <Dialog open={createTicketOpen} onOpenChange={setCreateTicketOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Support Ticket</DialogTitle>
            <DialogDescription>
              Create a new support ticket for {selectedClient?.companyName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Subject</Label>
              <Input
                value={newTicketData.subject}
                onChange={(e) => setNewTicketData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Brief description of the issue"
                data-testid="input-ticket-subject"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={newTicketData.description}
                onChange={(e) => setNewTicketData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                placeholder="Detailed description of the support request"
                data-testid="textarea-ticket-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select
                  value={newTicketData.category}
                  onValueChange={(val) => setNewTicketData(prev => ({ ...prev, category: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="document">Document Request</SelectItem>
                    <SelectItem value="service">Service Related</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select
                  value={newTicketData.priority}
                  onValueChange={(val) => setNewTicketData(prev => ({ ...prev, priority: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateTicketOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreateTicketForClient}
              disabled={!newTicketData.subject.trim() || createTicketMutation.isPending}
              data-testid="button-create-ticket"
            >
              {createTicketMutation.isPending ? 'Creating...' : 'Create Ticket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={ticketDetailOpen} onOpenChange={setTicketDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Ticket #{selectedTicket?.ticketNumber} - {selectedTicket?.subject}
            </DialogTitle>
            <DialogDescription>
              Client: {selectedTicket?.clientName} | Status: {selectedTicket?.status}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Description</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{selectedTicket?.description}</p>
            </div>

            {ticketDetails?.messages && ticketDetails.messages.length > 0 && (
              <div>
                <Label>Message Thread</Label>
                <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                  {ticketDetails.messages.map((msg: any) => (
                    <Card key={msg.id} className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-sm">{msg.authorName}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(msg.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm">{msg.message}</p>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={() => setNewMessageOpen(true)} className="flex-1" data-testid="button-add-message">
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </Button>
              {selectedTicket && selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                <Button
                  variant="destructive"
                  onClick={() => setEscalateDialogOpen(true)}
                  data-testid="button-escalate"
                >
                  <ArrowUpCircle className="h-4 w-4 mr-2" />
                  Escalate
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Escalate Ticket Dialog */}
      <Dialog open={escalateDialogOpen} onOpenChange={setEscalateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <ArrowUpCircle className="h-5 w-5" />
              Escalate Ticket
            </DialogTitle>
            <DialogDescription>
              Escalate ticket #{selectedTicket?.ticketNumber} to another department
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Escalate To</Label>
              <Select value={escalationDepartment} onValueChange={setEscalationDepartment}>
                <SelectTrigger data-testid="select-escalation-dept">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operations">Operations Team</SelectItem>
                  <SelectItem value="finance">Finance / Billing</SelectItem>
                  <SelectItem value="compliance">Compliance Team</SelectItem>
                  <SelectItem value="technical">Technical Support</SelectItem>
                  <SelectItem value="management">Management</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Reason for Escalation</Label>
              <Textarea
                value={escalationReason}
                onChange={(e) => setEscalationReason(e.target.value)}
                rows={4}
                placeholder="Describe why this ticket needs to be escalated..."
                data-testid="textarea-escalation-reason"
              />
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Note:</strong> Escalating this ticket will automatically set priority to High and notify the target department.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEscalateDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedTicket) {
                  escalateTicketMutation.mutate({
                    ticketId: selectedTicket.id,
                    department: escalationDepartment,
                    reason: escalationReason,
                  });
                }
              }}
              disabled={!escalationReason.trim() || escalateTicketMutation.isPending}
              data-testid="button-confirm-escalate"
            >
              {escalateTicketMutation.isPending ? 'Escalating...' : 'Confirm Escalation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newMessageOpen} onOpenChange={setNewMessageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Message</DialogTitle>
            <DialogDescription>Respond to ticket #{selectedTicket?.ticketNumber}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Use Template (Optional)</Label>
              <Select value={selectedTemplate?.toString() || 'none'} onValueChange={(val) => val !== 'none' && handleTemplateSelect(parseInt(val))}>
                <SelectTrigger data-testid="select-template">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Message</Label>
              <Textarea 
                value={messageBody} 
                onChange={(e) => setMessageBody(e.target.value)}
                rows={6}
                placeholder="Type your message here..."
                data-testid="textarea-message"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewMessageOpen(false)}>Cancel</Button>
            <Button onClick={handleSendMessage} disabled={!messageBody.trim()} data-testid="button-send-message">
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </DashboardLayout>
  );
}
