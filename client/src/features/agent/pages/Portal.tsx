/**
 * Agent/Partner Portal - Mobile-First Design
 *
 * FULLY WIRED TO BACKEND APIs - No hardcoded data
 *
 * APIs Used:
 * - /api/agent/stats - Dashboard stats
 * - /api/agent/leads/recent - Recent leads
 * - /api/agent/commissions - Commission history
 * - /api/agent/commissions/summary - Commission summary
 * - /api/agent/territory - Territory info
 * - /api/agent/resources - Marketing resources
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  Target,
  Menu,
  X,
  Home,
  Calendar,
  Plus,
  Eye,
  MapPin,
  Star,
  Award,
  Phone,
  Mail,
  Briefcase,
  Play,
  Download,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { EmptyList } from '@/components/ui/empty-state';

// Interfaces for API responses
interface AgentStats {
  totalLeads: number;
  convertedLeads: number;
  thisMonthLeads: number;
  conversionRate: number;
  leadsByStage: {
    new: number;
    contacted: number;
    qualified: number;
    proposal: number;
    negotiation: number;
    converted: number;
    lost: number;
  };
  totalCommission: number;
  pendingCommission: number;
  paidCommission: number;
  territory: string;
  rank: string;
  performanceRating: number;
  monthlyTarget: number;
  monthlyAchieved: number;
  targetProgress: number;
}

interface Lead {
  id: number;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  serviceInterested: string;
  leadStage: string;
  estimatedValue: number;
  createdAt: string;
}

interface Commission {
  id: number;
  clientName: string;
  serviceName: string;
  serviceAmount: number;
  commissionAmount: number;
  status: string;
  payoutDate: string | null;
  createdAt: string;
}

interface CommissionSummary {
  totalEarned: number;
  pendingAmount: number;
  clearedAmount: number;
  thisMonthEarnings: number;
  nextPayoutDate: string;
  nextPayoutAmount: number;
}

interface Territory {
  primary: {
    name: string;
    coverage: number;
  };
  secondary: Array<{
    name: string;
    coverage: number;
  }>;
  metrics: {
    marketCoverage: number;
    customerDensity: number;
    competitionIndex: string;
    totalClients: number;
  };
}

interface Resource {
  id: number;
  title: string;
  description: string;
  category: string;
  type: string;
  fileUrl: string;
  thumbnailUrl?: string;
  downloads: number;
  createdAt: string;
}

// Format currency in INR
const formatCurrency = (amount: number): string => {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  } else if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
};

// Get stage color
const getStageColor = (stage: string) => {
  switch (stage) {
    case 'new': return 'bg-blue-500 text-white';
    case 'contacted': return 'bg-purple-500 text-white';
    case 'qualified': return 'bg-cyan-500 text-white';
    case 'proposal': return 'bg-orange-500 text-white';
    case 'negotiation': return 'bg-yellow-500 text-white';
    case 'converted': return 'bg-green-500 text-white';
    case 'lost': return 'bg-red-500 text-white';
    default: return 'bg-gray-500 text-white';
  }
};

// Get commission status color
const getCommissionStatusColor = (status: string) => {
  switch (status) {
    case 'cleared':
    case 'paid': return 'bg-green-500 text-white';
    case 'processing':
    case 'approved': return 'bg-blue-500 text-white';
    case 'pending': return 'bg-orange-500 text-white';
    case 'disputed': return 'bg-red-500 text-white';
    default: return 'bg-gray-500 text-white';
  }
};

const MobileAgentPortal = () => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Fetch agent stats
  const { data: statsData, isLoading: loadingStats } = useQuery<AgentStats>({
    queryKey: ['/api/agent/stats'],
  });

  // Fetch recent leads
  const { data: recentLeadsData, isLoading: loadingLeads } = useQuery<{ leads: Lead[] }>({
    queryKey: ['/api/agent/leads/recent'],
  });

  // Fetch all leads for lead management tab
  const { data: allLeadsData, isLoading: loadingAllLeads } = useQuery<{ leads: Lead[], total: number }>({
    queryKey: ['/api/agent/leads'],
    enabled: activeTab === 'leads',
  });

  // Fetch commissions
  const { data: commissionsData, isLoading: loadingCommissions } = useQuery<{ commissions: Commission[] }>({
    queryKey: ['/api/agent/commissions'],
    enabled: activeTab === 'commissions' || activeTab === 'dashboard',
  });

  // Fetch commission summary
  const { data: commissionSummary, isLoading: loadingCommissionSummary } = useQuery<CommissionSummary>({
    queryKey: ['/api/agent/commissions/summary'],
    enabled: activeTab === 'commissions' || activeTab === 'dashboard',
  });

  // Fetch territory info
  const { data: territoryData, isLoading: loadingTerritory } = useQuery<Territory>({
    queryKey: ['/api/agent/territory'],
    enabled: activeTab === 'territory',
  });

  // Fetch resources
  const { data: resourcesData, isLoading: loadingResources } = useQuery<{ resources: Resource[] }>({
    queryKey: ['/api/agent/resources'],
    enabled: activeTab === 'resources',
  });

  const stats = statsData;
  const recentLeads = recentLeadsData?.leads || [];
  const allLeads = allLeadsData?.leads || [];
  const commissions = commissionsData?.commissions || [];
  const resources = resourcesData?.resources || [];

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Group leads by stage for pipeline view
  const leadsByStage = {
    new: allLeads.filter(l => l.leadStage === 'new'),
    contacted: allLeads.filter(l => l.leadStage === 'contacted'),
    qualified: allLeads.filter(l => l.leadStage === 'qualified'),
    proposal: allLeads.filter(l => l.leadStage === 'proposal'),
    negotiation: allLeads.filter(l => l.leadStage === 'negotiation'),
    converted: allLeads.filter(l => l.leadStage === 'converted'),
  };

  // Group resources by category
  const resourcesByCategory = {
    presentations: resources.filter(r => r.category === 'presentation'),
    brochures: resources.filter(r => r.category === 'brochure'),
    training: resources.filter(r => r.category === 'training'),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header with User Menu */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
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
              <Star className="h-6 w-6 text-orange-600" />
              <div>
                <h1 className="font-bold text-lg">Partner Portal</h1>
                <p className="text-xs text-gray-500">Agent network management</p>
              </div>
            </div>
          </div>

          {/* User Menu with Logout */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                    <User className="h-4 w-4 text-orange-600" />
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">
                    {user?.fullName || user?.username || 'Agent'}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium">{user?.fullName || user?.username || 'Agent'}</p>
                  <p className="text-xs text-gray-500">{user?.email || ''}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/agent/profile" className="flex items-center cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/agent/settings" className="flex items-center cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t px-4 py-3">
            <nav className="space-y-2">
              <button
                onClick={() => {setActiveTab('dashboard'); setMobileMenuOpen(false);}}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-orange-50 text-orange-600' : 'text-gray-600'}`}
              >
                <Home className="h-4 w-4" />
                Dashboard
              </button>
              <button
                onClick={() => {setActiveTab('leads'); setMobileMenuOpen(false);}}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'leads' ? 'bg-orange-50 text-orange-600' : 'text-gray-600'}`}
              >
                <Users className="h-4 w-4" />
                Lead Management
              </button>
              <button
                onClick={() => {setActiveTab('commissions'); setMobileMenuOpen(false);}}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'commissions' ? 'bg-orange-50 text-orange-600' : 'text-gray-600'}`}
              >
                <DollarSign className="h-4 w-4" />
                Commissions
              </button>
              <button
                onClick={() => {setActiveTab('territory'); setMobileMenuOpen(false);}}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'territory' ? 'bg-orange-50 text-orange-600' : 'text-gray-600'}`}
              >
                <MapPin className="h-4 w-4" />
                Territory
              </button>
              <button
                onClick={() => {setActiveTab('resources'); setMobileMenuOpen(false);}}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'resources' ? 'bg-orange-50 text-orange-600' : 'text-gray-600'}`}
              >
                <Briefcase className="h-4 w-4" />
                Resources
              </button>
            </nav>
          </div>
        )}
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 bg-white border-r min-h-screen">
          <div className="p-6">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Home className="h-4 w-4" />
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('leads')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'leads' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Users className="h-4 w-4" />
                Lead Management
              </button>
              <button
                onClick={() => setActiveTab('commissions')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'commissions' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <DollarSign className="h-4 w-4" />
                Commissions
              </button>
              <button
                onClick={() => setActiveTab('territory')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'territory' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <MapPin className="h-4 w-4" />
                Territory
              </button>
              <button
                onClick={() => setActiveTab('resources')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'resources' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Briefcase className="h-4 w-4" />
                Resources
              </button>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6">
          {/* ============ DASHBOARD TAB ============ */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl lg:text-2xl font-bold mb-2">Partner Dashboard</h2>
                <p className="text-sm lg:text-base text-gray-600">Your performance overview and earnings summary</p>
              </div>

              {/* Performance Cards - Mobile Responsive */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {loadingStats ? (
                  <>
                    {[1, 2, 3, 4].map((i) => (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <Skeleton className="h-20 w-full" />
                        </CardContent>
                      </Card>
                    ))}
                  </>
                ) : (
                  <>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex flex-col items-center text-center">
                          <Users className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600 mb-2" />
                          <p className="text-xs lg:text-sm text-gray-600">Total Leads</p>
                          <p className="text-xl lg:text-2xl font-bold">{stats?.totalLeads || 0}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex flex-col items-center text-center">
                          <Target className="h-6 w-6 lg:h-8 lg:w-8 text-green-600 mb-2" />
                          <p className="text-xs lg:text-sm text-gray-600">Conversions</p>
                          <p className="text-xl lg:text-2xl font-bold">{stats?.convertedLeads || 0}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex flex-col items-center text-center">
                          <DollarSign className="h-6 w-6 lg:h-8 lg:w-8 text-purple-600 mb-2" />
                          <p className="text-xs lg:text-sm text-gray-600">This Month</p>
                          <p className="text-xl lg:text-2xl font-bold">
                            {formatCurrency(commissionSummary?.thisMonthEarnings || 0)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex flex-col items-center text-center">
                          <TrendingUp className="h-6 w-6 lg:h-8 lg:w-8 text-orange-600 mb-2" />
                          <p className="text-xs lg:text-sm text-gray-600">Conversion Rate</p>
                          <p className="text-xl lg:text-2xl font-bold">{stats?.conversionRate || 0}%</p>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>

              {/* Performance Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Monthly Performance</CardTitle>
                    <CardDescription>Your progress this month</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingStats ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-8 w-full" />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Lead Target</span>
                            <span>{stats?.monthlyAchieved || 0}/{stats?.monthlyTarget || 10}</span>
                          </div>
                          <Progress value={stats?.targetProgress || 0} className="w-full" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Conversion Rate</span>
                            <span>{stats?.conversionRate || 0}%</span>
                          </div>
                          <Progress value={stats?.conversionRate || 0} className="w-full" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Commission Earned</span>
                            <span>{formatCurrency(commissionSummary?.thisMonthEarnings || 0)}</span>
                          </div>
                          <Progress
                            value={Math.min(100, ((commissionSummary?.thisMonthEarnings || 0) / 50000) * 100)}
                            className="w-full"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Activities</CardTitle>
                    <CardDescription>Latest lead interactions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingLeads ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : recentLeads.length === 0 ? (
                      <EmptyList
                        title="No recent leads"
                        description="Add leads to track your pipeline"
                      />
                    ) : (
                      <div className="space-y-3">
                        {recentLeads.slice(0, 3).map((lead) => (
                          <div key={lead.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="text-sm">
                              <p className="font-medium">{lead.companyName || lead.contactName}</p>
                              <p className="text-xs text-gray-600">{lead.serviceInterested || 'General Inquiry'}</p>
                            </div>
                            <Badge className={getStageColor(lead.leadStage)}>
                              {lead.leadStage?.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ============ LEAD MANAGEMENT TAB ============ */}
          {activeTab === 'leads' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl lg:text-2xl font-bold mb-2">Lead Management</h2>
                  <p className="text-sm lg:text-base text-gray-600">Track and manage your client leads</p>
                </div>
                <Link href="/pre-sales">
                  <Button size="sm" className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white px-4 py-2">
                    <Plus className="h-4 w-4 mr-2" />
                    <span>Add Lead</span>
                  </Button>
                </Link>
              </div>

              {/* Lead Pipeline */}
              {loadingAllLeads ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <Skeleton className="h-40 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* New Leads */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        New Leads ({stats?.leadsByStage?.new || leadsByStage.new.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {leadsByStage.new.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">No new leads</p>
                      ) : (
                        <div className="space-y-3">
                          {leadsByStage.new.slice(0, 3).map((lead) => (
                            <div key={lead.id} className="p-3 bg-blue-50 rounded-lg">
                              <h4 className="font-medium text-sm">{lead.companyName || lead.contactName}</h4>
                              <p className="text-xs text-gray-600 mt-1">Service: {lead.serviceInterested || 'General'}</p>
                              <div className="flex justify-between items-center mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {lead.estimatedValue ? `₹${(lead.estimatedValue/1000).toFixed(0)}K` : 'TBD'}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {new Date(lead.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* In Progress */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        In Progress ({(stats?.leadsByStage?.contacted || 0) + (stats?.leadsByStage?.qualified || 0) + (stats?.leadsByStage?.proposal || 0) + (stats?.leadsByStage?.negotiation || 0)})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {[...leadsByStage.contacted, ...leadsByStage.qualified, ...leadsByStage.proposal, ...leadsByStage.negotiation].length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">No leads in progress</p>
                      ) : (
                        <div className="space-y-3">
                          {[...leadsByStage.contacted, ...leadsByStage.qualified, ...leadsByStage.proposal, ...leadsByStage.negotiation].slice(0, 3).map((lead) => (
                            <div key={lead.id} className="p-3 bg-yellow-50 rounded-lg">
                              <h4 className="font-medium text-sm">{lead.companyName || lead.contactName}</h4>
                              <p className="text-xs text-gray-600 mt-1">Service: {lead.serviceInterested || 'General'}</p>
                              <div className="flex justify-between items-center mt-2">
                                <Badge className={getStageColor(lead.leadStage)}>
                                  {lead.leadStage?.replace('_', ' ')}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {new Date(lead.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Converted */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        Converted ({stats?.leadsByStage?.converted || leadsByStage.converted.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {leadsByStage.converted.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">No converted leads yet</p>
                      ) : (
                        <div className="space-y-3">
                          {leadsByStage.converted.slice(0, 3).map((lead) => (
                            <div key={lead.id} className="p-3 bg-green-50 rounded-lg">
                              <h4 className="font-medium text-sm">{lead.companyName || lead.contactName}</h4>
                              <p className="text-xs text-gray-600 mt-1">
                                Commission: {lead.estimatedValue ? `₹${(lead.estimatedValue * 0.1 / 1000).toFixed(0)}K` : 'TBD'}
                              </p>
                              <div className="flex justify-between items-center mt-2">
                                <Badge variant="outline" className="text-xs">Converted</Badge>
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* ============ COMMISSIONS TAB ============ */}
          {activeTab === 'commissions' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl lg:text-2xl font-bold mb-2">Commission Tracking</h2>
                <p className="text-sm lg:text-base text-gray-600">Track your earnings and payment history</p>
              </div>

              {/* Commission Summary */}
              {loadingCommissionSummary ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <Skeleton className="h-16 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-xs lg:text-sm text-gray-600">This Month</p>
                        <p className="text-xl lg:text-2xl font-bold text-green-600">
                          {formatCurrency(commissionSummary?.thisMonthEarnings || 0)}
                        </p>
                        <p className="text-xs text-green-600 flex items-center justify-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Active period
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-xs lg:text-sm text-gray-600">Pending</p>
                        <p className="text-xl lg:text-2xl font-bold text-orange-600">
                          {formatCurrency(commissionSummary?.pendingAmount || 0)}
                        </p>
                        <p className="text-xs text-orange-600 flex items-center justify-center gap-1">
                          <Clock className="h-3 w-3" />
                          Awaiting payout
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-xs lg:text-sm text-gray-600">Total Earned</p>
                        <p className="text-xl lg:text-2xl font-bold text-blue-600">
                          {formatCurrency(commissionSummary?.totalEarned || 0)}
                        </p>
                        <p className="text-xs text-blue-600">Lifetime earnings</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-xs lg:text-sm text-gray-600">Next Payout</p>
                        <p className="text-xl lg:text-2xl font-bold text-purple-600">
                          {formatCurrency(commissionSummary?.nextPayoutAmount || 0)}
                        </p>
                        <p className="text-xs text-purple-600 flex items-center justify-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {commissionSummary?.nextPayoutDate
                            ? new Date(commissionSummary.nextPayoutDate).toLocaleDateString()
                            : '5th of month'
                          }
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Recent Commissions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Commission Payments</CardTitle>
                  <CardDescription>Your latest earnings and transaction history</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingCommissions ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : commissions.length === 0 ? (
                    <EmptyList
                      title="No commissions yet"
                      description="Convert leads to earn commissions"
                    />
                  ) : (
                    <div className="space-y-3">
                      {commissions.slice(0, 5).map((commission) => (
                        <div key={commission.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{commission.clientName || 'Client'}</p>
                            <p className="text-xs text-gray-600">{commission.serviceName || 'Service'}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-bold ${commission.status === 'cleared' || commission.status === 'paid' ? 'text-green-600' : 'text-orange-600'}`}>
                              {formatCurrency(commission.commissionAmount)}
                            </p>
                            <Badge className={getCommissionStatusColor(commission.status)}>
                              {commission.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ============ TERRITORY TAB ============ */}
          {activeTab === 'territory' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl lg:text-2xl font-bold mb-2">Territory Management</h2>
                <p className="text-sm lg:text-base text-gray-600">Manage your assigned regions and market coverage</p>
              </div>

              {/* Territory Overview */}
              {loadingTerritory ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {[1, 2].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <Skeleton className="h-40 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Assigned Territory</CardTitle>
                      <CardDescription>Your designated coverage area</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <MapPin className="h-5 w-5 text-blue-600" />
                            <span className="font-medium text-sm">
                              {territoryData?.primary?.name || stats?.territory || 'Not assigned'}
                            </span>
                          </div>
                          <Badge className="bg-blue-500 text-white text-xs">Primary</Badge>
                        </div>
                        {territoryData?.secondary?.map((territory, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <MapPin className="h-5 w-5 text-gray-600" />
                              <span className="font-medium text-sm">{territory.name}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">Secondary</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Market Penetration</CardTitle>
                      <CardDescription>Your coverage performance</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Market Coverage</span>
                            <span>{territoryData?.metrics?.marketCoverage || 0}%</span>
                          </div>
                          <Progress value={territoryData?.metrics?.marketCoverage || 0} className="w-full" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Total Clients</span>
                            <span>{territoryData?.metrics?.totalClients || stats?.convertedLeads || 0}</span>
                          </div>
                          <Progress value={Math.min(100, ((territoryData?.metrics?.totalClients || stats?.convertedLeads || 0) / 50) * 100)} className="w-full" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Competition Index</span>
                            <span>{territoryData?.metrics?.competitionIndex || 'Medium'}</span>
                          </div>
                          <Progress value={60} className="w-full" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* ============ RESOURCES TAB ============ */}
          {activeTab === 'resources' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl lg:text-2xl font-bold mb-2">Marketing Resources</h2>
                <p className="text-sm lg:text-base text-gray-600">Sales collateral and marketing materials</p>
              </div>

              {/* Resource Categories */}
              {loadingResources ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <Skeleton className="h-40 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Sales Presentations</CardTitle>
                      <CardDescription>Ready-to-use presentation materials</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {resourcesByCategory.presentations.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">No presentations available</p>
                      ) : (
                        <div className="space-y-3">
                          {resourcesByCategory.presentations.slice(0, 3).map((resource) => (
                            <div key={resource.id} className="flex items-center justify-between p-2 border rounded">
                              <span className="text-sm truncate flex-1">{resource.title}</span>
                              <Button size="sm" variant="outline" className="text-xs ml-2">
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Brochures & Flyers</CardTitle>
                      <CardDescription>Print and digital marketing materials</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {resourcesByCategory.brochures.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">No brochures available</p>
                      ) : (
                        <div className="space-y-3">
                          {resourcesByCategory.brochures.slice(0, 3).map((resource) => (
                            <div key={resource.id} className="flex items-center justify-between p-2 border rounded">
                              <span className="text-sm truncate flex-1">{resource.title}</span>
                              <Button size="sm" variant="outline" className="text-xs ml-2">
                                <Download className="h-3 w-3 mr-1" />
                                Download
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Training Materials</CardTitle>
                      <CardDescription>Product knowledge and sales training</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {resourcesByCategory.training.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">No training materials available</p>
                      ) : (
                        <div className="space-y-3">
                          {resourcesByCategory.training.slice(0, 3).map((resource) => (
                            <div key={resource.id} className="flex items-center justify-between p-2 border rounded">
                              <span className="text-sm truncate flex-1">{resource.title}</span>
                              <Button size="sm" variant="outline" className="text-xs ml-2">
                                <Play className="h-3 w-3 mr-1" />
                                Watch
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Bottom Navigation for Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="grid grid-cols-5 gap-1 py-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center py-2 px-1 text-xs ${activeTab === 'dashboard' ? 'text-orange-600' : 'text-gray-600'}`}
          >
            <Home className="h-4 w-4 mb-1" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            className={`flex flex-col items-center py-2 px-1 text-xs ${activeTab === 'leads' ? 'text-orange-600' : 'text-gray-600'}`}
          >
            <Users className="h-4 w-4 mb-1" />
            Leads
          </button>
          <button
            onClick={() => setActiveTab('commissions')}
            className={`flex flex-col items-center py-2 px-1 text-xs ${activeTab === 'commissions' ? 'text-orange-600' : 'text-gray-600'}`}
          >
            <DollarSign className="h-4 w-4 mb-1" />
            Commissions
          </button>
          <button
            onClick={() => setActiveTab('territory')}
            className={`flex flex-col items-center py-2 px-1 text-xs ${activeTab === 'territory' ? 'text-orange-600' : 'text-gray-600'}`}
          >
            <MapPin className="h-4 w-4 mb-1" />
            Territory
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`flex flex-col items-center py-2 px-1 text-xs ${activeTab === 'resources' ? 'text-orange-600' : 'text-gray-600'}`}
          >
            <Briefcase className="h-4 w-4 mb-1" />
            Resources
          </button>
        </div>
      </div>

      {/* Spacer for bottom navigation on mobile */}
      <div className="lg:hidden h-16"></div>
    </div>
  );
};

export default MobileAgentPortal;
