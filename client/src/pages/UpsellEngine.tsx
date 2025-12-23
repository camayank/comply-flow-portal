import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  Target,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  Clock,
  Phone,
  Mail,
  FileText,
  Send,
  Plus,
  Edit,
  Eye,
  Filter,
  Search,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  Zap,
  Star,
  Award,
  PieChart,
  BarChart3,
  TrendingDown
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList
} from "recharts";

interface UpsellOpportunity {
  id: number;
  clientId: number;
  clientName: string;
  businessEntity: string;
  entityType: string;
  currentRevenue: number;
  opportunityType: 'cross_sell' | 'up_sell' | 'renewal' | 'add_on';
  suggestedServices: Array<{
    serviceId: string;
    serviceName: string;
    reason: string;
    potential: number;
    confidenceScore: number;
  }>;
  totalPotentialRevenue: number;
  confidenceScore: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'identified' | 'contacted' | 'presented' | 'negotiating' | 'won' | 'lost' | 'ignored';
  triggerEvent: string;
  identifiedDate: string;
  lastContactDate?: string;
  nextFollowUpDate?: string;
  assignedTo: string;
  contactAttempts: number;
  proposalSent: boolean;
  conversionProbability: number;
}

interface OpportunityForm {
  clientId: number;
  opportunityType: string;
  suggestedServices: string[];
  potentialRevenue: number;
  priority: string;
  assignedTo: string;
  nextFollowUpDate: string;
  notes: string;
}

