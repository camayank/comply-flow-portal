import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { getStatusStyle } from "@/lib/theme-utils";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  FileText, 
  MessageSquare, 
  Calendar, 
  BarChart3, 
  Award,
  Download,
  Upload,
  Phone,
  Mail,
  MapPin,
  Clock,
  Target,
  Star,
  AlertTriangle,
  CheckCircle,
  XCircle,
  User,
  Building,
  Briefcase,
  Zap,
  Gift,
  Shield,
  Settings,
  Bell,
  HelpCircle,
  ChevronRight,
  RefreshCw,
  Eye,
  Edit,
  Send,
  Search,
  Filter,
  Plus,
  Trash2,
  Archive,
  Share2
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";

// Mock data for demonstration - replace with actual API calls
const mockAgentProfile = {
  id: 1,
  name: "Rajesh Kumar",
  agentCode: "RK001",
  email: "rajesh@digicomply.com",
  phone: "+91 8130645164",
  assignedTerritory: "Mumbai, Maharashtra",
  joiningDate: "2024-01-15",
  role: "agent",
  performanceRating: 4.2,
  totalCommissionEarned: 125000,
  pendingPayouts: 15000,
  clearedPayouts: 110000
};

const mockLeads = [
  {
    id: 1,
    clientName: "Tech Innovations Pvt Ltd",
    contactPhone: "+91 9999888777",
    entityType: "pvt_ltd",
    requiredServices: ["company_incorporation", "gst_registration"],
    status: "converted",
    estimatedValue: 25000,
    conversionProbability: 85,
    lastContactDate: "2024-01-10",
    nextFollowupDate: "2024-01-15",
    createdAt: "2024-01-05"
  },
  {
    id: 2,
    clientName: "Mumbai Restaurant Partners",
    contactPhone: "+91 8888777666",
    entityType: "partnership",
    requiredServices: ["partnership_deed", "fssai_license"],
    status: "contacted",
    estimatedValue: 18000,
    conversionProbability: 65,
    lastContactDate: "2024-01-12",
    nextFollowupDate: "2024-01-16",
    createdAt: "2024-01-08"
  }
];

const mockCommissions = [
  {
    id: 1,
    serviceCode: "company_incorporation",
    clientName: "Tech Innovations Pvt Ltd",
    commissionAmount: 5000,
    serviceValue: 25000,
    status: "cleared",
    earnedDate: "2024-01-10",
    payoutDate: "2024-01-25"
  },
  {
    id: 2,
    serviceCode: "gst_registration",
    clientName: "Smart Solutions LLC",
    commissionAmount: 2500,
    serviceValue: 12500,
    status: "pending",
    earnedDate: "2024-01-12"
  }
];

const mockMarketingResources = [
  {
    id: 1,
    title: "DigiComply Service Brochure 2024",
    category: "brochure",
    fileType: "pdf",
    downloadCount: 156,
    lastUpdated: "2024-01-01"
  },
  {
    id: 2,
    title: "Company Incorporation Pitch Deck",
    category: "presentation",
    fileType: "pptx",
    downloadCount: 89,
    lastUpdated: "2023-12-15"
  }
];

const mockPerformanceMetrics = {
  monthlyData: {
    leadsSubmitted: 12,
    leadsContacted: 8,
    leadsConverted: 3,
    conversionRate: 37.5,
    totalCommissionEarned: 12500
  },
  topServices: [
    { service: "Company Incorporation", count: 5, commission: 25000 },
    { service: "GST Registration", count: 3, commission: 7500 },
    { service: "Partnership Deed", count: 2, commission: 6000 }
  ]
};

const leadSchema = z.object({
  clientName: z.string().min(2, "Client name is required"),
  contactPhone: z.string().min(10, "Valid phone number required"),
  contactEmail: z.string().email("Valid email required").optional().or(z.literal("")),
  entityType: z.string().min(1, "Entity type is required"),
  requiredServices: z.array(z.string()).min(1, "Select at least one service"),
  leadSource: z.string().optional(),
  estimatedValue: z.number().min(0).optional(),
  notes: z.string().optional()
});

const supportTicketSchema = z.object({
  subject: z.string().min(5, "Subject is required"),
  priority: z.string().min(1, "Priority is required"),
  message: z.string().min(10, "Message is required")
});

