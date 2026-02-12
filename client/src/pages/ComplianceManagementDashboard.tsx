import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BulkUploadDialogEnhanced, ColumnDefinition, BulkUploadResult } from '@/components/BulkUploadDialogEnhanced';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Download,
  Upload,
  Bell,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Shield,
  FileWarning,
  Zap,
  RefreshCw,
  Eye,
  Check,
  X,
  AlertCircle,
  IndianRupee,
  Building2,
  ArrowUpRight,
  Loader2,
  ListFilter,
  BarChart3,
  Activity,
} from 'lucide-react';

// Bulk upload column definitions for compliance items
const complianceBulkColumns: ColumnDefinition[] = [
  { key: 'entityName', label: 'Entity Name', type: 'text', required: true, placeholder: 'ABC Pvt Ltd' },
  { key: 'complianceType', label: 'Compliance Type', type: 'select', required: true, options: [
    { value: 'GST', label: 'GST' },
    { value: 'Income Tax', label: 'Income Tax' },
    { value: 'MCA', label: 'MCA' },
    { value: 'Payroll', label: 'Payroll' },
    { value: 'Licenses', label: 'Licenses' },
    { value: 'Other', label: 'Other' },
  ]},
  { key: 'serviceName', label: 'Service Name', type: 'text', placeholder: 'GST Return Filing' },
  { key: 'dueDate', label: 'Due Date', type: 'date', required: true },
  { key: 'status', label: 'Status', type: 'select', options: [
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
  ]},
  { key: 'penaltyAmount', label: 'Penalty Amount (₹)', type: 'number', placeholder: '1000' },
  { key: 'notes', label: 'Notes', type: 'text', placeholder: 'Additional notes' },
];

interface ComplianceItem {
  id: number;
  businessEntityId: number;
  serviceId: string | number;
  complianceType: string;
  dueDate: string;
  actualCompletionDate: string | null;
  status: string;
  penaltyApplied: boolean;
  penaltyAmount: number | null;
  notes: string | null;
  serviceName: string | null;
  serviceCategory: string | null;
  entityName?: string;
  daysUntilDue: number;
  urgency: 'overdue' | 'critical' | 'warning' | 'safe';
  penaltyRisk?: number;
  requiredDocuments?: { documentType: string; documentName: string; isMandatory: boolean | null }[];
  missingDocuments?: { documentType: string; documentName: string; isMandatory: boolean | null }[];
  evidenceSummary?: { required: number; uploaded: number; missing: number };
}

interface CalendarDay {
  day: number | null;
  date?: string;
  items: ComplianceItem[];
  hasOverdue?: boolean;
  hasCritical?: boolean;
  hasWarning?: boolean;
}

interface ComplianceAlert {
  id: number;
  businessEntityId: number;
  alertType: string;
  severity: string;
  title: string;
  message: string;
  status: string;
  createdAt: string;
  entityName?: string;
}

interface EntityHealth {
  entityId: number;
  entityName: string;
  state: 'GREEN' | 'AMBER' | 'RED';
  overdueCount: number;
  upcomingCount: number;
}

