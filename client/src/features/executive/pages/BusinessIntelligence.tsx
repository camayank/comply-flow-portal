import { useState } from 'react';
import { DashboardLayout } from '@/layouts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart as PieChartIcon,
  Target,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Users,
  Activity,
  Star,
  Brain,
  Lightbulb,
  Download,
  Filter,
  Calendar,
  Search,
  RefreshCw,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Eye,
  Settings,
  Zap,
  Award,
  Globe,
  Shield,
  Clock,
  FileText,
  Briefcase
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { DateRange } from 'react-day-picker';

interface BusinessIntelligenceData {
  summary: {
    timeframe: string;
    totalRevenue: number;
    growthRate: number;
    clientCount: number;
    serviceCompletionRate: number;
  };
  forecasting: {
    nextMonth: number;
    nextQuarter: number;
    confidence: number;
    factors: string[];
  };
  segmentAnalysis: {
    segments: Array<{
      name: string;
      clients: number;
      revenue: number;
      satisfaction: number;
    }>;
  };
  operationalEfficiency: {
    currentEfficiency: number;
    bottlenecks: string[];
    recommendations: string[];
  };
  riskAnalysis: {
    riskLevel: string;
    factors: Array<{
      name: string;
      level: string;
      impact: string;
    }>;
  };
  recommendations: Array<{
    category: string;
    recommendation: string;
    impact: string;
    effort: string;
  }>;
  benchmarks: {
    completionRate: { our: number; industry: number };
    clientSatisfaction: { our: number; industry: number };
    slaCompliance: { our: number; industry: number };
  };
  profitability: {
    grossMargin: number;
    netMargin: number;
    mostProfitableService: string;
    leastProfitableService: string;
  };
}

interface PerformanceTrends {
  revenueTrends: {
    labels: string[];
    data: number[];
    growth: string;
  };
  clientGrowthTrends: {
    labels: string[];
    data: number[];
    growth: string;
  };
  serviceTrends: {
    labels: string[];
    data: number[];
    growth: string;
  };
  qualityTrends: {
    labels: string[];
    data: number[];
    growth: string;
  };
  efficiencyTrends: {
    labels: string[];
    data: number[];
    growth: string;
  };
  satisfactionTrends: {
    labels: string[];
    data: number[];
    growth: string;
  };
  complianceTrends: {
    labels: string[];
    data: number[];
    growth: string;
  };
  comparativeAnalysis: {
    comparison: string;
    current: {
      revenue: number;
      clients: number;
      satisfaction: number;
    };
    previous: {
      revenue: number;
      clients: number;
      satisfaction: number;
    };
    growth: {
      revenue: string;
      clients: string;
      satisfaction: string;
    };
  } | null;
}

