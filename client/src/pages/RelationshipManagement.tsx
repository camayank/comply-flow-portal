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
  Users,
  Heart,
  Activity,
  MessageCircle,
  Phone,
  Mail,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Star,
  MapPin,
  Building,
  User,
  Filter,
  Search,
  Plus,
  Edit,
  Eye,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  Smile,
  Meh,
  Frown,
  Target,
  Award,
  Gift,
  Zap
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar
} from "recharts";

interface RelationshipEvent {
  id: number;
  clientId: number;
  eventType: string;
  eventTitle: string;
  eventDescription: string;
  category: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  importance: 'low' | 'medium' | 'high' | 'critical';
  channel: string;
  handledBy: string;
  outcome: string;
  duration?: number;
  eventDate: string;
  followUpRequired: boolean;
  followUpDate?: string;
}

interface ClientRelationship {
  id: number;
  clientId: number;
  clientName: string;
  businessEntity: string;
  relationshipManager: string;
  accountSince: string;
  totalRevenue: number;
  engagementScore: number;
  satisfactionScore: number;
  communicationScore: number;
  loyaltyScore: number;
  overallHealthScore: number;
  churnRisk: 'low' | 'medium' | 'high' | 'critical';
  lastInteractionDate: string;
  totalInteractions: number;
  preferredChannel: string;
  responseRate: number;
  riskFactors: string[];
  strongPoints: string[];
  loyaltyTier: string;
  loyaltyPoints: number;
  nextEngagement: string;
}

interface EngagementActivity {
  id: number;
  type: string;
  title: string;
  description: string;
  targetSegment: string;
  scheduledDate: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  participants: number;
  responseRate?: number;
  outcome?: string;
}