export default function AgentPortal() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);
  const [isSupportFormOpen, setIsSupportFormOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);

  const leadForm = useForm({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      clientName: "",
      contactPhone: "",
      contactEmail: "",
      entityType: "",
      requiredServices: [],
      leadSource: "direct",
      estimatedValue: 0,
      notes: ""
    }
  });

  const supportForm = useForm({
    resolver: zodResolver(supportTicketSchema),
    defaultValues: {
      subject: "",
      priority: "medium",
      message: ""
    }
  });

  const handleLeadSubmit = (data: any) => {
    console.log("Lead submission:", data);
    setIsLeadFormOpen(false);
    leadForm.reset();
  };

  const handleSupportSubmit = (data: any) => {
    console.log("Support ticket:", data);
    setIsSupportFormOpen(false);
    supportForm.reset();
  };

  const getStatusColor = (status: string) => {
    return getStatusStyle(status);
  };

  const getCommissionStatusColor = (status: string) => {
    return getStatusStyle(status);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">DigiComply Agent Portal</h1>
              </div>
              <Badge variant="secondary" className={getStatusStyle('active')}>
                {mockAgentProfile.agentCode}
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900 dark:text-white">{mockAgentProfile.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{mockAgentProfile.assignedTerritory}</div>
              </div>
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-8 lg:w-auto lg:grid-cols-none lg:flex">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="leads" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Leads
            </TabsTrigger>
            <TabsTrigger value="commissions" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Commissions
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Resources
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="support" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Support
            </TabsTrigger>
            <TabsTrigger value="incentives" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Incentives
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Profile
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Total Commission Earned</p>
                      <p className="text-2xl font-bold">₹{mockAgentProfile.totalCommissionEarned.toLocaleString()}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-600 to-green-700 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">Pending Payouts</p>
                      <p className="text-2xl font-bold">₹{mockAgentProfile.pendingPayouts.toLocaleString()}</p>
                    </div>
                    <Clock className="h-8 w-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">Active Leads</p>
                      <p className="text-2xl font-bold">{mockLeads.filter(l => !['closed', 'lost'].includes(l.status)).length}</p>
                    </div>
                    <Users className="h-8 w-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-orange-600 to-orange-700 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm font-medium">Conversion Rate</p>
                      <p className="text-2xl font-bold">{mockPerformanceMetrics.monthlyData.conversionRate}%</p>
                    </div>
                    <Target className="h-8 w-8 text-orange-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    onClick={() => setIsLeadFormOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Submit New Lead
                  </Button>
                  <Button 
                    onClick={() => setActiveTab("commissions")}
                    variant="outline"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    View Commissions
                  </Button>
                  <Button 
                    onClick={() => setIsSupportFormOpen(true)}
                    variant="outline"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Contact Support
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="font-medium">Lead converted to client</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Tech Innovations Pvt Ltd - ₹5,000 commission earned</p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">2 hours ago</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <div>
                        <p className="font-medium">New lead submitted</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Mumbai Restaurant Partners - Partnership deed required</p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">1 day ago</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leads Tab */}
          <TabsContent value="leads" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Lead Management</h2>
              <Button onClick={() => setIsLeadFormOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add New Lead
              </Button>
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {mockLeads.map((lead) => (
                    <div key={lead.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{lead.clientName}</h3>
                          <p className="text-gray-600 dark:text-gray-400">{lead.contactPhone}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-500">Entity: {lead.entityType}</p>
                        </div>
                        <Badge className={getStatusColor(lead.status)}>
                          {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Estimated Value</p>
                          <p className="text-lg font-semibold text-green-600 dark:text-green-400">₹{lead.estimatedValue.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Conversion Score</p>
                          <div className="flex items-center gap-2">
                            <Progress value={lead.conversionProbability} className="w-20" />
                            <span className="text-sm font-medium">{lead.conversionProbability}%</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Next Follow-up</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{format(new Date(lead.nextFollowupDate), 'MMM dd, yyyy')}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Phone className="h-4 w-4 mr-2" />
                          Call
                        </Button>
                        <Button size="sm" variant="outline">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          WhatsApp
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Commissions Tab */}
          <TabsContent value="commissions" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-r from-green-600 to-green-700 text-white">
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-green-100 text-sm">Total Earned</p>
                    <p className="text-3xl font-bold">₹{mockAgentProfile.totalCommissionEarned.toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-yellow-600 to-yellow-700 text-white">
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-yellow-100 text-sm">Pending Payouts</p>
                    <p className="text-3xl font-bold">₹{mockAgentProfile.pendingPayouts.toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-blue-100 text-sm">Cleared Payouts</p>
                    <p className="text-3xl font-bold">₹{mockAgentProfile.clearedPayouts.toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Commission Records</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Service Value</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Earned Date</TableHead>
                      <TableHead>Payout Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockCommissions.map((commission) => (
                      <TableRow key={commission.id}>
                        <TableCell className="font-medium">{commission.serviceCode.replace('_', ' ')}</TableCell>
                        <TableCell>{commission.clientName}</TableCell>
                        <TableCell>₹{commission.serviceValue.toLocaleString()}</TableCell>
                        <TableCell className="font-semibold text-green-600">₹{commission.commissionAmount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={getCommissionStatusColor(commission.status)}>
                            {commission.status.charAt(0).toUpperCase() + commission.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(commission.earnedDate), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{commission.payoutDate ? format(new Date(commission.payoutDate), 'MMM dd, yyyy') : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Marketing Resources Tab */}
          <TabsContent value="resources" className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Marketing Resources</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockMarketingResources.map((resource) => (
                <Card key={resource.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{resource.title}</h3>
                        <Badge variant="secondary" className="mb-2">
                          {resource.category}
                        </Badge>
                      </div>
                      <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                      <div className="flex justify-between">
                        <span>File Type:</span>
                        <span className="font-medium">{resource.fileType.toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Downloads:</span>
                        <span className="font-medium">{resource.downloadCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Updated:</span>
                        <span className="font-medium">{format(new Date(resource.lastUpdated), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Performance Analytics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                      <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Leads Submitted</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockPerformanceMetrics.monthlyData.leadsSubmitted}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
                      <Phone className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Leads Contacted</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockPerformanceMetrics.monthlyData.leadsContacted}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                      <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Leads Converted</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockPerformanceMetrics.monthlyData.leadsConverted}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                      <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Conversion Rate</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockPerformanceMetrics.monthlyData.conversionRate}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Top Performing Services</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockPerformanceMetrics.topServices.map((service, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{service.service}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{service.count} conversions</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600 dark:text-green-400">₹{service.commission.toLocaleString()}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Commission</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Support Tab */}
          <TabsContent value="support" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Support Center</h2>
              <Button onClick={() => setIsSupportFormOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                New Support Ticket
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Contact Admin Team
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">Need quick help? Chat directly with our admin team for immediate assistance.</p>
                  <Button className="w-full">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Start Chat
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5" />
                    FAQ & Help Center
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">Find answers to common questions and browse our comprehensive help documentation.</p>
                  <Button variant="outline" className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    Browse Help Articles
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Support Tickets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Commission payout inquiry</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Submitted 2 days ago</p>
                    </div>
                    <Badge className={getStatusStyle('inProgress')}>In Progress</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Lead transfer approval request</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Submitted 1 week ago</p>
                    </div>
                    <Badge className={getStatusStyle('completed')}>Resolved</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Incentives Tab */}
          <TabsContent value="incentives" className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Incentive Programs</h2>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Active Incentive Programs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Monthly Star Performer</h3>
                        <p className="text-gray-600 dark:text-gray-400">Top performer gets ₹10,000 bonus</p>
                      </div>
                      <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">Active</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Current Rank</p>
                        <p className="text-xl font-bold text-purple-600 dark:text-purple-400">#3</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Leads to Beat #1</p>
                        <p className="text-xl font-bold text-purple-600 dark:text-purple-400">2 more</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Days Remaining</p>
                        <p className="text-xl font-bold text-purple-600 dark:text-purple-400">12 days</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quarterly Excellence Award</h3>
                        <p className="text-gray-600 dark:text-gray-400">Maintain 80%+ conversion rate for 3 months</p>
                      </div>
                      <Badge className={getStatusStyle('inProgress')}>In Progress</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Current Rate</p>
                        <p className="text-xl font-bold text-green-600 dark:text-green-400">75%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Target Rate</p>
                        <p className="text-xl font-bold text-green-600 dark:text-green-400">80%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Months Completed</p>
                        <p className="text-xl font-bold text-green-600 dark:text-green-400">1/3</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Leaderboard</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: "Priya Sharma", leads: 18, commission: 45000, rank: 1 },
                    { name: "Amit Patel", leads: 15, commission: 38000, rank: 2 },
                    { name: "Rajesh Kumar", leads: 12, commission: 32000, rank: 3, isCurrentUser: true },
                    { name: "Deepak Singh", leads: 10, commission: 28000, rank: 4 },
                    { name: "Neha Gupta", leads: 8, commission: 22000, rank: 5 }
                  ].map((agent) => (
                    <div 
                      key={agent.rank}
                      className={`flex items-center justify-between p-4 rounded-lg ${
                        agent.isCurrentUser 
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800' 
                          : 'bg-gray-50 dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          agent.rank === 1 ? 'bg-yellow-500 text-white' :
                          agent.rank === 2 ? 'bg-gray-400 text-white' :
                          agent.rank === 3 ? 'bg-orange-500 text-white' :
                          'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}>
                          {agent.rank}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {agent.name} {agent.isCurrentUser && <span className="text-blue-600 dark:text-blue-400">(You)</span>}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{agent.leads} leads converted</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600 dark:text-green-400">₹{agent.commission.toLocaleString()}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">This month</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Agent Profile</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Agent Code</Label>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{mockAgentProfile.agentCode}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Name</Label>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{mockAgentProfile.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</Label>
                    <p className="text-gray-900 dark:text-white">{mockAgentProfile.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone</Label>
                    <p className="text-gray-900 dark:text-white">{mockAgentProfile.phone}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Assigned Territory</Label>
                    <p className="text-gray-900 dark:text-white">{mockAgentProfile.assignedTerritory}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Joining Date</Label>
                    <p className="text-gray-900 dark:text-white">{format(new Date(mockAgentProfile.joiningDate), 'MMMM dd, yyyy')}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Performance Rating</span>
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-500 fill-current" />
                      <span className="font-semibold text-gray-900 dark:text-white">{mockAgentProfile.performanceRating}/5.0</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Total Commission Earned</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">₹{mockAgentProfile.totalCommissionEarned.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Pending Payouts</span>
                    <span className="font-semibold text-yellow-600 dark:text-yellow-400">₹{mockAgentProfile.pendingPayouts.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Account Status</span>
                    <Badge className={getStatusStyle('active')}>Active</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Secure your account with 2FA</p>
                  </div>
                  <Badge className={getStatusStyle('active')}>Enabled</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Device Restrictions</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Limit access to approved devices</p>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Change Password</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Update your login password</p>
                  </div>
                  <Button variant="outline" size="sm">Change</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Lead Submission Form Dialog */}
      <Dialog open={isLeadFormOpen} onOpenChange={setIsLeadFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Submit New Lead</DialogTitle>
          </DialogHeader>
          <Form {...leadForm}>
            <form onSubmit={leadForm.handleSubmit(handleLeadSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={leadForm.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter client name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={leadForm.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+91 XXXXXXXXXX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={leadForm.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="client@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={leadForm.control}
                  name="entityType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entity Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select entity type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pvt_ltd">Private Limited</SelectItem>
                          <SelectItem value="partnership">Partnership</SelectItem>
                          <SelectItem value="proprietorship">Proprietorship</SelectItem>
                          <SelectItem value="llp">LLP</SelectItem>
                          <SelectItem value="ngo">NGO</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={leadForm.control}
                  name="estimatedValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Value (₹)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="25000" 
                          {...field} 
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={leadForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes about the lead..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsLeadFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Submit Lead</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Support Ticket Form Dialog */}
      <Dialog open={isSupportFormOpen} onOpenChange={setIsSupportFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Support Ticket</DialogTitle>
          </DialogHeader>
          <Form {...supportForm}>
            <form onSubmit={supportForm.handleSubmit(handleSupportSubmit)} className="space-y-4">
              <FormField
                control={supportForm.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief description of your issue" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={supportForm.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={supportForm.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe your issue in detail..." 
                        className="min-h-[120px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsSupportFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Submit Ticket</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}