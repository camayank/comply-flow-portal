/**
 * Admin Reports
 *
 * Comprehensive reporting dashboard for administrators:
 * - Service Requests reports with status and amounts
 * - Revenue reports grouped by period
 * - Users activity summary
 * - Compliance status breakdown
 * - Export functionality (CSV/JSON)
 */

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DashboardLayout } from '@/layouts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  CheckSquare,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Types
interface ServiceRequestReport {
  id: number;
  requestNumber: string;
  serviceName: string;
  customerName: string;
  status: string;
  amount: number;
  createdAt: string;
  completedAt: string | null;
}

interface RevenueReport {
  period: string;
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  growth: number;
}

interface UserReport {
  id: number;
  name: string;
  email: string;
  role: string;
  requestsCount: number;
  lastActive: string;
  status: string;
}

interface ComplianceReport {
  category: string;
  totalItems: number;
  compliant: number;
  nonCompliant: number;
  pending: number;
  complianceRate: number;
}

interface ReportSummary {
  totalRequests?: number;
  completedRequests?: number;
  pendingRequests?: number;
  totalRevenue?: number;
  totalUsers?: number;
  activeUsers?: number;
  newUsers?: number;
  overallCompliance?: number;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary?: ReportSummary;
}

export default function AdminReports() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('service-requests');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Build query params
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    params.append('page', currentPage.toString());
    params.append('pageSize', pageSize.toString());
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return params.toString();
  };

  // Fetch Service Requests Report
  const {
    data: serviceRequestsData,
    isLoading: isLoadingServiceRequests,
  } = useQuery<PaginatedResponse<ServiceRequestReport>>({
    queryKey: ['/api/admin/reports/service-requests', currentPage, startDate, endDate],
    queryFn: () =>
      apiRequest(`/api/admin/reports/service-requests?${buildQueryParams()}`),
    enabled: activeTab === 'service-requests',
  });

  // Fetch Revenue Report
  const {
    data: revenueData,
    isLoading: isLoadingRevenue,
  } = useQuery<PaginatedResponse<RevenueReport>>({
    queryKey: ['/api/admin/reports/revenue', currentPage, startDate, endDate],
    queryFn: () =>
      apiRequest(`/api/admin/reports/revenue?${buildQueryParams()}`),
    enabled: activeTab === 'revenue',
  });

  // Fetch Users Report
  const {
    data: usersData,
    isLoading: isLoadingUsers,
  } = useQuery<PaginatedResponse<UserReport>>({
    queryKey: ['/api/admin/reports/users', currentPage, startDate, endDate],
    queryFn: () =>
      apiRequest(`/api/admin/reports/users?${buildQueryParams()}`),
    enabled: activeTab === 'users',
  });

  // Fetch Compliance Report
  const {
    data: complianceData,
    isLoading: isLoadingCompliance,
  } = useQuery<PaginatedResponse<ComplianceReport>>({
    queryKey: ['/api/admin/reports/compliance', currentPage, startDate, endDate],
    queryFn: () =>
      apiRequest(`/api/admin/reports/compliance?${buildQueryParams()}`),
    enabled: activeTab === 'compliance',
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async (format: 'csv' | 'json') => {
      const response = await apiRequest<{ url: string; filename: string }>(
        '/api/admin/reports/export',
        {
          method: 'POST',
          body: {
            reportType: activeTab,
            format,
            startDate,
            endDate,
          },
        }
      );
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: 'Export Successful',
        description: `Report exported as ${data.filename}`,
      });
      // In a real implementation, trigger download
      if (data.url) {
        window.open(data.url, '_blank');
      }
    },
    onError: () => {
      toast({
        title: 'Export Failed',
        description: 'Failed to export report. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleExport = (format: 'csv' | 'json') => {
    exportMutation.mutate(format);
  };

  const handleDateFilter = () => {
    setCurrentPage(1);
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      completed: 'bg-green-500 hover:bg-green-600',
      pending: 'bg-yellow-500 hover:bg-yellow-600',
      in_progress: 'bg-blue-500 hover:bg-blue-600',
      cancelled: 'bg-red-500 hover:bg-red-600',
      draft: 'bg-gray-500 hover:bg-gray-600',
      active: 'bg-green-500 hover:bg-green-600',
      inactive: 'bg-gray-500 hover:bg-gray-600',
    };
    return (
      <Badge className={statusStyles[status.toLowerCase()] || 'bg-gray-500'}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      dateStyle: 'medium',
    });
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Get current data based on active tab
  const getCurrentData = () => {
    switch (activeTab) {
      case 'service-requests':
        return serviceRequestsData;
      case 'revenue':
        return revenueData;
      case 'users':
        return usersData;
      case 'compliance':
        return complianceData;
      default:
        return null;
    }
  };

  const currentData = getCurrentData();
  const totalPages = currentData?.totalPages || 1;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-600" />
              Reports
            </h1>
            <p className="text-muted-foreground">
              Generate and export comprehensive reports
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={exportMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {exportMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <FileText className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('json')}>
                <FileText className="h-4 w-4 mr-2" />
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Date Range Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Start Date
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-48"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  End Date
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-48"
                />
              </div>
              <Button onClick={handleDateFilter} variant="outline">
                Apply Filter
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setCurrentPage(1);
                }}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value);
            setCurrentPage(1);
          }}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="service-requests" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Service Requests
            </TabsTrigger>
            <TabsTrigger value="revenue" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Revenue
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="compliance" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Compliance
            </TabsTrigger>
          </TabsList>

          {/* Service Requests Tab */}
          <TabsContent value="service-requests">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Requests</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {serviceRequestsData?.summary?.totalRequests || 0}
                      </p>
                    </div>
                    <FileText className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Completed</p>
                      <p className="text-2xl font-bold text-green-600">
                        {serviceRequestsData?.summary?.completedRequests || 0}
                      </p>
                    </div>
                    <CheckSquare className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pending</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {serviceRequestsData?.summary?.pendingRequests || 0}
                      </p>
                    </div>
                    <Calendar className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {formatCurrency(serviceRequestsData?.summary?.totalRevenue || 0)}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Data Table */}
            <Card>
              <CardHeader>
                <CardTitle>Service Requests Report</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingServiceRequests ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Request #</TableHead>
                          <TableHead>Service</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Completed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {serviceRequestsData?.data?.length ? (
                          serviceRequestsData.data.map((request) => (
                            <TableRow key={request.id}>
                              <TableCell className="font-medium">
                                {request.requestNumber}
                              </TableCell>
                              <TableCell>{request.serviceName}</TableCell>
                              <TableCell>{request.customerName}</TableCell>
                              <TableCell>{getStatusBadge(request.status)}</TableCell>
                              <TableCell>{formatCurrency(request.amount)}</TableCell>
                              <TableCell>{formatDate(request.createdAt)}</TableCell>
                              <TableCell>{formatDate(request.completedAt)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              No service requests found for the selected period.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * pageSize) + 1} to{' '}
                        {Math.min(currentPage * pageSize, serviceRequestsData?.total || 0)} of{' '}
                        {serviceRequestsData?.total || 0} results
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <span className="text-sm">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Revenue Tab */}
          <TabsContent value="revenue">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(
                          revenueData?.data?.reduce((sum, r) => sum + r.totalAmount, 0) || 0
                        )}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Transactions</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {revenueData?.data?.reduce((sum, r) => sum + r.transactionCount, 0) || 0}
                      </p>
                    </div>
                    <FileText className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg. Transaction</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {formatCurrency(
                          revenueData?.data?.length
                            ? revenueData.data.reduce((sum, r) => sum + r.averageAmount, 0) /
                                revenueData.data.length
                            : 0
                        )}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg. Growth</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {formatPercentage(
                          revenueData?.data?.length
                            ? revenueData.data.reduce((sum, r) => sum + r.growth, 0) /
                                revenueData.data.length
                            : 0
                        )}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Data Table */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Report by Period</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingRevenue ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Period</TableHead>
                          <TableHead>Total Amount</TableHead>
                          <TableHead>Transactions</TableHead>
                          <TableHead>Average Amount</TableHead>
                          <TableHead>Growth</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {revenueData?.data?.length ? (
                          revenueData.data.map((revenue, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{revenue.period}</TableCell>
                              <TableCell>{formatCurrency(revenue.totalAmount)}</TableCell>
                              <TableCell>{revenue.transactionCount}</TableCell>
                              <TableCell>{formatCurrency(revenue.averageAmount)}</TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    revenue.growth >= 0
                                      ? 'bg-green-500 hover:bg-green-600'
                                      : 'bg-red-500 hover:bg-red-600'
                                  }
                                >
                                  {revenue.growth >= 0 ? '+' : ''}
                                  {formatPercentage(revenue.growth)}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              No revenue data found for the selected period.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * pageSize) + 1} to{' '}
                        {Math.min(currentPage * pageSize, revenueData?.total || 0)} of{' '}
                        {revenueData?.total || 0} results
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <span className="text-sm">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Users</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {usersData?.summary?.totalUsers || 0}
                      </p>
                    </div>
                    <Users className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Users</p>
                      <p className="text-2xl font-bold text-green-600">
                        {usersData?.summary?.activeUsers || 0}
                      </p>
                    </div>
                    <CheckSquare className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">New Users</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {usersData?.summary?.newUsers || 0}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg. Requests/User</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {usersData?.data?.length
                          ? (
                              usersData.data.reduce((sum, u) => sum + u.requestsCount, 0) /
                              usersData.data.length
                            ).toFixed(1)
                          : '0'}
                      </p>
                    </div>
                    <FileText className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Data Table */}
            <Card>
              <CardHeader>
                <CardTitle>Users Activity Report</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Requests</TableHead>
                          <TableHead>Last Active</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usersData?.data?.length ? (
                          usersData.data.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">{user.name}</TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{user.role}</Badge>
                              </TableCell>
                              <TableCell>{user.requestsCount}</TableCell>
                              <TableCell>{formatDate(user.lastActive)}</TableCell>
                              <TableCell>{getStatusBadge(user.status)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              No users found for the selected period.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * pageSize) + 1} to{' '}
                        {Math.min(currentPage * pageSize, usersData?.total || 0)} of{' '}
                        {usersData?.total || 0} results
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <span className="text-sm">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Overall Compliance</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatPercentage(complianceData?.summary?.overallCompliance || 0)}
                      </p>
                    </div>
                    <CheckSquare className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Compliant Items</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {complianceData?.data?.reduce((sum, c) => sum + c.compliant, 0) || 0}
                      </p>
                    </div>
                    <CheckSquare className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Non-Compliant</p>
                      <p className="text-2xl font-bold text-red-600">
                        {complianceData?.data?.reduce((sum, c) => sum + c.nonCompliant, 0) || 0}
                      </p>
                    </div>
                    <CheckSquare className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pending Review</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {complianceData?.data?.reduce((sum, c) => sum + c.pending, 0) || 0}
                      </p>
                    </div>
                    <Calendar className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Data Table */}
            <Card>
              <CardHeader>
                <CardTitle>Compliance Status Report</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingCompliance ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead>Total Items</TableHead>
                          <TableHead>Compliant</TableHead>
                          <TableHead>Non-Compliant</TableHead>
                          <TableHead>Pending</TableHead>
                          <TableHead>Compliance Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {complianceData?.data?.length ? (
                          complianceData.data.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{item.category}</TableCell>
                              <TableCell>{item.totalItems}</TableCell>
                              <TableCell>
                                <span className="text-green-600 font-medium">{item.compliant}</span>
                              </TableCell>
                              <TableCell>
                                <span className="text-red-600 font-medium">{item.nonCompliant}</span>
                              </TableCell>
                              <TableCell>
                                <span className="text-yellow-600 font-medium">{item.pending}</span>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    item.complianceRate >= 90
                                      ? 'bg-green-500 hover:bg-green-600'
                                      : item.complianceRate >= 70
                                      ? 'bg-yellow-500 hover:bg-yellow-600'
                                      : 'bg-red-500 hover:bg-red-600'
                                  }
                                >
                                  {formatPercentage(item.complianceRate)}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              No compliance data found for the selected period.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * pageSize) + 1} to{' '}
                        {Math.min(currentPage * pageSize, complianceData?.total || 0)} of{' '}
                        {complianceData?.total || 0} results
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <span className="text-sm">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