const RelationshipManagement = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [filterRisk, setFilterRisk] = useState('all');
  const [filterTier, setFilterTier] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showEventModal, setShowEventModal] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mock data for relationship management
  const relationshipMetrics = {
    totalClients: 247,
    averageHealthScore: 82,
    highRiskClients: 12,
    averageEngagement: 78,
    totalInteractions: 1847,
    averageSatisfaction: 4.6,
    loyaltyPrograms: 3,
    activeMembers: 189
  };

  const clientRelationships: ClientRelationship[] = [
    {
      id: 1,
      clientId: 1,
      clientName: "Tech Innovations Pvt Ltd",
      businessEntity: "Private Limited",
      relationshipManager: "Rahul Sharma",
      accountSince: "2023-06-15",
      totalRevenue: 125000,
      engagementScore: 90,
      satisfactionScore: 88,
      communicationScore: 85,
      loyaltyScore: 92,
      overallHealthScore: 89,
      churnRisk: 'low',
      lastInteractionDate: "2024-01-15",
      totalInteractions: 47,
      preferredChannel: "Email",
      responseRate: 95,
      riskFactors: [],
      strongPoints: ['High engagement', 'Excellent payment history', 'Strong referral potential'],
      loyaltyTier: 'Gold',
      loyaltyPoints: 15750,
      nextEngagement: "2024-01-25"
    },
    {
      id: 2,
      clientId: 2,
      clientName: "Digital Solutions LLP",
      businessEntity: "LLP",
      relationshipManager: "Priya Patel",
      accountSince: "2023-08-20",
      totalRevenue: 75000,
      engagementScore: 65,
      satisfactionScore: 72,
      communicationScore: 60,
      loyaltyScore: 68,
      overallHealthScore: 66,
      churnRisk: 'medium',
      lastInteractionDate: "2024-01-10",
      totalInteractions: 23,
      preferredChannel: "Phone",
      responseRate: 75,
      riskFactors: ['Declining engagement', 'Payment delays'],
      strongPoints: ['Long-term client', 'Good service adoption'],
      loyaltyTier: 'Silver',
      loyaltyPoints: 7500,
      nextEngagement: "2024-01-22"
    },
    {
      id: 3,
      clientId: 3,
      clientName: "Green Energy Co",
      businessEntity: "Private Limited",
      relationshipManager: "Amit Kumar",
      accountSince: "2023-11-10",
      totalRevenue: 35000,
      engagementScore: 35,
      satisfactionScore: 45,
      communicationScore: 40,
      loyaltyScore: 30,
      overallHealthScore: 38,
      churnRisk: 'high',
      lastInteractionDate: "2024-01-05",
      totalInteractions: 8,
      preferredChannel: "WhatsApp",
      responseRate: 45,
      riskFactors: ['Poor communication', 'Service quality issues', 'Payment delays'],
      strongPoints: ['Growth potential'],
      loyaltyTier: 'Bronze',
      loyaltyPoints: 1250,
      nextEngagement: "2024-01-18"
    }
  ];

  const relationshipEvents: RelationshipEvent[] = [
    {
      id: 1,
      clientId: 1,
      eventType: "call",
      eventTitle: "Service Review Call",
      eventDescription: "Discussed ongoing compliance services and explored expansion opportunities",
      category: "service",
      sentiment: "positive",
      importance: "medium",
      channel: "phone",
      handledBy: "Rahul Sharma",
      outcome: "follow_up_needed",
      duration: 45,
      eventDate: "2024-01-15",
      followUpRequired: true,
      followUpDate: "2024-01-25"
    },
    {
      id: 2,
      clientId: 2,
      eventType: "email",
      eventTitle: "Payment Reminder",
      eventDescription: "Sent payment reminder for outstanding invoice",
      category: "billing",
      sentiment: "neutral",
      importance: "high",
      channel: "email",
      handledBy: "System",
      outcome: "acknowledged",
      eventDate: "2024-01-10",
      followUpRequired: true,
      followUpDate: "2024-01-20"
    },
    {
      id: 3,
      clientId: 3,
      eventType: "complaint",
      eventTitle: "Service Delay Complaint",
      eventDescription: "Client complained about delays in GST filing process",
      category: "support",
      sentiment: "negative",
      importance: "critical",
      channel: "phone",
      handledBy: "Amit Kumar",
      outcome: "escalated",
      duration: 30,
      eventDate: "2024-01-05",
      followUpRequired: true,
      followUpDate: "2024-01-15"
    }
  ];

  const engagementActivities: EngagementActivity[] = [
    {
      id: 1,
      type: "webinar",
      title: "GST Updates & Best Practices",
      description: "Educational webinar on latest GST changes and compliance best practices",
      targetSegment: "All GST clients",
      scheduledDate: "2024-01-30",
      status: "planned",
      participants: 85
    },
    {
      id: 2,
      type: "survey",
      title: "Annual Satisfaction Survey",
      description: "Comprehensive survey to gather feedback on services and identify improvement areas",
      targetSegment: "All active clients",
      scheduledDate: "2024-01-25",
      status: "in_progress",
      participants: 247,
      responseRate: 68
    },
    {
      id: 3,
      type: "newsletter",
      title: "Monthly Compliance Update",
      description: "Monthly newsletter with compliance deadlines and regulatory updates",
      targetSegment: "Premium tier clients",
      scheduledDate: "2024-01-20",
      status: "completed",
      participants: 89,
      responseRate: 45,
      outcome: "High engagement, 15 follow-up inquiries"
    }
  ];

  const engagementTrendData = [
    { month: 'Oct', engagement: 75, satisfaction: 4.2, interactions: 180 },
    { month: 'Nov', engagement: 78, satisfaction: 4.4, interactions: 195 },
    { month: 'Dec', engagement: 82, satisfaction: 4.6, interactions: 210 },
    { month: 'Jan', engagement: 78, satisfaction: 4.5, interactions: 185 }
  ];

  const churnRiskData = [
    { name: 'Low Risk', value: 185, color: '#22c55e' },
    { name: 'Medium Risk', value: 45, color: '#f59e0b' },
    { name: 'High Risk', value: 12, color: '#ef4444' },
    { name: 'Critical', value: 5, color: '#dc2626' }
  ];

  const loyaltyTierData = [
    { tier: 'Bronze', clients: 95, percentage: 38 },
    { tier: 'Silver', clients: 89, percentage: 36 },
    { tier: 'Gold', clients: 52, percentage: 21 },
    { tier: 'Platinum', clients: 11, percentage: 5 }
  ];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      case 'critical': return 'bg-red-200 text-red-900';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Platinum': return 'bg-purple-100 text-purple-800';
      case 'Gold': return 'bg-yellow-100 text-yellow-800';
      case 'Silver': return 'bg-gray-100 text-gray-800';
      case 'Bronze': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <Smile className="h-4 w-4 text-green-500" />;
      case 'negative': return <Frown className="h-4 w-4 text-red-500" />;
      default: return <Meh className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'phone': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'whatsapp': return <MessageCircle className="h-4 w-4" />;
      default: return <MessageCircle className="h-4 w-4" />;
    }
  };

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="metric-total-relationships">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{relationshipMetrics.totalClients}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <ArrowUp className="h-3 w-3 mr-1" />
                +8% from last month
              </span>
            </p>
          </CardContent>
        </Card>

        <Card data-testid="metric-avg-health-score">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Health Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{relationshipMetrics.averageHealthScore}%</div>
            <Progress value={relationshipMetrics.averageHealthScore} className="h-1 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-600">Healthy relationships</span>
            </p>
          </CardContent>
        </Card>

        <Card data-testid="metric-high-risk-clients">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">High Risk Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{relationshipMetrics.highRiskClients}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-600">Need immediate attention</span>
            </p>
          </CardContent>
        </Card>

        <Card data-testid="metric-avg-satisfaction">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Satisfaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold">{relationshipMetrics.averageSatisfaction}</div>
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < Math.floor(relationshipMetrics.averageSatisfaction) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                ))}
              </div>
            </div>
            <Progress value={(relationshipMetrics.averageSatisfaction / 5) * 100} className="h-1 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="chart-engagement-trends">
          <CardHeader>
            <CardTitle>Engagement Trends</CardTitle>
            <CardDescription>Client engagement and satisfaction over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={engagementTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="engagement" stroke="#8884d8" strokeWidth={2} name="Engagement Score" />
                <Line type="monotone" dataKey="satisfaction" stroke="#82ca9d" strokeWidth={2} name="Satisfaction (×20)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card data-testid="chart-churn-risk">
          <CardHeader>
            <CardTitle>Churn Risk Distribution</CardTitle>
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

      {/* Loyalty Program Performance */}
      <Card data-testid="loyalty-program-performance">
        <CardHeader>
          <CardTitle>Loyalty Program Performance</CardTitle>
          <CardDescription>Client distribution across loyalty tiers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loyaltyTierData.map((tier, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center space-x-3">
                  <Award className={`h-6 w-6 ${
                    tier.tier === 'Platinum' ? 'text-purple-500' :
                    tier.tier === 'Gold' ? 'text-yellow-500' :
                    tier.tier === 'Silver' ? 'text-gray-500' : 'text-orange-500'
                  }`} />
                  <div>
                    <div className="font-semibold">{tier.tier}</div>
                    <div className="text-sm text-gray-500">{tier.clients} clients</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Progress value={tier.percentage} className="h-2 w-32" />
                  <span className="font-medium">{tier.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const ClientRelationshipsTab = () => (
    <div className="space-y-6">
      {/* Filters */}
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
        <Select value={filterRisk} onValueChange={setFilterRisk}>
          <SelectTrigger className="w-48" data-testid="select-risk-filter">
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
        <Select value={filterTier} onValueChange={setFilterTier}>
          <SelectTrigger className="w-48" data-testid="select-tier-filter">
            <SelectValue placeholder="Filter by tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="Platinum">Platinum</SelectItem>
            <SelectItem value="Gold">Gold</SelectItem>
            <SelectItem value="Silver">Silver</SelectItem>
            <SelectItem value="Bronze">Bronze</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Client Relationships List */}
      <div className="grid gap-6">
        {clientRelationships.map((client) => (
          <Card key={client.id} className="hover:shadow-md transition-shadow" data-testid={`client-relationship-${client.id}`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${client.clientName}`} />
                    <AvatarFallback>{client.clientName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <div>
                      <h3 className="font-semibold text-xl">{client.clientName}</h3>
                      <p className="text-sm text-gray-600">{client.businessEntity}</p>
                      <p className="text-xs text-gray-500">
                        Managed by {client.relationshipManager} • Client since {new Date(client.accountSince).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge className={getRiskColor(client.churnRisk)}>
                        {client.churnRisk.toUpperCase()} RISK
                      </Badge>
                      <Badge className={getTierColor(client.loyaltyTier)}>
                        {client.loyaltyTier.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {client.totalInteractions} interactions
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
                  <div className="text-sm text-gray-500">
                    ₹{(client.totalRevenue / 1000).toFixed(0)}K revenue
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Engagement</span>
                    <span className="text-sm font-medium">{client.engagementScore}%</span>
                  </div>
                  <Progress value={client.engagementScore} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Satisfaction</span>
                    <span className="text-sm font-medium">{client.satisfactionScore}%</span>
                  </div>
                  <Progress value={client.satisfactionScore} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Communication</span>
                    <span className="text-sm font-medium">{client.communicationScore}%</span>
                  </div>
                  <Progress value={client.communicationScore} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Loyalty</span>
                    <span className="text-sm font-medium">{client.loyaltyScore}%</span>
                  </div>
                  <Progress value={client.loyaltyScore} className="h-2" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Communication Preferences</div>
                  <div className="flex items-center space-x-2">
                    {getChannelIcon(client.preferredChannel.toLowerCase())}
                    <span className="text-sm">{client.preferredChannel}</span>
                    <span className="text-sm text-gray-500">• {client.responseRate}% response rate</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Loyalty Program</div>
                  <div className="flex items-center space-x-2">
                    <Gift className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">{client.loyaltyPoints.toLocaleString()} points</span>
                    <span className="text-sm text-gray-500">• {client.loyaltyTier} tier</span>
                  </div>
                </div>
              </div>

              {client.riskFactors.length > 0 && (
                <div className="mb-4 p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                    <span className="text-sm font-medium text-red-800">Risk Factors</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {client.riskFactors.map((factor, index) => (
                      <Badge key={index} variant="outline" className="text-xs text-red-700 border-red-300">
                        {factor}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {client.strongPoints.length > 0 && (
                <div className="mb-4 p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span className="text-sm font-medium text-green-800">Strong Points</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {client.strongPoints.map((point, index) => (
                      <Badge key={index} variant="outline" className="text-xs text-green-700 border-green-300">
                        {point}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Last interaction: {new Date(client.lastInteractionDate).toLocaleDateString()}
                  {client.nextEngagement && (
                    <span className="ml-4">
                      Next engagement: {new Date(client.nextEngagement).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" data-testid={`button-contact-${client.id}`}>
                    <Phone className="h-4 w-4 mr-1" />
                    Contact
                  </Button>
                  <Button size="sm" variant="outline" data-testid={`button-timeline-${client.id}`}>
                    <Activity className="h-4 w-4 mr-1" />
                    Timeline
                  </Button>
                  <Button size="sm" data-testid={`button-view-details-${client.id}`}>
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const EngagementTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Client Engagement</h2>
        <Button onClick={() => setShowEventModal(true)} data-testid="button-create-activity">
          <Plus className="h-4 w-4 mr-2" />
          Create Activity
        </Button>
      </div>

      {/* Engagement Activities */}
      <div className="grid gap-4">
        {engagementActivities.map((activity) => (
          <Card key={activity.id} className="hover:shadow-md transition-shadow" data-testid={`engagement-activity-${activity.id}`}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-start space-x-4">
                  <div className={`p-2 rounded-lg ${
                    activity.type === 'webinar' ? 'bg-blue-100 text-blue-600' :
                    activity.type === 'survey' ? 'bg-purple-100 text-purple-600' :
                    'bg-green-100 text-green-600'
                  }`}>
                    {activity.type === 'webinar' && <Users className="h-5 w-5" />}
                    {activity.type === 'survey' && <Target className="h-5 w-5" />}
                    {activity.type === 'newsletter' && <Mail className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{activity.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-sm text-gray-500">Target: {activity.targetSegment}</span>
                      <span className="text-sm text-gray-500">
                        {activity.participants} participants
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <Badge className={
                    activity.status === 'completed' ? 'bg-green-100 text-green-800' :
                    activity.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    activity.status === 'planned' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }>
                    {activity.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <div className="text-sm text-gray-500">
                    {new Date(activity.scheduledDate).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {activity.responseRate && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Response Rate</span>
                    <span>{activity.responseRate}%</span>
                  </div>
                  <Progress value={activity.responseRate} className="h-2" />
                </div>
              )}

              {activity.outcome && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-sm font-medium text-green-800 mb-1">Outcome</div>
                  <div className="text-sm text-green-700">{activity.outcome}</div>
                </div>
              )}

              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-500">
                  {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)} Activity
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" data-testid={`button-edit-activity-${activity.id}`}>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" data-testid={`button-view-results-${activity.id}`}>
                    <Eye className="h-4 w-4 mr-1" />
                    Results
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const TimelineTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Relationship Timeline</h2>
        <Button onClick={() => setShowEventModal(true)} data-testid="button-log-interaction">
          <Plus className="h-4 w-4 mr-2" />
          Log Interaction
        </Button>
      </div>

      {/* Timeline Events */}
      <div className="space-y-4">
        {relationshipEvents.map((event) => (
          <Card key={event.id} className="hover:shadow-md transition-shadow" data-testid={`timeline-event-${event.id}`}>
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="flex flex-col items-center">
                  <div className={`p-2 rounded-full ${
                    event.sentiment === 'positive' ? 'bg-green-100' :
                    event.sentiment === 'negative' ? 'bg-red-100' : 'bg-yellow-100'
                  }`}>
                    {getSentimentIcon(event.sentiment)}
                  </div>
                  <div className="w-px bg-gray-200 h-8 mt-2"></div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">{event.eventTitle}</h3>
                      <p className="text-sm text-gray-600 mt-1">{event.eventDescription}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">{new Date(event.eventDate).toLocaleDateString()}</div>
                      <Badge className={
                        event.importance === 'critical' ? 'bg-red-100 text-red-800' :
                        event.importance === 'high' ? 'bg-orange-100 text-orange-800' :
                        event.importance === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }>
                        {event.importance.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                    <div className="flex items-center space-x-1">
                      {getChannelIcon(event.channel)}
                      <span>{event.channel}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <User className="h-4 w-4" />
                      <span>{event.handledBy}</span>
                    </div>
                    {event.duration && (
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{event.duration} min</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {event.category}
                    </Badge>
                    {event.followUpRequired && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        <span className="text-blue-600">
                          Follow-up: {event.followUpDate && new Date(event.followUpDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" data-testid="relationship-management">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Relationship Management</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Comprehensive client relationship tracking and engagement management
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4" data-testid="tabs-relationship-navigation">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="relationships" data-testid="tab-relationships">Relationships</TabsTrigger>
            <TabsTrigger value="engagement" data-testid="tab-engagement">Engagement</TabsTrigger>
            <TabsTrigger value="timeline" data-testid="tab-timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OverviewTab />
          </TabsContent>

          <TabsContent value="relationships" className="space-y-6">
            <ClientRelationshipsTab />
          </TabsContent>

          <TabsContent value="engagement" className="space-y-6">
            <EngagementTab />
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6">
            <TimelineTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RelationshipManagement;