const UpsellEngine = () => {
  const [activeTab, setActiveTab] = useState('opportunities');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const [opportunityForm, setOpportunityForm] = useState<OpportunityForm>({
    clientId: 0,
    opportunityType: '',
    suggestedServices: [],
    potentialRevenue: 0,
    priority: 'medium',
    assignedTo: '',
    nextFollowUpDate: '',
    notes: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mock data for demonstration
  const upsellMetrics = {
    totalOpportunities: 47,
    totalPotentialRevenue: 2850000,
    conversionRate: 22.3,
    avgOpportunityValue: 60638,
    wonOpportunities: 12,
    monthlyGrowthRate: 18.5,
    opportunitiesByStatus: {
      identified: 18,
      contacted: 12,
      presented: 8,
      negotiating: 5,
      won: 3,
      lost: 1
    }
  };

  const opportunities: UpsellOpportunity[] = [
    {
      id: 1,
      clientId: 1,
      clientName: "Tech Innovations Pvt Ltd",
      businessEntity: "Private Limited",
      entityType: "Technology",
      currentRevenue: 125000,
      opportunityType: 'cross_sell',
      suggestedServices: [
        {
          serviceId: 'gst-filing',
          serviceName: 'GST Filing & Returns',
          reason: 'Company recently incorporated, GST registration and monthly filing required',
          potential: 18000,
          confidenceScore: 85
        },
        {
          serviceId: 'trademark-registration',
          serviceName: 'Trademark Registration',
          reason: 'Brand protection essential for technology company',
          potential: 25000,
          confidenceScore: 75
        }
      ],
      totalPotentialRevenue: 43000,
      confidenceScore: 80,
      priority: 'high',
      status: 'contacted',
      triggerEvent: 'Service completion: Company Incorporation',
      identifiedDate: '2024-01-16',
      lastContactDate: '2024-01-17',
      nextFollowUpDate: '2024-01-20',
      assignedTo: 'Rahul Sharma',
      contactAttempts: 2,
      proposalSent: true,
      conversionProbability: 78
    },
    {
      id: 2,
      clientId: 4,
      clientName: "Green Energy Solutions",
      businessEntity: "Private Limited",
      entityType: "Renewable Energy",
      currentRevenue: 85000,
      opportunityType: 'up_sell',
      suggestedServices: [
        {
          serviceId: 'compliance-package',
          serviceName: 'Premium Compliance Package',
          reason: 'Expanding business with multiple regulatory requirements',
          potential: 65000,
          confidenceScore: 70
        },
        {
          serviceId: 'cfo-services',
          serviceName: 'Virtual CFO Services',
          reason: 'Growing company needs strategic financial guidance',
          potential: 120000,
          confidenceScore: 60
        }
      ],
      totalPotentialRevenue: 185000,
      confidenceScore: 65,
      priority: 'urgent',
      status: 'negotiating',
      triggerEvent: 'Business growth indicators: 200% revenue increase',
      identifiedDate: '2024-01-12',
      lastContactDate: '2024-01-18',
      nextFollowUpDate: '2024-01-19',
      assignedTo: 'Priya Patel',
      contactAttempts: 4,
      proposalSent: true,
      conversionProbability: 85
    },
    {
      id: 3,
      clientId: 7,
      clientName: "Digital Marketing Hub",
      businessEntity: "LLP",
      entityType: "Services",
      currentRevenue: 45000,
      opportunityType: 'add_on',
      suggestedServices: [
        {
          serviceId: 'tax-planning',
          serviceName: 'Strategic Tax Planning',
          reason: 'Service business can benefit from tax optimization strategies',
          potential: 35000,
          confidenceScore: 90
        }
      ],
      totalPotentialRevenue: 35000,
      confidenceScore: 90,
      priority: 'medium',
      status: 'identified',
      triggerEvent: 'Annual compliance completion',
      identifiedDate: '2024-01-15',
      assignedTo: 'Amit Kumar',
      contactAttempts: 0,
      proposalSent: false,
      conversionProbability: 45
    }
  ];

  const conversionFunnelData = [
    { stage: 'Identified', value: 47, color: '#8884d8' },
    { stage: 'Contacted', value: 32, color: '#82ca9d' },
    { stage: 'Presented', value: 24, color: '#ffc658' },
    { stage: 'Negotiating', value: 15, color: '#ff7300' },
    { stage: 'Won', value: 8, color: '#00ff00' }
  ];

  const revenueOpportunityData = [
    { month: 'Oct', identified: 450000, contacted: 280000, won: 125000 },
    { month: 'Nov', identified: 620000, contacted: 420000, won: 180000 },
    { month: 'Dec', identified: 780000, contacted: 580000, won: 240000 },
    { month: 'Jan', identified: 850000, contacted: 650000, won: 285000 }
  ];

  const serviceOpportunityData = [
    { service: 'GST Services', opportunities: 12, potential: 480000, avgValue: 40000 },
    { service: 'Compliance Package', opportunities: 8, potential: 720000, avgValue: 90000 },
    { service: 'Tax Planning', opportunities: 6, potential: 420000, avgValue: 70000 },
    { service: 'Virtual CFO', opportunities: 4, potential: 560000, avgValue: 140000 }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'identified': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-purple-100 text-purple-800';
      case 'presented': return 'bg-orange-100 text-orange-800';
      case 'negotiating': return 'bg-yellow-100 text-yellow-800';
      case 'won': return 'bg-green-100 text-green-800';
      case 'lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-500';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-500';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-500';
      case 'low': return 'bg-green-100 text-green-800 border-green-500';
      default: return 'bg-gray-100 text-gray-800 border-gray-500';
    }
  };

  const getOpportunityTypeIcon = (type: string) => {
    switch (type) {
      case 'cross_sell': return <Target className="h-4 w-4" />;
      case 'up_sell': return <TrendingUp className="h-4 w-4" />;
      case 'renewal': return <Calendar className="h-4 w-4" />;
      case 'add_on': return <Plus className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const createOpportunity = useMutation({
    mutationFn: async (opportunity: OpportunityForm) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return opportunity;
    },
    onSuccess: () => {
      toast({
        title: "Opportunity Created",
        description: "New upsell opportunity has been created successfully.",
      });
      setShowCreateModal(false);
      setOpportunityForm({
        clientId: 0,
        opportunityType: '',
        suggestedServices: [],
        potentialRevenue: 0,
        priority: 'medium',
        assignedTo: '',
        nextFollowUpDate: '',
        notes: ''
      });
    }
  });

  const OpportunitiesListTab = () => (
    <div className="space-y-6">
      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search opportunities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-opportunity-search"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48" data-testid="select-status-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="identified">Identified</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="presented">Presented</SelectItem>
            <SelectItem value="negotiating">Negotiating</SelectItem>
            <SelectItem value="won">Won</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-48" data-testid="select-priority-filter">
            <SelectValue placeholder="Filter by priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setShowCreateModal(true)} data-testid="button-create-opportunity">
          <Plus className="h-4 w-4 mr-2" />
          Create Opportunity
        </Button>
      </div>

      {/* Opportunities List */}
      <div className="space-y-4">
        {opportunities.map((opportunity) => (
          <Card key={opportunity.id} className="hover:shadow-lg transition-all duration-200" data-testid={`opportunity-${opportunity.id}`}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-start space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${opportunity.clientName}`} />
                    <AvatarFallback>{opportunity.clientName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">{opportunity.clientName}</h3>
                    <p className="text-sm text-gray-600">{opportunity.businessEntity} • {opportunity.entityType}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge className={getStatusColor(opportunity.status)}>
                        {opportunity.status.toUpperCase().replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline" className={getPriorityColor(opportunity.priority)}>
                        {opportunity.priority.toUpperCase()}
                      </Badge>
                      <div className="flex items-center text-sm text-gray-500">
                        {getOpportunityTypeIcon(opportunity.opportunityType)}
                        <span className="ml-1">{opportunity.opportunityType.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    ₹{(opportunity.totalPotentialRevenue / 1000).toFixed(0)}K
                  </div>
                  <div className="text-sm text-gray-600">Potential Revenue</div>
                  <div className="flex items-center mt-1">
                    <Progress value={opportunity.confidenceScore} className="h-1 w-20 mr-2" />
                    <span className="text-xs text-gray-500">{opportunity.confidenceScore}%</span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Suggested Services</div>
                <div className="space-y-2">
                  {opportunity.suggestedServices.map((service, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{service.serviceName}</div>
                        <div className="text-xs text-gray-600 mt-1">{service.reason}</div>
                      </div>
                      <div className="text-right space-x-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-green-600">
                            ₹{(service.potential / 1000).toFixed(0)}K
                          </span>
                          <div className="flex items-center">
                            <Progress value={service.confidenceScore} className="h-1 w-16 mr-1" />
                            <span className="text-xs text-gray-500">{service.confidenceScore}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="space-y-1">
                  <div className="text-sm text-gray-600">Assigned to</div>
                  <div className="text-sm font-medium">{opportunity.assignedTo}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-gray-600">Contact Attempts</div>
                  <div className="text-sm font-medium">{opportunity.contactAttempts}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-gray-600">Conversion Probability</div>
                  <div className="text-sm font-medium text-green-600">{opportunity.conversionProbability}%</div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  {opportunity.nextFollowUpDate && (
                    <span>Next follow-up: {new Date(opportunity.nextFollowUpDate).toLocaleDateString()}</span>
                  )}
                  {opportunity.lastContactDate && (
                    <span className="ml-4">Last contact: {new Date(opportunity.lastContactDate).toLocaleDateString()}</span>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" data-testid={`button-contact-${opportunity.id}`}>
                    <Phone className="h-4 w-4 mr-1" />
                    Contact
                  </Button>
                  <Button size="sm" variant="outline" data-testid={`button-email-${opportunity.id}`}>
                    <Mail className="h-4 w-4 mr-1" />
                    Email
                  </Button>
                  {!opportunity.proposalSent && (
                    <Button size="sm" data-testid={`button-send-proposal-${opportunity.id}`}>
                      <Send className="h-4 w-4 mr-1" />
                      Send Proposal
                    </Button>
                  )}
                  <Button size="sm" variant="outline" data-testid={`button-view-details-${opportunity.id}`}>
                    <Eye className="h-4 w-4 mr-1" />
                    Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const AnalyticsTab = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="metric-total-opportunities">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upsellMetrics.totalOpportunities}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <ArrowUp className="h-3 w-3 mr-1" />
                +15% from last month
              </span>
            </p>
          </CardContent>
        </Card>

        <Card data-testid="metric-potential-revenue">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Potential Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(upsellMetrics.totalPotentialRevenue / 100000).toFixed(1)}L</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <ArrowUp className="h-3 w-3 mr-1" />
                +{upsellMetrics.monthlyGrowthRate}% growth
              </span>
            </p>
          </CardContent>
        </Card>

        <Card data-testid="metric-conversion-rate">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upsellMetrics.conversionRate}%</div>
            <Progress value={upsellMetrics.conversionRate} className="h-1 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Above target of 20%
            </p>
          </CardContent>
        </Card>

        <Card data-testid="metric-avg-opportunity-value">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Opportunity Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{Math.round(upsellMetrics.avgOpportunityValue / 1000)}K</div>
            <p className="text-xs text-muted-foreground">
              Per opportunity
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="chart-conversion-funnel">
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
            <CardDescription>Opportunity progression through sales stages</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={conversionFunnelData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="stage" type="category" />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card data-testid="chart-revenue-pipeline">
          <CardHeader>
            <CardTitle>Revenue Pipeline</CardTitle>
            <CardDescription>Revenue progression through stages</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueOpportunityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => [`₹${(value / 100000).toFixed(1)}L`, '']} />
                <Legend />
                <Area type="monotone" dataKey="identified" stackId="1" stroke="#8884d8" fill="#8884d8" name="Identified" />
                <Area type="monotone" dataKey="contacted" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Contacted" />
                <Area type="monotone" dataKey="won" stackId="1" stroke="#ffc658" fill="#ffc658" name="Won" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Service Performance Table */}
      <Card data-testid="service-performance-table">
        <CardHeader>
          <CardTitle>Service Opportunity Performance</CardTitle>
          <CardDescription>Performance breakdown by service category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {serviceOpportunityData.map((service, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Award className="h-8 w-8 text-blue-500" />
                  <div>
                    <div className="font-semibold">{service.service}</div>
                    <div className="text-sm text-gray-500">{service.opportunities} opportunities</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-8 text-right">
                  <div>
                    <div className="text-lg font-bold text-green-600">
                      ₹{(service.potential / 100000).toFixed(1)}L
                    </div>
                    <div className="text-xs text-gray-500">Total Potential</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">
                      ₹{(service.avgValue / 1000).toFixed(0)}K
                    </div>
                    <div className="text-xs text-gray-500">Avg Value</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const OpportunityDetectionTab = () => (
    <div className="space-y-6">
      <Card data-testid="opportunity-detection-engine">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-6 w-6 mr-2 text-yellow-500" />
            AI-Powered Opportunity Detection
          </CardTitle>
          <CardDescription>
            Automatically identify upsell opportunities based on client behavior and service completion
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <div className="font-semibold">Service Triggers</div>
              <div className="text-sm text-gray-600 mt-1">
                Automatically detect opportunities based on completed services
              </div>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <div className="font-semibold">Growth Indicators</div>
              <div className="text-sm text-gray-600 mt-1">
                Identify clients showing signs of business growth
              </div>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 text-orange-500" />
              <div className="font-semibold">Compliance Deadlines</div>
              <div className="text-sm text-gray-600 mt-1">
                Proactively suggest services before compliance deadlines
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h4 className="font-semibold mb-4">Detection Rules Configuration</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium">Company Incorporation → GST Services</div>
                  <div className="text-sm text-gray-600">
                    Suggest GST registration and filing services after incorporation
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium">Revenue Growth {'>'} 200% → Premium Package</div>
                  <div className="text-sm text-gray-600">
                    Suggest premium compliance package for high-growth companies
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium">Annual Filing Due → Tax Planning</div>
                  <div className="text-sm text-gray-600">
                    Suggest tax planning services before annual filing season
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-600">
              Last scan: 2 hours ago • Next scan: in 4 hours
            </div>
            <Button data-testid="button-run-detection">
              <Lightbulb className="h-4 w-4 mr-2" />
              Run Detection Now
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="recent-detections">
        <CardHeader>
          <CardTitle>Recently Detected Opportunities</CardTitle>
          <CardDescription>Opportunities identified in the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="font-medium">Tech Innovations Pvt Ltd</div>
                  <div className="text-sm text-gray-600">
                    GST Services detected after incorporation completion
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-green-600">₹18K</div>
                <div className="text-xs text-gray-500">85% confidence</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                <div>
                  <div className="font-medium">Green Energy Solutions</div>
                  <div className="text-sm text-gray-600">
                    Virtual CFO services for rapidly growing business
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-green-600">₹120K</div>
                <div className="text-xs text-gray-500">70% confidence</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" data-testid="upsell-engine">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Upsell Engine</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Intelligent opportunity identification and revenue growth management
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3" data-testid="tabs-upsell-navigation">
            <TabsTrigger value="opportunities" data-testid="tab-opportunities">Opportunities</TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
            <TabsTrigger value="detection" data-testid="tab-detection">AI Detection</TabsTrigger>
          </TabsList>

          <TabsContent value="opportunities" className="space-y-6">
            <OpportunitiesListTab />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsTab />
          </TabsContent>

          <TabsContent value="detection" className="space-y-6">
            <OpportunityDetectionTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UpsellEngine;