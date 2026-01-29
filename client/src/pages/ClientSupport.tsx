import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  Star,
  Headphones,
  Search,
  ChevronRight,
  FileText,
  Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';

// ============================================================================
// CLIENT SUPPORT CENTER
// Allow clients to create, view, and manage their support tickets
// ============================================================================

const ticketFormSchema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  description: z.string().min(20, 'Please provide more details (at least 20 characters)'),
  category: z.enum(['billing', 'service', 'compliance', 'technical', 'general']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
});

type TicketFormData = z.infer<typeof ticketFormSchema>;

interface Ticket {
  id: number;
  ticketNumber: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  slaStatus: string;
  satisfactionRating?: number;
  createdAt: string;
  resolvedAt?: string;
  age?: string;
}

interface TicketMessage {
  id: number;
  message: string;
  messageType: string;
  authorName: string;
  isInternal: boolean;
  createdAt: string;
}

interface TicketDetails extends Ticket {
  messages: TicketMessage[];
}

export default function ClientSupport() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketDetailOpen, setTicketDetailOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [satisfactionDialogOpen, setSatisfactionDialogOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [satisfactionComment, setSatisfactionComment] = useState('');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Fetch client's tickets
  const { data: tickets = [], isLoading } = useQuery<Ticket[]>({
    queryKey: ['/api/client/support/tickets'],
  });

  // Fetch ticket details when a ticket is selected
  const { data: ticketDetails, isLoading: detailsLoading } = useQuery<TicketDetails>({
    queryKey: ['/api/client/support/tickets', selectedTicket?.id],
    enabled: !!selectedTicket,
  });

  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: async (data: TicketFormData) => {
      return apiRequest('POST', '/api/client/support/tickets', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client/support/tickets'] });
      setCreateDialogOpen(false);
      toast({
        title: 'Ticket Created',
        description: 'Your support request has been submitted. We\'ll get back to you soon.',
      });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create ticket',
        variant: 'destructive',
      });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: number; message: string }) => {
      return apiRequest('POST', `/api/client/support/tickets/${ticketId}/messages`, { message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client/support/tickets', selectedTicket?.id] });
      setReplyMessage('');
      toast({
        title: 'Message Sent',
        description: 'Your message has been added to the ticket.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    },
  });

  // Submit satisfaction rating
  const satisfactionMutation = useMutation({
    mutationFn: async ({ ticketId, rating, comment }: { ticketId: number; rating: number; comment?: string }) => {
      return apiRequest('POST', `/api/client/support/tickets/${ticketId}/satisfaction`, { rating, comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client/support/tickets'] });
      setSatisfactionDialogOpen(false);
      setSelectedRating(0);
      setSatisfactionComment('');
      toast({
        title: 'Thank You!',
        description: 'Your feedback helps us improve our service.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit rating',
        variant: 'destructive',
      });
    },
  });

  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      subject: '',
      description: '',
      category: 'general',
      priority: 'medium',
    },
  });

  const onSubmit = (data: TicketFormData) => {
    createTicketMutation.mutate(data);
  };

  // Filter tickets
  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Group tickets by status
  const openTickets = filteredTickets.filter(t => t.status === 'open');
  const inProgressTickets = filteredTickets.filter(t => t.status === 'in_progress');
  const resolvedTickets = filteredTickets.filter(t => t.status === 'resolved' || t.status === 'closed');

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'medium': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'low': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'billing': return '💰';
      case 'service': return '📋';
      case 'compliance': return '✅';
      case 'technical': return '🔧';
      default: return '📌';
    }
  };

  const handleViewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setTicketDetailOpen(true);
  };

  const handleSendReply = () => {
    if (!selectedTicket || !replyMessage.trim()) return;
    sendMessageMutation.mutate({ ticketId: selectedTicket.id, message: replyMessage });
  };

  const handleRateSatisfaction = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setSatisfactionDialogOpen(true);
  };

  const submitSatisfaction = () => {
    if (!selectedTicket || selectedRating === 0) return;
    satisfactionMutation.mutate({
      ticketId: selectedTicket.id,
      rating: selectedRating,
      comment: satisfactionComment || undefined,
    });
  };

  const TicketCard = ({ ticket }: { ticket: Ticket }) => (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => handleViewTicket(ticket)}
      data-testid={`ticket-card-${ticket.id}`}
    >
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-lg">{getCategoryIcon(ticket.category)}</span>
                <Badge className={getPriorityColor(ticket.priority)}>
                  {ticket.priority}
                </Badge>
                <Badge className={getStatusColor(ticket.status)}>
                  {ticket.status.replace('_', ' ')}
                </Badge>
              </div>
              <h3 className="font-semibold text-base dark:text-white mb-1">
                #{ticket.ticketNumber} - {ticket.subject}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{ticket.description}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{format(new Date(ticket.createdAt), 'MMM dd, yyyy')}</span>
              {ticket.age && <span className="text-gray-400">({ticket.age})</span>}
            </div>

            {ticket.status === 'resolved' && !ticket.satisfactionRating && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRateSatisfaction(ticket);
                }}
                className="text-xs h-7"
                data-testid={`rate-ticket-${ticket.id}`}
              >
                <Star className="h-3 w-3 mr-1" />
                Rate Experience
              </Button>
            )}

            {ticket.satisfactionRating && (
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-3 w-3 ${star <= ticket.satisfactionRating! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
            <Headphones className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Support Center</h1>
            <p className="text-muted-foreground">Get help with your compliance needs</p>
          </div>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-ticket">
              <Plus className="w-4 h-4 mr-2" />
              New Support Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Support Request</DialogTitle>
              <DialogDescription>
                Tell us how we can help you. Our team will respond within 24 hours.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="billing">💰 Billing & Payments</SelectItem>
                          <SelectItem value="service">📋 Service Requests</SelectItem>
                          <SelectItem value="compliance">✅ Compliance Issues</SelectItem>
                          <SelectItem value="technical">🔧 Technical Support</SelectItem>
                          <SelectItem value="general">📌 General Inquiry</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Brief description of your issue"
                          {...field}
                          data-testid="input-subject"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Please provide details about your issue or question..."
                          rows={5}
                          {...field}
                          data-testid="input-description"
                        />
                      </FormControl>
                      <FormDescription>
                        Include any relevant details like order numbers, dates, or error messages.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-priority">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low - General inquiry</SelectItem>
                          <SelectItem value="medium">Medium - Need help soon</SelectItem>
                          <SelectItem value="high">High - Affecting my work</SelectItem>
                          <SelectItem value="urgent">Urgent - Critical issue</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createTicketMutation.isPending}
                    data-testid="button-submit-ticket"
                  >
                    {createTicketMutation.isPending ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              Open
            </CardDescription>
            <CardTitle className="text-2xl" data-testid="stat-open">{openTickets.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              In Progress
            </CardDescription>
            <CardTitle className="text-2xl" data-testid="stat-in-progress">{inProgressTickets.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Resolved
            </CardDescription>
            <CardTitle className="text-2xl" data-testid="stat-resolved">{resolvedTickets.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40" data-testid="select-status-filter">
                <SelectValue />
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
        </CardContent>
      </Card>

      {/* Tickets List */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" data-testid="tab-all">All ({filteredTickets.length})</TabsTrigger>
          <TabsTrigger value="open" data-testid="tab-open">Open ({openTickets.length})</TabsTrigger>
          <TabsTrigger value="in_progress" data-testid="tab-in-progress">In Progress ({inProgressTickets.length})</TabsTrigger>
          <TabsTrigger value="resolved" data-testid="tab-resolved">Resolved ({resolvedTickets.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {isLoading ? (
            <div className="text-center py-8">Loading your tickets...</div>
          ) : filteredTickets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Headphones className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No tickets found</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Need help? Create a new support request.
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Support Request
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredTickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="open" className="mt-6">
          {openTickets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No open tickets</div>
          ) : (
            <div className="space-y-4">
              {openTickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="in_progress" className="mt-6">
          {inProgressTickets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No tickets in progress</div>
          ) : (
            <div className="space-y-4">
              {inProgressTickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="resolved" className="mt-6">
          {resolvedTickets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No resolved tickets</div>
          ) : (
            <div className="space-y-4">
              {resolvedTickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Contact Info */}
      <Card className="mt-8 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Phone className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Need immediate assistance?</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Call us at 1800-XXX-XXXX (Mon-Sat, 9am-6pm)</p>
              </div>
            </div>
            <Button variant="outline" className="border-purple-300 dark:border-purple-700">
              <Phone className="h-4 w-4 mr-2" />
              Call Support
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ticket Detail Dialog */}
      <Dialog open={ticketDetailOpen} onOpenChange={setTicketDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{getCategoryIcon(selectedTicket?.category || 'general')}</span>
              Ticket #{selectedTicket?.ticketNumber}
            </DialogTitle>
            <DialogDescription>
              {selectedTicket?.subject}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Ticket Info */}
            <div className="flex flex-wrap gap-2">
              <Badge className={getPriorityColor(selectedTicket?.priority || 'medium')}>
                {selectedTicket?.priority}
              </Badge>
              <Badge className={getStatusColor(selectedTicket?.status || 'open')}>
                {selectedTicket?.status?.replace('_', ' ')}
              </Badge>
              <Badge variant="outline">
                Created: {selectedTicket?.createdAt && format(new Date(selectedTicket.createdAt), 'MMM dd, yyyy')}
              </Badge>
            </div>

            {/* Description */}
            <div>
              <Label className="text-sm font-medium">Description</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap">
                {selectedTicket?.description}
              </p>
            </div>

            {/* Message Thread */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Conversation</Label>
              {detailsLoading ? (
                <div className="text-center py-4">Loading messages...</div>
              ) : ticketDetails?.messages && ticketDetails.messages.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto border rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50">
                  {ticketDetails.messages
                    .filter(msg => !msg.isInternal)
                    .map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg ${
                          msg.messageType === 'client_reply'
                            ? 'bg-blue-100 dark:bg-blue-900/30 ml-8'
                            : 'bg-white dark:bg-gray-700 mr-8'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-sm">{msg.authorName}</span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(msg.createdAt), 'MMM dd, h:mm a')}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-gray-500 border rounded-lg">
                  No messages yet. Our team will respond soon.
                </div>
              )}
            </div>

            {/* Reply Box - only for non-closed tickets */}
            {selectedTicket?.status !== 'closed' && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Reply</Label>
                <div className="flex gap-2">
                  <Textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your message..."
                    rows={3}
                    className="flex-1"
                    data-testid="textarea-reply"
                  />
                </div>
                <Button
                  className="mt-2 w-full"
                  onClick={handleSendReply}
                  disabled={!replyMessage.trim() || sendMessageMutation.isPending}
                  data-testid="button-send-reply"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendMessageMutation.isPending ? 'Sending...' : 'Send Message'}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Satisfaction Rating Dialog */}
      <Dialog open={satisfactionDialogOpen} onOpenChange={setSatisfactionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rate Your Experience</DialogTitle>
            <DialogDescription>
              How satisfied were you with our support for ticket #{selectedTicket?.ticketNumber}?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSelectedRating(star)}
                  className="p-1 hover:scale-110 transition-transform"
                  data-testid={`star-${star}`}
                >
                  <Star
                    className={`h-10 w-10 ${
                      star <= selectedRating
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                  />
                </button>
              ))}
            </div>

            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              {selectedRating === 0 && 'Click a star to rate'}
              {selectedRating === 1 && 'Very Dissatisfied'}
              {selectedRating === 2 && 'Dissatisfied'}
              {selectedRating === 3 && 'Neutral'}
              {selectedRating === 4 && 'Satisfied'}
              {selectedRating === 5 && 'Very Satisfied'}
            </div>

            <div>
              <Label>Additional Comments (Optional)</Label>
              <Textarea
                value={satisfactionComment}
                onChange={(e) => setSatisfactionComment(e.target.value)}
                placeholder="Tell us more about your experience..."
                rows={3}
                data-testid="textarea-satisfaction-comment"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSatisfactionDialogOpen(false)}>
              Skip
            </Button>
            <Button
              onClick={submitSatisfaction}
              disabled={selectedRating === 0 || satisfactionMutation.isPending}
              data-testid="button-submit-rating"
            >
              {satisfactionMutation.isPending ? 'Submitting...' : 'Submit Rating'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