const BusinessIntelligence = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeframe, setTimeframe] = useState('quarterly');
  const [comparison, setComparison] = useState('year_over_year');
  const [selectedMetrics, setSelectedMetrics] = useState(['revenue', 'quality', 'efficiency', 'client_satisfaction']);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [drillDownData, setDrillDownData] = useState<any>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const { toast } = useToast();

  // Business Intelligence data
  const { data: biData, isLoading: biLoading, refetch: refetchBI } = useQuery<BusinessIntelligenceData>({
    queryKey: ['/api/analytics/business-intelligence', timeframe, comparison, selectedMetrics],
  });

  // Performance trends data
  const { data: trendsData, isLoading: trendsLoading } = useQuery<PerformanceTrends>({
    queryKey: ['/api/analytics/performance-trends', 'monthly', comparison],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getRiskColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact.toLowerCase()) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleExport = async (reportType: string, format: 'json' | 'csv' = 'json') => {
    try {
      const response = await fetch(`/api/analytics/export/${reportType}?format=${format}&timeframe=${timeframe}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Export Complete',
        description: `${reportType} report exported successfully.`,
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export report. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const chartColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  if (biLoading || trendsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading business intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
    <div className="bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Brain className="h-8 w-8 text-purple-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Business Intelligence</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Advanced analytics, forecasting & strategic insights
                  </p>
                </div>
              </div>
              
              <Badge variant="outline" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                AI-Powered
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="w-32" data-testid="select-timeframe">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>

              <Select value={comparison} onValueChange={setComparison}>
                <SelectTrigger className="w-40" data-testid="select-comparison">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="previous">vs Previous Period</SelectItem>
                  <SelectItem value="year_over_year">Year over Year</SelectItem>
                  <SelectItem value="industry">vs Industry</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetchBI()}
                data-testid="button-refresh"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>

              <Button size="sm" onClick={() => handleExport('executive-summary')} data-testid="button-export">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <Eye className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="forecasting" data-testid="tab-forecasting">
              <TrendingUp className="h-4 w-4 mr-2" />
              Forecasting
            </TabsTrigger>
            <TabsTrigger value="segments" data-testid="tab-segments">
              <PieChartIcon className="h-4 w-4 mr-2" />
              Segments
            </TabsTrigger>
            <TabsTrigger value="efficiency" data-testid="tab-efficiency">
              <Activity className="h-4 w-4 mr-2" />
              Efficiency
            </TabsTrigger>
            <TabsTrigger value="risks" data-testid="tab-risks">
              <Shield className="h-4 w-4 mr-2" />
              Risk Analysis
            </TabsTrigger>
            <TabsTrigger value="benchmarks" data-testid="tab-benchmarks">
              <Award className="h-4 w-4 mr-2" />
              Benchmarks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Business Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <Card data-testid="card-revenue-summary">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(biData?.summary.totalRevenue || 0)}
                      </p>
                      <div className="flex items-center mt-2 text-green-600">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-sm ml-1">{formatPercentage(biData?.summary.growthRate || 0)}</span>
                      </div>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-client-summary">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Client Base</p>
                      <p className="text-2xl font-bold text-blue-600">{biData?.summary.clientCount || 0}</p>
                      <p className="text-sm text-blue-600 mt-2">Active Clients</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-completion-summary">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Completion Rate</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {formatPercentage(biData?.summary.serviceCompletionRate || 0)}
                      </p>
                      <p className="text-sm text-orange-600 mt-2">Service Success</p>
                    </div>
                    <Target className="h-8 w-8 text-orange-200" />
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-forecasting-confidence">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Forecast Confidence</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {formatPercentage(biData?.forecasting.confidence || 0)}
                      </p>
                      <p className="text-sm text-purple-600 mt-2">AI Prediction</p>
                    </div>
                    <Brain className="h-8 w-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Strategic Insights */}
            <Card data-testid="card-strategic-insights">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Strategic Insights & Recommendations
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => toggleSection('insights')}
                    data-testid="button-toggle-insights"
                  >
                    {expandedSections.includes('insights') ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CardTitle>
              </CardHeader>
              {expandedSections.includes('insights') && (
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {biData?.recommendations.map((rec, index) => (
                      <Alert key={index} className="border-l-4 border-l-blue-500">
                        <AlertTitle className="flex items-center gap-2">
                          <Badge variant="outline">{rec.category}</Badge>
                          <span className={getImpactColor(rec.impact)}>{rec.impact} Impact</span>
                        </AlertTitle>
                        <AlertDescription className="mt-2">
                          <p className="font-medium">{rec.recommendation}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            Effort Required: <span className="font-medium">{rec.effort}</span>
                          </p>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Performance Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card data-testid="card-revenue-trends">
                <CardHeader>
                  <CardTitle>Revenue Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={trendsData?.revenueTrends.labels.map((label, index) => ({
                      month: label,
                      revenue: trendsData?.revenueTrends.data[index] || 0
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Revenue']} />
                      <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Growth Rate</span>
                    <Badge variant="outline" className="text-green-600">
                      {trendsData?.revenueTrends.growth}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-efficiency-trends">
                <CardHeader>
                  <CardTitle>Operational Efficiency</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trendsData?.efficiencyTrends.labels.map((label, index) => ({
                      month: label,
                      efficiency: trendsData?.efficiencyTrends.data[index] || 0
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value}%`, 'Efficiency']} />
                      <Line type="monotone" dataKey="efficiency" stroke="#10B981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Current Level</span>
                    <Badge variant="outline" className="text-green-600">
                      {biData?.operationalEfficiency.currentEfficiency}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Comparative Analysis */}
            {trendsData?.comparativeAnalysis && (
              <Card data-testid="card-comparative-analysis">
                <CardHeader>
                  <CardTitle>Comparative Performance ({trendsData.comparativeAnalysis.comparison})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-300">Revenue</p>
                      <p className="text-xl font-bold text-blue-600">
                        {formatCurrency(trendsData.comparativeAnalysis.current.revenue)}
                      </p>
                      <p className="text-sm text-blue-600">{trendsData.comparativeAnalysis.growth.revenue}</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-300">Clients</p>
                      <p className="text-xl font-bold text-green-600">
                        {trendsData.comparativeAnalysis.current.clients}
                      </p>
                      <p className="text-sm text-green-600">{trendsData.comparativeAnalysis.growth.clients}</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-300">Satisfaction</p>
                      <p className="text-xl font-bold text-orange-600">
                        {trendsData.comparativeAnalysis.current.satisfaction}/5
                      </p>
                      <p className="text-sm text-orange-600">{trendsData.comparativeAnalysis.growth.satisfaction}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="forecasting" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card data-testid="card-revenue-forecast">
                <CardHeader>
                  <CardTitle>Revenue Forecasting</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <span className="font-medium">Next Month</span>
                      <span className="text-xl font-bold text-blue-600">
                        {formatCurrency(biData?.forecasting.nextMonth || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <span className="font-medium">Next Quarter</span>
                      <span className="text-xl font-bold text-green-600">
                        {formatCurrency(biData?.forecasting.nextQuarter || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-300">Confidence Level</span>
                      <div className="flex items-center gap-2">
                        <Progress value={biData?.forecasting.confidence || 0} className="w-20" />
                        <span className="text-sm font-medium">{biData?.forecasting.confidence}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-forecast-factors">
                <CardHeader>
                  <CardTitle>Forecast Factors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {biData?.forecasting.factors.map((factor, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{factor}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="segments" className="space-y-6">
            <Card data-testid="card-client-segments">
              <CardHeader>
                <CardTitle>Client Segment Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={biData?.segmentAnalysis.segments.map(segment => ({
                          name: segment.name,
                          value: segment.revenue
                        }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                      >
                        {biData?.segmentAnalysis.segments.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="space-y-4">
                    {biData?.segmentAnalysis.segments.map((segment, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{segment.name}</h3>
                          <Badge style={{backgroundColor: chartColors[index % chartColors.length], color: 'white'}}>
                            {segment.clients} clients
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-300">Revenue</span>
                            <p className="font-semibold">{formatCurrency(segment.revenue)}</p>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-300">Satisfaction</span>
                            <p className="font-semibold">{segment.satisfaction}/5</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="efficiency" className="space-y-6">
            <Card data-testid="card-operational-efficiency">
              <CardHeader>
                <CardTitle>Operational Efficiency Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-4">Current Efficiency: {biData?.operationalEfficiency.currentEfficiency}%</h3>
                    <Progress value={biData?.operationalEfficiency.currentEfficiency || 0} className="mb-4" />
                    
                    <h4 className="font-medium mb-2 text-red-600">Identified Bottlenecks</h4>
                    <div className="space-y-2">
                      {biData?.operationalEfficiency.bottlenecks.map((bottleneck, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <span className="text-sm">{bottleneck}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2 text-green-600">Optimization Recommendations</h4>
                    <div className="space-y-2">
                      {biData?.operationalEfficiency.recommendations.map((rec, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                          <Lightbulb className="h-4 w-4 text-green-600" />
                          <span className="text-sm">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-efficiency-trends-detail">
              <CardHeader>
                <CardTitle>Efficiency Trends Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={trendsData?.efficiencyTrends.labels.map((label, index) => ({
                    month: label,
                    efficiency: trendsData?.efficiencyTrends.data[index] || 0,
                    quality: trendsData?.qualityTrends.data[index] || 0,
                    satisfaction: (trendsData?.satisfactionTrends.data[index] || 0) * 20 // Scale to percentage
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="efficiency" fill="#10B981" name="Efficiency %" />
                    <Line type="monotone" dataKey="quality" stroke="#3B82F6" name="Quality Score" />
                    <Line type="monotone" dataKey="satisfaction" stroke="#F59E0B" name="Satisfaction %" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risks" className="space-y-6">
            <Card data-testid="card-risk-assessment">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Risk Assessment Overview
                  <Badge variant={biData?.riskAnalysis.riskLevel === 'Low' ? 'secondary' : 'destructive'}>
                    {biData?.riskAnalysis.riskLevel} Risk
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {biData?.riskAnalysis.factors.map((risk, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{risk.name}</h3>
                        <Badge className={getRiskColor(risk.level)}>
                          {risk.level} Risk
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        <strong>Impact:</strong> {risk.impact}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="benchmarks" className="space-y-6">
            <Card data-testid="card-industry-benchmarks">
              <CardHeader>
                <CardTitle>Industry Benchmarks Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">Completion Rate</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Our Performance</span>
                          <span className="font-semibold text-green-600">{biData?.benchmarks.completionRate.our}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Industry Average</span>
                          <span className="font-semibold text-gray-600">{biData?.benchmarks.completionRate.industry}%</span>
                        </div>
                        <Progress 
                          value={(biData?.benchmarks.completionRate.our || 0) / (biData?.benchmarks.completionRate.industry || 1) * 100} 
                          className="mt-2" 
                        />
                      </div>
                    </div>

                    <div className="text-center p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">Client Satisfaction</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Our Performance</span>
                          <span className="font-semibold text-green-600">{biData?.benchmarks.clientSatisfaction.our}/5</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Industry Average</span>
                          <span className="font-semibold text-gray-600">{biData?.benchmarks.clientSatisfaction.industry}/5</span>
                        </div>
                        <Progress 
                          value={(biData?.benchmarks.clientSatisfaction.our || 0) / (biData?.benchmarks.clientSatisfaction.industry || 1) * 100} 
                          className="mt-2" 
                        />
                      </div>
                    </div>

                    <div className="text-center p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">SLA Compliance</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Our Performance</span>
                          <span className="font-semibold text-green-600">{biData?.benchmarks.slaCompliance.our}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Industry Average</span>
                          <span className="font-semibold text-gray-600">{biData?.benchmarks.slaCompliance.industry}%</span>
                        </div>
                        <Progress 
                          value={(biData?.benchmarks.slaCompliance.our || 0) / (biData?.benchmarks.slaCompliance.industry || 1) * 100} 
                          className="mt-2" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Profitability Analysis */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Profitability Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex justify-between">
                            <span>Gross Margin</span>
                            <span className="font-semibold">{biData?.profitability.grossMargin}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Net Margin</span>
                            <span className="font-semibold">{biData?.profitability.netMargin}%</span>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <span className="text-sm text-gray-600">Most Profitable Service</span>
                            <p className="font-semibold text-green-600">{biData?.profitability.mostProfitableService}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">Least Profitable Service</span>
                            <p className="font-semibold text-red-600">{biData?.profitability.leastProfitableService}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </DashboardLayout>
  );
};

export default BusinessIntelligence;