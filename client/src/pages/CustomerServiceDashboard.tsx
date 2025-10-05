import { useState, useEffect } from 'react';
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
  Award
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
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
      </div>

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

            <div>
              <Button onClick={() => setNewMessageOpen(true)} className="w-full" data-testid="button-add-message">
                <Send className="h-4 w-4 mr-2" />
                Send Message to Client
              </Button>
            </div>
          </div>
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
  );
}
