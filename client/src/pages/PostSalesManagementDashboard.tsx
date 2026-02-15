import { useState } from "react";
import { DashboardLayout } from '@/layouts';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  TrendingUp,
  Target,
  Heart,
  AlertTriangle,
  Trophy,
  DollarSign,
  MessageSquare,
  Star,
  ArrowUp,
  ArrowDown,
  Phone,
  Mail,
  Calendar,
  Filter,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

// Types for post-sales data
interface ClientHealthScore {
  id: number;
  clientId: number;
  clientName: string;
  businessEntity: string;
  overallHealthScore: number;
  churnRisk: 'low' | 'medium' | 'high' | 'critical';
  lastInteractionDate: string;
  totalRevenue: number;
  satisfactionScore: number;
  engagementScore: number;
  riskFactors: string[];
}

interface UpsellOpportunity {
  id: number;
  clientId: number;
  clientName: string;
  businessEntity: string;
  opportunityType: string;
  suggestedServices: Array<{ name: string; potential: number }>;
  potentialRevenue: number;
  confidenceScore: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'identified' | 'contacted' | 'presented' | 'negotiating' | 'won' | 'lost';
  assignedTo: string;
  nextFollowUp: string;
}

interface FeedbackSummary {
  id: number;
  clientName: string;
  serviceName: string;
  overallRating: number;
  submittedDate: string;
  npsScore: number;
  hasIssues: boolean;
  status: 'pending' | 'acknowledged' | 'resolved';
}

const PostSalesManagementDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');

  // Mock data - replace with actual API calls
  const postSalesMetrics = {
    totalClients: 247,
    activeOpportunities: 23,
    avgHealthScore: 82,
    avgSatisfactionRating: 4.6,
    npsScore: 8.2,
    monthlyGrowthRate: 15.7,
    churnRate: 8.5,
    upsellConversionRate: 22.3,
    totalUpsellRevenue: 2850000,
    clientsAtRisk: 12
  };

  const healthScoreData: ClientHealthScore[] = [
    {
      id: 1,
      clientId: 1,
      clientName: "Tech Innovations Pvt Ltd",
      businessEntity: "Private Limited",
      overallHealthScore: 85,
      churnRisk: 'low',
      lastInteractionDate: "2024-01-15",
      totalRevenue: 125000,
      satisfactionScore: 4.8,
      engagementScore: 90,
      riskFactors: []
    },
    {
      id: 2,
      clientId: 2,
      clientName: "Digital Solutions LLP",
      businessEntity: "LLP",
      overallHealthScore: 65,
      churnRisk: 'medium',
      lastInteractionDate: "2024-01-10",
      totalRevenue: 75000,
      satisfactionScore: 3.8,
      engagementScore: 55,
      riskFactors: ['low_engagement', 'delayed_payments']
    },
    {
      id: 3,
      clientId: 3,
      clientName: "Green Energy Co",
      businessEntity: "Private Limited",
      overallHealthScore: 45,
      churnRisk: 'high',
      lastInteractionDate: "2024-01-05",
      totalRevenue: 35000,
      satisfactionScore: 3.2,
      engagementScore: 30,
      riskFactors: ['payment_delays', 'communication_issues', 'missed_deadlines']
    }
  ];

  const upsellOpportunities: UpsellOpportunity[] = [
    {
      id: 1,
      clientId: 1,
      clientName: "Tech Innovations Pvt Ltd",
      businessEntity: "Private Limited",
      opportunityType: "cross_sell",
      suggestedServices: [
        { name: "GST Filing", potential: 8000 },
        { name: "Trademark Registration", potential: 12000 }
      ],
      potentialRevenue: 20000,
      confidenceScore: 85,
      priority: 'high',
      status: 'identified',
      assignedTo: "Rahul Sharma",
      nextFollowUp: "2024-01-18"
    },
    {
      id: 2,
      clientId: 4,
      clientName: "Startup Labs Inc",
      businessEntity: "Private Limited",
      opportunityType: "up_sell",
      suggestedServices: [
        { name: "Premium Compliance Package", potential: 35000 }
      ],
      potentialRevenue: 35000,
      confidenceScore: 70,
      priority: 'medium',
      status: 'contacted',
      assignedTo: "Priya Patel",
      nextFollowUp: "2024-01-20"
    }
  ];

  const feedbackData: FeedbackSummary[] = [
    {
      id: 1,
      clientName: "Tech Innovations Pvt Ltd",
      serviceName: "Company Incorporation",
      overallRating: 5,
      submittedDate: "2024-01-16",
      npsScore: 9,
      hasIssues: false,
      status: 'acknowledged'
    },
    {
      id: 2,
      clientName: "Digital Solutions LLP",
      serviceName: "Annual Compliance",
      overallRating: 3,
      submittedDate: "2024-01-15",
      npsScore: 6,
      hasIssues: true,
      status: 'pending'
    }
  ];

  // Chart data
  const healthTrendData = [
    { month: 'Oct', avgScore: 78, satisfactionScore: 4.2 },
    { month: 'Nov', avgScore: 82, satisfactionScore: 4.4 },
    { month: 'Dec', avgScore: 85, satisfactionScore: 4.6 },
    { month: 'Jan', avgScore: 82, satisfactionScore: 4.5 }
  ];

  const revenueGrowthData = [
    { month: 'Oct', baseRevenue: 450000, upsellRevenue: 75000 },
    { month: 'Nov', baseRevenue: 520000, upsellRevenue: 95000 },
    { month: 'Dec', baseRevenue: 580000, upsellRevenue: 125000 },
    { month: 'Jan', baseRevenue: 620000, upsellRevenue: 140000 }
  ];

  const churnRiskData = [
    { name: 'Low Risk', value: 185, color: '#22c55e' },
    { name: 'Medium Risk', value: 45, color: '#f59e0b' },
    { name: 'High Risk', value: 12, color: '#ef4444' },
    { name: 'Critical', value: 5, color: '#dc2626' }
  ];

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      case 'critical': return 'bg-red-200 text-red-900';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
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

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="metric-total-clients">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{postSalesMetrics.totalClients}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <ArrowUp className="h-3 w-3 mr-1" />
                +8% from last month
              </span>
            </p>
          </CardContent>
        </Card>

        <Card data-testid="metric-avg-health-score">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Health Score</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{postSalesMetrics.avgHealthScore}%</div>
            <Progress value={postSalesMetrics.avgHealthScore} className="h-1 mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              <span className="text-green-600 flex items-center">
                <ArrowUp className="h-3 w-3 mr-1" />
                +3% from last month
              </span>
            </p>
          </CardContent>
        </Card>

        <Card data-testid="metric-upsell-revenue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upsell Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(postSalesMetrics.totalUpsellRevenue / 100000).toFixed(1)}L</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <ArrowUp className="h-3 w-3 mr-1" />
                +{postSalesMetrics.monthlyGrowthRate}% growth
              </span>
            </p>
          </CardContent>
        </Card>

        <Card data-testid="metric-clients-at-risk">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients at Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{postSalesMetrics.clientsAtRisk}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-600 flex items-center">
                <ArrowDown className="h-3 w-3 mr-1" />
                Needs immediate attention
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="chart-health-trends">
          <CardHeader>
            <CardTitle>Health Score & Satisfaction Trends</CardTitle>
            <CardDescription>Client health and satisfaction over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={healthTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="avgScore" stroke="#8884d8" strokeWidth={2} name="Health Score" />
                <Line type="monotone" dataKey="satisfactionScore" stroke="#82ca9d" strokeWidth={2} name="Satisfaction (×20)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card data-testid="chart-churn-risk">
          <CardHeader>
            <CardTitle>Client Churn Risk Distribution</CardTitle>
            <CardDescription>Risk level breakdown across all clients</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={churnRiskData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {churnRiskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Growth Chart */}
      <Card data-testid="chart-revenue-growth">
        <CardHeader>
          <CardTitle>Revenue Growth Analysis</CardTitle>
          <CardDescription>Base revenue vs upsell revenue trends</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={revenueGrowthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => [`₹${(value / 100000).toFixed(1)}L`, '']} />
              <Legend />
              <Area type="monotone" dataKey="baseRevenue" stackId="1" stroke="#8884d8" fill="#8884d8" name="Base Revenue" />
              <Area type="monotone" dataKey="upsellRevenue" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Upsell Revenue" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );

  const ClientHealthTab = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-client-search"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48" data-testid="select-health-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by risk" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risk Levels</SelectItem>
            <SelectItem value="low">Low Risk</SelectItem>
            <SelectItem value="medium">Medium Risk</SelectItem>
            <SelectItem value="high">High Risk</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {healthScoreData.map((client) => (
          <Card key={client.id} className="hover:shadow-md transition-shadow" data-testid={`client-health-${client.id}`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${client.clientName}`} />
                    <AvatarFallback>{client.clientName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <div>
                      <h3 className="font-semibold text-lg">{client.clientName}</h3>
                      <p className="text-sm text-gray-600">{client.businessEntity}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge className={getRiskBadgeColor(client.churnRisk)}>
                        {client.churnRisk.toUpperCase()} RISK
                      </Badge>
                      <span className="text-sm text-gray-500">
                        Last contact: {new Date(client.lastInteractionDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <div className="text-2xl font-bold text-green-600">
                    {client.overallHealthScore}%
                  </div>
                  <div className="text-sm text-gray-600">
                    Health Score
                  </div>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Satisfaction</span>
                    <span className="text-sm font-medium">{client.satisfactionScore}/5</span>
                  </div>
                  <Progress value={(client.satisfactionScore / 5) * 100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Engagement</span>
                    <span className="text-sm font-medium">{client.engagementScore}%</span>
                  </div>
                  <Progress value={client.engagementScore} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Revenue</span>
                    <span className="text-sm font-medium">₹{(client.totalRevenue / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="text-xs text-gray-500">Lifetime Value</div>
                </div>
              </div>

              {client.riskFactors.length > 0 && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                    <span className="text-sm font-medium text-red-800">Risk Factors</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {client.riskFactors.map((factor, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {factor.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 flex justify-between items-center">
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" data-testid={`button-contact-${client.id}`}>
                    <Phone className="h-4 w-4 mr-1" />
                    Contact
                  </Button>
                  <Button size="sm" variant="outline" data-testid={`button-email-${client.id}`}>
                    <Mail className="h-4 w-4 mr-1" />
                    Email
                  </Button>
                </div>
                <Button size="sm" data-testid={`button-view-details-${client.id}`}>
                  <Eye className="h-4 w-4 mr-1" />
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const UpsellOpportunitiesTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Upsell Opportunities</h2>
        <Button data-testid="button-create-opportunity">
          <Target className="h-4 w-4 mr-2" />
          Create Opportunity
        </Button>
      </div>

      <div className="grid gap-4">
        {upsellOpportunities.map((opportunity) => (
          <Card key={opportunity.id} className="hover:shadow-md transition-shadow" data-testid={`opportunity-${opportunity.id}`}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{opportunity.clientName}</h3>
                  <p className="text-sm text-gray-600">{opportunity.businessEntity}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusBadgeColor(opportunity.status)}>
                    {opportunity.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className={
                    opportunity.priority === 'urgent' ? 'border-red-500 text-red-700' :
                    opportunity.priority === 'high' ? 'border-orange-500 text-orange-700' :
                    opportunity.priority === 'medium' ? 'border-yellow-500 text-yellow-700' :
                    'border-green-500 text-green-700'
                  }>
                    {opportunity.priority.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">Potential Revenue</div>
                  <div className="text-2xl font-bold text-green-600">
                    ₹{(opportunity.potentialRevenue / 1000).toFixed(0)}K
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">Confidence Score</div>
                  <div className="flex items-center space-x-2">
                    <Progress value={opportunity.confidenceScore} className="h-2 flex-1" />
                    <span className="text-sm font-medium">{opportunity.confidenceScore}%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">Next Follow-up</div>
                  <div className="text-sm font-medium">
                    {new Date(opportunity.nextFollowUp).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm text-gray-600 mb-2">Suggested Services</div>
                <div className="space-y-1">
                  {opportunity.suggestedServices.map((service, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm font-medium">{service.name}</span>
                      <span className="text-sm text-green-600">₹{(service.potential / 1000).toFixed(0)}K</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Assigned to: <span className="font-medium">{opportunity.assignedTo}</span>
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" data-testid={`button-schedule-${opportunity.id}`}>
                    <Calendar className="h-4 w-4 mr-1" />
                    Schedule Follow-up
                  </Button>
                  <Button size="sm" data-testid={`button-create-proposal-${opportunity.id}`}>
                    <Edit className="h-4 w-4 mr-1" />
                    Create Proposal
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const FeedbackTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="feedback-avg-rating">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold">{postSalesMetrics.avgSatisfactionRating}</div>
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < Math.floor(postSalesMetrics.avgSatisfactionRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="feedback-nps-score">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">NPS Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{postSalesMetrics.npsScore}</div>
            <Progress value={(postSalesMetrics.npsScore / 10) * 100} className="h-1 mt-2" />
          </CardContent>
        </Card>

        <Card data-testid="feedback-pending-responses">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {feedbackData.filter(f => f.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {feedbackData.map((feedback) => (
              <div key={feedback.id} className="border-b pb-4 last:border-b-0" data-testid={`feedback-${feedback.id}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium">{feedback.clientName}</h4>
                    <p className="text-sm text-gray-600">{feedback.serviceName}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`h-4 w-4 ${i < feedback.overallRating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                      ))}
                      <span className="ml-2 text-sm font-medium">({feedback.overallRating})</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(feedback.submittedDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className={
                      feedback.status === 'resolved' ? 'text-green-700 border-green-500' :
                      feedback.status === 'acknowledged' ? 'text-blue-700 border-blue-500' :
                      'text-orange-700 border-orange-500'
                    }>
                      {feedback.status.toUpperCase()}
                    </Badge>
                    <span className="text-sm">NPS: {feedback.npsScore}</span>
                    {feedback.hasIssues && (
                      <Badge variant="destructive" className="text-xs">
                        Issues Reported
                      </Badge>
                    )}
                  </div>
                  <Button size="sm" variant="outline" data-testid={`button-respond-${feedback.id}`}>
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Respond
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <DashboardLayout>
    <div className="bg-gray-50 dark:bg-gray-900" data-testid="post-sales-dashboard">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Post-Sales Management</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Comprehensive client relationship management and revenue growth analytics
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4" data-testid="tabs-main-navigation">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="health" data-testid="tab-client-health">Client Health</TabsTrigger>
            <TabsTrigger value="opportunities" data-testid="tab-opportunities">Upsell Opportunities</TabsTrigger>
            <TabsTrigger value="feedback" data-testid="tab-feedback">Feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OverviewTab />
          </TabsContent>

          <TabsContent value="health" className="space-y-6">
            <ClientHealthTab />
          </TabsContent>

          <TabsContent value="opportunities" className="space-y-6">
            <UpsellOpportunitiesTab />
          </TabsContent>

          <TabsContent value="feedback" className="space-y-6">
            <FeedbackTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </DashboardLayout>
  );
};

export default PostSalesManagementDashboard;