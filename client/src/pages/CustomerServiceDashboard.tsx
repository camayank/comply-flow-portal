import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  Calendar
} from 'lucide-react';

export default function CustomerServiceDashboard() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('tickets');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Fetch customer service stats
  const { data: csStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/customer-service/stats'],
  });

  // Fetch support tickets
  const { data: tickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ['/api/customer-service/tickets'],
  });

  const stats = csStats as any;
  const ticketsData = tickets as any[];

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Mobile Header */}
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
              <Button size="sm" variant="outline" className="text-xs px-3" data-testid="button-search">
                <Search className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Search</span>
              </Button>
              <Button size="sm" variant="outline" className="text-xs px-3" data-testid="button-filter">
                <Filter className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Filter</span>
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
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
                  onClick={() => {setActiveTab('clients'); setMobileMenuOpen(false);}}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'clients' ? 'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400' : 'text-gray-600 dark:text-gray-400'}`}
                  data-testid="tab-clients"
                >
                  <Users className="h-4 w-4" />
                  Client Queries
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
        {/* Stats Grid */}
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
              <CardTitle className="text-3xl dark:text-white">{stats?.avgResponseTime || '2h 15m'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="h-4 w-4" />
                <span>First response</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        {activeTab === 'tickets' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl lg:text-2xl font-bold dark:text-white mb-2">Support Tickets</h2>
                <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400">Manage client support requests and queries</p>
              </div>
            </div>

            {ticketsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading tickets...</p>
              </div>
            ) : ticketsData.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {ticketsData.map((ticket: any) => (
                  <Card key={ticket.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedTicket(ticket)} data-testid={`ticket-${ticket.id}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getTicketPriorityColor(ticket.priority)}>
                              {ticket.priority}
                            </Badge>
                            <Badge className={getTicketStatusColor(ticket.status)}>
                              {ticket.status}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-base dark:text-white mb-1">{ticket.subject}</h3>
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
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {ticket.age}
                            </span>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
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

        {activeTab === 'clients' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl lg:text-2xl font-bold dark:text-white mb-2">Client Queries</h2>
              <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400">Direct client communication and query resolution</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="dark:text-white">Quick Response Templates</CardTitle>
                <CardDescription>Common responses for frequently asked questions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start text-left">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Service Status Update Template
                </Button>
                <Button variant="outline" className="w-full justify-start text-left">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Document Request Template
                </Button>
                <Button variant="outline" className="w-full justify-start text-left">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Payment Confirmation Template
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl lg:text-2xl font-bold dark:text-white mb-2">Performance Metrics</h2>
              <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400">Your customer service performance overview</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="dark:text-white">Response Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600 dark:text-gray-400">Avg. First Response</span>
                      <span className="font-semibold dark:text-white">2h 15m</span>
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
                    <div className="text-5xl font-bold text-green-600 dark:text-green-400 mb-2">4.8</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Average Rating</div>
                    <div className="flex justify-center gap-1 mt-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className="text-yellow-400 text-xl">★</span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