const ComplianceManagementDashboard = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'dashboard' | 'calendar' | 'alerts' | 'health'>('dashboard');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<ComplianceItem | null>(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showExtensionDialog, setShowExtensionDialog] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Fetch compliance calendar
  const { data: calendarData, isLoading: calendarLoading } = useQuery({
    queryKey: ['/api/compliance/calendar', { month: currentMonth, year: currentYear, category: filterCategory, status: filterStatus, entityId: selectedEntity !== 'all' ? selectedEntity : undefined }],
  });

  // Fetch compliance dashboard
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['/api/compliance/dashboard', { entityId: selectedEntity !== 'all' ? selectedEntity : undefined }],
  });

  // Fetch all alerts
  const { data: alertsData } = useQuery({
    queryKey: ['/api/compliance/alerts', { status: 'pending' }],
  });

  // Mutations
  const completeItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/compliance/items/${id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorPayload = await res.json().catch(() => ({}));
        throw new Error(errorPayload.message || errorPayload.error || 'Failed to complete item');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/compliance'] });
      toast({ title: 'Success', description: 'Compliance item marked as complete' });
      setShowCompleteDialog(false);
      setSelectedItem(null);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error?.message || 'Failed to complete item', variant: 'destructive' });
    },
  });

  const requestExtensionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/compliance/items/${id}/extension`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to request extension');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/compliance'] });
      toast({ title: 'Success', description: 'Extension request submitted' });
      setShowExtensionDialog(false);
      setSelectedItem(null);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to request extension', variant: 'destructive' });
    },
  });

  const acknowledgeAlertMutation = useMutation({
    mutationFn: async (alertId: number) => {
      const res = await fetch(`/api/compliance/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to acknowledge alert');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/compliance/alerts'] });
      toast({ title: 'Alert acknowledged' });
    },
  });

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'overdue': return 'bg-red-500 text-white';
      case 'critical': return 'bg-orange-500 text-white';
      case 'warning': return 'bg-yellow-500 text-black';
      case 'safe': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'GREEN': return 'bg-green-500';
      case 'AMBER': return 'bg-amber-500';
      case 'RED': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const categories = ['all', 'GST', 'Income Tax', 'MCA', 'Payroll', 'Labor', 'Licenses', 'Registrations', 'Funding Readiness', 'Other'];

  const handleBulkUpload = async (data: Record<string, any>[]): Promise<BulkUploadResult> => {
    try {
      const response = await fetch('/api/compliance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: data }),
        credentials: 'include',
      });
      const result = await response.json();
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/compliance'] });
        return { success: result.created || data.length, failed: result.failed || 0, errors: result.errors || [] };
      }
      return { success: 0, failed: data.length, errors: [result.message || 'Bulk upload failed'] };
    } catch (error: any) {
      return { success: 0, failed: data.length, errors: [error.message || 'Network error'] };
    }
  };

  const summary = calendarData?.summary || {
    total: 0,
    overdue: 0,
    critical: 0,
    warning: 0,
    completed: 0,
    pending: 0,
    inProgress: 0,
    totalPenaltyRisk: 0,
    entitiesAtRisk: 0
  };

  const dashSummary = dashboardData?.summary || {
    totalEntities: 0,
    greenEntities: 0,
    amberEntities: 0,
    redEntities: 0,
    pendingAlerts: 0,
    upcomingDeadlines: 0
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Shield className="h-6 w-6 text-blue-600" />
                Compliance Management
              </h1>
              <p className="text-sm text-gray-600 mt-1">Complete compliance lifecycle management with calendar, alerts, and health tracking</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setBulkUploadOpen(true)} data-testid="button-bulk-import-compliance">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/compliance'] })}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* View Mode Tabs */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="mb-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Alerts
              {(alertsData?.alerts?.length || 0) > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {alertsData?.alerts?.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Health
            </TabsTrigger>
          </TabsList>

          {/* Dashboard View */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Entities</p>
                      <p className="text-2xl font-bold">{dashSummary.totalEntities}</p>
                    </div>
                    <Building2 className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Badge className="bg-green-500">{dashSummary.greenEntities} Green</Badge>
                    <Badge className="bg-amber-500">{dashSummary.amberEntities} Amber</Badge>
                    <Badge className="bg-red-500">{dashSummary.redEntities} Red</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Upcoming Deadlines</p>
                      <p className="text-2xl font-bold text-orange-600">{dashSummary.upcomingDeadlines}</p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-600" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Next 30 days</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Pending Alerts</p>
                      <p className="text-2xl font-bold text-red-600">{dashSummary.pendingAlerts}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Requires attention</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Penalty Risk</p>
                      <p className="text-2xl font-bold text-purple-600">
                        <IndianRupee className="h-5 w-5 inline" />
                        {summary.totalPenaltyRisk?.toLocaleString() || 0}
                      </p>
                    </div>
                    <FileWarning className="h-8 w-8 text-purple-600" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Potential exposure</p>
                </CardContent>
              </Card>
            </div>

            {/* Entity Health & Upcoming Deadlines */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Entity Health Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Entity Health Status</CardTitle>
                  <CardDescription>Compliance state by entity</CardDescription>
                </CardHeader>
                <CardContent>
                  {dashboardLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                  ) : (dashboardData?.entityHealth || []).length > 0 ? (
                    <div className="space-y-3">
                      {(dashboardData?.entityHealth || []).map((entity: EntityHealth) => (
                        <div key={entity.entityId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${getStateColor(entity.state)}`} />
                            <div>
                              <p className="font-medium">{entity.entityName || `Entity ${entity.entityId}`}</p>
                              <div className="flex gap-2 text-xs text-gray-500">
                                <span>{entity.overdueCount} overdue</span>
                                <span>{entity.upcomingCount} upcoming</span>
                              </div>
                            </div>
                          </div>
                          <Badge className={getStateColor(entity.state)}>{entity.state}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Shield className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p>No entity health data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Upcoming Deadlines */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Upcoming Deadlines</CardTitle>
                  <CardDescription>Next 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  {dashboardLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                  ) : (dashboardData?.upcomingDeadlines || []).length > 0 ? (
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {(dashboardData?.upcomingDeadlines || []).slice(0, 10).map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div>
                            <p className="font-medium text-sm">{item.serviceName || item.complianceType}</p>
                            <p className="text-xs text-gray-500">{item.entityName}</p>
                          </div>
                          <div className="text-right">
                            <Badge className={getUrgencyColor(item.daysUntilDue <= 3 ? 'critical' : item.daysUntilDue <= 7 ? 'warning' : 'safe')}>
                              {item.daysUntilDue}d left
                            </Badge>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(item.dueDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                      <p>No upcoming deadlines</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Alerts</CardTitle>
                <CardDescription>Action required</CardDescription>
              </CardHeader>
              <CardContent>
                {(dashboardData?.recentAlerts || []).length > 0 ? (
                  <div className="space-y-3">
                    {(dashboardData?.recentAlerts || []).map((alert: any) => (
                      <div key={alert.id} className={`flex items-center justify-between p-3 rounded-lg ${getSeverityColor(alert.severity)}`}>
                        <div className="flex items-center gap-3">
                          <AlertCircle className="h-5 w-5" />
                          <div>
                            <p className="font-medium">{alert.title}</p>
                            <p className="text-sm opacity-80">{alert.message}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => acknowledgeAlertMutation.mutate(alert.id)}>
                          Acknowledge
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>No pending alerts</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Calendar View */}
          <TabsContent value="calendar" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <ListFilter className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium">Filters:</span>
                  </div>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {cat === 'all' ? 'All Categories' : cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="bg-red-50 border-red-200">
                <CardContent className="pt-4 pb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{summary.overdue}</p>
                    <p className="text-xs text-red-700">Overdue</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="pt-4 pb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">{summary.critical}</p>
                    <p className="text-xs text-orange-700">Critical (3d)</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="pt-4 pb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">{summary.warning}</p>
                    <p className="text-xs text-yellow-700">Warning (7d)</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4 pb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{summary.inProgress}</p>
                    <p className="text-xs text-blue-700">In Progress</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-4 pb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{summary.completed}</p>
                    <p className="text-xs text-green-700">Completed</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Calendar Grid */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="sm" onClick={() => navigateMonth('prev')}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <CardTitle>
                    {calendarData?.monthName || currentDate.toLocaleString('en-US', { month: 'long' })} {calendarData?.year || currentYear}
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigateMonth('next')}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {calendarLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <>
                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-2 text-center mb-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-sm font-semibold text-gray-600 py-2">
                          {day}
                        </div>
                      ))}
                    </div>
                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 gap-2">
                      {(calendarData?.calendar || []).map((dayData: CalendarDay, index: number) => (
                        <div
                          key={index}
                          className={`min-h-24 p-2 rounded-lg border ${
                            dayData.day === null
                              ? 'bg-gray-50 border-gray-100'
                              : dayData.hasOverdue
                              ? 'bg-red-50 border-red-200'
                              : dayData.hasCritical
                              ? 'bg-orange-50 border-orange-200'
                              : dayData.hasWarning
                              ? 'bg-yellow-50 border-yellow-200'
                              : 'bg-white border-gray-200 hover:border-blue-300'
                          }`}
                        >
                          {dayData.day && (
                            <>
                              <div className="font-medium text-sm mb-1">{dayData.day}</div>
                              <div className="space-y-1">
                                {dayData.items.slice(0, 3).map((item) => (
                                  <Sheet key={item.id}>
                                    <SheetTrigger asChild>
                                      <div
                                        className={`text-xs p-1 rounded cursor-pointer truncate ${getUrgencyColor(item.urgency)}`}
                                        onClick={() => setSelectedItem(item)}
                                      >
                                        {item.serviceName || item.complianceType}
                                      </div>
                                    </SheetTrigger>
                                    <SheetContent className="w-[400px] sm:w-[540px]">
                                      <SheetHeader>
                                        <SheetTitle>{item.serviceName || item.complianceType}</SheetTitle>
                                      </SheetHeader>
                                      <div className="mt-6 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <Label className="text-gray-500">Status</Label>
                                            <Badge className={getUrgencyColor(item.urgency)}>{item.status}</Badge>
                                          </div>
                                          <div>
                                            <Label className="text-gray-500">Due Date</Label>
                                            <p className="font-medium">{new Date(item.dueDate).toLocaleDateString()}</p>
                                          </div>
                                          <div>
                                            <Label className="text-gray-500">Category</Label>
                                            <p>{item.serviceCategory || 'N/A'}</p>
                                          </div>
                                          <div>
                                            <Label className="text-gray-500">Days Until Due</Label>
                                            <p className={item.daysUntilDue < 0 ? 'text-red-600 font-bold' : ''}>
                                              {item.daysUntilDue < 0 ? `${Math.abs(item.daysUntilDue)} days overdue` : `${item.daysUntilDue} days`}
                                            </p>
                                          </div>
                                          {item.penaltyAmount && (
                                            <div className="col-span-2">
                                              <Label className="text-gray-500">Penalty Risk</Label>
                                              <p className="text-red-600 font-bold">
                                                <IndianRupee className="h-4 w-4 inline" />
                                                {item.penaltyAmount.toLocaleString()}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                        {item.notes && (
                                          <div>
                                            <Label className="text-gray-500">Notes</Label>
                                            <p className="text-sm">{item.notes}</p>
                                          </div>
                                        )}
                                        {item.evidenceSummary && (
                                          <div>
                                            <Label className="text-gray-500">Evidence</Label>
                                            <p className="text-sm">
                                              Required: {item.evidenceSummary.required} · Uploaded: {item.evidenceSummary.uploaded} · Missing: {item.evidenceSummary.missing}
                                            </p>
                                            {item.missingDocuments && item.missingDocuments.length > 0 ? (
                                              <div className="mt-2 rounded-md border border-red-100 bg-red-50 p-2">
                                                <p className="text-xs font-semibold text-red-700">Missing Documents</p>
                                                <ul className="mt-1 list-disc pl-4 text-xs text-red-700">
                                                  {item.missingDocuments.map(doc => (
                                                    <li key={doc.documentType}>{doc.documentName}</li>
                                                  ))}
                                                </ul>
                                              </div>
                                            ) : (
                                              <p className="text-xs text-green-700 mt-1">All required documents uploaded.</p>
                                            )}
                                          </div>
                                        )}
                                        <div className="flex gap-2 pt-4">
                                          {item.status !== 'completed' && (
                                            <>
                                              <Button
                                                onClick={() => {
                                                  setSelectedItem(item);
                                                  setShowCompleteDialog(true);
                                                }}
                                                className="flex-1"
                                              >
                                                <Check className="h-4 w-4 mr-2" />
                                                Mark Complete
                                              </Button>
                                              <Button
                                                variant="outline"
                                                onClick={() => {
                                                  setSelectedItem(item);
                                                  setShowExtensionDialog(true);
                                                }}
                                                className="flex-1"
                                              >
                                                <Clock className="h-4 w-4 mr-2" />
                                                Request Extension
                                              </Button>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </SheetContent>
                                  </Sheet>
                                ))}
                                {dayData.items.length > 3 && (
                                  <div className="text-xs text-gray-500 text-center">
                                    +{dayData.items.length - 3} more
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Item List Below Calendar */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">All Items This Month</CardTitle>
              </CardHeader>
              <CardContent>
                {(calendarData?.items || []).length > 0 ? (
                  <div className="space-y-3">
                    {(calendarData?.items || []).map((item: ComplianceItem) => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{item.serviceName || item.complianceType}</h4>
                            <Badge className={getUrgencyColor(item.urgency)}>{item.urgency}</Badge>
                            {item.penaltyRisk ? (
                              <Badge variant="outline" className="text-red-600 border-red-300">
                                <IndianRupee className="h-3 w-3" />
                                {item.penaltyRisk.toLocaleString()} risk
                              </Badge>
                            ) : null}
                            {item.evidenceSummary ? (
                              <Badge
                                variant="outline"
                                className={
                                  item.evidenceSummary.missing > 0
                                    ? 'text-red-600 border-red-300'
                                    : 'text-green-600 border-green-300'
                                }
                              >
                                Evidence {item.evidenceSummary.uploaded}/{item.evidenceSummary.required}
                              </Badge>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>{item.serviceCategory}</span>
                            <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                            {item.entityName && <span>{item.entityName}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {item.status !== 'completed' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedItem(item);
                                setShowCompleteDialog(true);
                              }}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>No compliance items for this month</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts View */}
          <TabsContent value="alerts" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="bg-red-50 border-red-200">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-700">Critical</p>
                      <p className="text-2xl font-bold text-red-600">
                        {(alertsData?.alerts || []).filter((a: any) => a.severity === 'critical').length}
                      </p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-700">High</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {(alertsData?.alerts || []).filter((a: any) => a.severity === 'high').length}
                      </p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-yellow-700">Medium/Low</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {(alertsData?.alerts || []).filter((a: any) => ['medium', 'low'].includes(a.severity)).length}
                      </p>
                    </div>
                    <Bell className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>All Alerts</CardTitle>
                <CardDescription>Compliance alerts requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                {(alertsData?.alerts || []).length > 0 ? (
                  <div className="space-y-3">
                    {(alertsData?.alerts || []).map((alert: ComplianceAlert) => (
                      <div key={alert.id} className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{alert.title}</h4>
                              <Badge>{alert.severity}</Badge>
                              <Badge variant="outline">{alert.alertType}</Badge>
                            </div>
                            <p className="text-sm mb-2">{alert.message}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              {alert.entityName && <span>{alert.entityName}</span>}
                              <span>{new Date(alert.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => acknowledgeAlertMutation.mutate(alert.id)}
                              disabled={acknowledgeAlertMutation.isPending}
                            >
                              {acknowledgeAlertMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                              Acknowledge
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p className="text-lg font-medium">All Clear!</p>
                    <p className="text-sm">No pending alerts</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Health View */}
          <TabsContent value="health" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Shield className="h-12 w-12 mx-auto mb-2 text-green-600" />
                    <p className="text-3xl font-bold text-green-600">{dashSummary.greenEntities}</p>
                    <p className="text-sm text-green-700">GREEN - Healthy</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-2 text-amber-600" />
                    <p className="text-3xl font-bold text-amber-600">{dashSummary.amberEntities}</p>
                    <p className="text-sm text-amber-700">AMBER - At Risk</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-red-50 border-red-200">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <X className="h-12 w-12 mx-auto mb-2 text-red-600" />
                    <p className="text-3xl font-bold text-red-600">{dashSummary.redEntities}</p>
                    <p className="text-sm text-red-700">RED - Critical</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Entity Health Details</CardTitle>
                <CardDescription>Compliance status for all entities</CardDescription>
              </CardHeader>
              <CardContent>
                {(dashboardData?.entityHealth || []).length > 0 ? (
                  <div className="space-y-4">
                    {(dashboardData?.entityHealth || []).map((entity: EntityHealth) => (
                      <div key={entity.entityId} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full ${getStateColor(entity.state)}`} />
                            <h4 className="font-medium">{entity.entityName || `Entity ${entity.entityId}`}</h4>
                          </div>
                          <Badge className={getStateColor(entity.state)}>{entity.state}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-red-50 p-3 rounded">
                            <p className="text-xs text-red-700">Overdue Items</p>
                            <p className="text-xl font-bold text-red-600">{entity.overdueCount}</p>
                          </div>
                          <div className="bg-orange-50 p-3 rounded">
                            <p className="text-xs text-orange-700">Upcoming Critical</p>
                            <p className="text-xl font-bold text-orange-600">{entity.upcomingCount}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1">
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                          <Button size="sm" className="flex-1">
                            <Zap className="h-4 w-4 mr-2" />
                            Take Action
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No entity health data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Mark Complete Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Complete</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              if (selectedItem) {
                completeItemMutation.mutate({
                  id: selectedItem.id,
                  data: {
                    filingReference: formData.get('filingReference'),
                    completionDate: formData.get('completionDate'),
                    notes: formData.get('notes'),
                  },
                });
              }
            }}
          >
            <div className="space-y-4 py-4">
              <div>
                <Label>Filing Reference (optional)</Label>
                <Input name="filingReference" placeholder="ARN, Acknowledgment Number, etc." />
              </div>
              <div>
                <Label>Completion Date</Label>
                <Input name="completionDate" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Textarea name="notes" placeholder="Any additional notes..." />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCompleteDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={completeItemMutation.isPending}>
                {completeItemMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Mark Complete
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Extension Request Dialog */}
      <Dialog open={showExtensionDialog} onOpenChange={setShowExtensionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Extension</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              if (selectedItem) {
                requestExtensionMutation.mutate({
                  id: selectedItem.id,
                  data: {
                    reason: formData.get('reason'),
                    requestedDate: formData.get('requestedDate'),
                  },
                });
              }
            }}
          >
            <div className="space-y-4 py-4">
              <div>
                <Label>Requested New Due Date</Label>
                <Input name="requestedDate" type="date" required />
              </div>
              <div>
                <Label>Reason for Extension</Label>
                <Textarea name="reason" placeholder="Please explain why you need an extension..." required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowExtensionDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={requestExtensionMutation.isPending}>
                {requestExtensionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <BulkUploadDialogEnhanced
        open={bulkUploadOpen}
        onOpenChange={setBulkUploadOpen}
        title="Bulk Import Compliance Items"
        description="Upload multiple compliance items at once using Excel or CSV file"
        columns={complianceBulkColumns}
        onUpload={handleBulkUpload}
        sampleData={[
          { entityName: 'ABC Pvt Ltd', complianceType: 'GST', serviceName: 'GSTR-3B Filing', dueDate: '2025-02-20', status: 'pending', penaltyAmount: 500, notes: 'Monthly return' },
          { entityName: 'XYZ Corp', complianceType: 'Income Tax', serviceName: 'TDS Return', dueDate: '2025-02-15', status: 'in_progress', penaltyAmount: 1000, notes: 'Q4 return' },
        ]}
      />
    </div>
  );
};

export default ComplianceManagementDashboard;
