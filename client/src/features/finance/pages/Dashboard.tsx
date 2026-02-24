import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getStatusColor, chartColors } from '@/lib/design-system-utils';
import { DashboardLayout, PageShell } from '@/layouts';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calculator,
  FileText,
  AlertTriangle,
  Clock,
  BarChart3,
  PieChart,
  Target,
  Wallet,
  Receipt,
  Plus,
  Download,
  Eye,
  Edit,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  LayoutDashboard,
  CreditCard,
  Building2,
  Users,
  Loader2
} from 'lucide-react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface FinancialSummary {
  totalRevenue: number;
  outstandingAmount: number;
  totalInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  avgCollectionDays: number;
  monthlyGrowth: number;
  clientCount: number;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  clientName: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
  paymentStatus: string;
  dueDate: string;
  invoiceDate: string;
}

interface FinancialKPIs {
  revenue: {
    current: number;
    previous: number;
    growth: number;
  };
  profitability: {
    grossProfit: number;
    netProfit: number;
    margin: number;
  };
  cashFlow: {
    receivables: number;
    payables: number;
    netCashFlow: number;
  };
  clientMetrics: {
    avgRevenuePerClient: number;
    lifetimeValue: number;
    acquisitionCost: number;
  };
}

interface BudgetPlan {
  id: number;
  planName: string;
  fiscalYear: string;
  revenueTarget: number;
  actualRevenue?: number;
  variance?: number;
  status: string;
}

interface AgingReport {
  current: { count: number; amount: number };
  days30_60: { count: number; amount: number };
  days60_90: { count: number; amount: number };
  over90: { count: number; amount: number };
}

interface ClientRevenue {
  client: string;
  revenue: number;
  invoiceCount: number;
}

interface Payment {
  id: number;
  invoiceId: number;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  referenceNumber: string;
  status: string;
}

// Finance navigation configuration
const financeNavigation = [
  {
    title: "Financial Overview",
    items: [
      { label: "Dashboard", href: "/financial-management", icon: LayoutDashboard },
      { label: "Revenue Analytics", href: "/revenue-analytics", icon: TrendingUp },
      { label: "Invoices", href: "/financial-management?tab=invoices", icon: Receipt },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Budget Planning", href: "/financial-management?tab=budgeting", icon: Target },
      { label: "Reports", href: "/financial-management?tab=reports", icon: BarChart3 },
      { label: "Clients", href: "/clients", icon: Building2 },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Profile", href: "/profile", icon: Users },
      { label: "Settings", href: "/settings", icon: CreditCard },
    ],
  },
];

const financeUser = {
  name: "Finance Manager",
  email: "finance@digicomply.com",
};

const FinancialManagementDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('monthly');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceDialog, setInvoiceDialog] = useState(false);
  const [createInvoiceDialog, setCreateInvoiceDialog] = useState(false);
  const [recordPaymentDialog, setRecordPaymentDialog] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newPayment, setNewPayment] = useState({
    amount: '',
    paymentMethod: 'bank_transfer',
    referenceNumber: '',
    notes: '',
  });
  const [newInvoice, setNewInvoice] = useState({
    clientName: '',
    businessEntityId: 1,
    totalAmount: '',
    taxAmount: '',
    description: '',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: typeof newInvoice) => {
      const response = await apiRequest('POST', '/api/financial/invoices', {
        businessEntityId: invoiceData.businessEntityId,
        totalAmount: parseFloat(invoiceData.totalAmount) || 0,
        taxAmount: parseFloat(invoiceData.taxAmount) || 0,
        subtotal: parseFloat(invoiceData.totalAmount) - (parseFloat(invoiceData.taxAmount) || 0),
        lineItems: [{ description: invoiceData.description, amount: parseFloat(invoiceData.totalAmount) }],
        notes: invoiceData.description,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Invoice Created',
        description: 'New invoice has been created successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/financial/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/financial/summary'] });
      setCreateInvoiceDialog(false);
      setNewInvoice({
        clientName: '',
        businessEntityId: 1,
        totalAmount: '',
        taxAmount: '',
        description: '',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to create invoice',
        variant: 'destructive',
      });
    },
  });

  // Financial data queries
  const { data: financialSummary, isLoading: summaryLoading } = useQuery<FinancialSummary>({
    queryKey: ['/api/financial/summary'],
  });

  const { data: kpis, isLoading: kpisLoading } = useQuery<FinancialKPIs>({
    queryKey: ['/api/financial/kpis', dateRange],
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ['/api/financial/invoices'],
  });

  const { data: revenueData = [] } = useQuery({
    queryKey: ['/api/financial/revenue', dateRange, 12],
  });

  const { data: budgetPlans = [] } = useQuery<BudgetPlan[]>({
    queryKey: ['/api/financial/budget-plans'],
  });

  const { data: collectionMetrics } = useQuery({
    queryKey: ['/api/financial/collection-metrics'],
  });

  const { data: agingReport } = useQuery<AgingReport>({
    queryKey: ['/api/financial/aging-report'],
  });

  const { data: clientRevenue = [] } = useQuery<ClientRevenue[]>({
    queryKey: ['/api/financial/client-revenue'],
  });

  // Record payment mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async (paymentData: { invoiceId: number; amount: number; paymentMethod: string; referenceNumber: string; notes: string }) => {
      const response = await apiRequest('PUT', `/api/financial/invoices/${paymentData.invoiceId}`, {
        paidAmount: paymentData.amount,
        paymentStatus: 'partial',
        notes: paymentData.notes,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Payment Recorded',
        description: 'Payment has been recorded successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/financial/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/financial/summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/financial/aging-report'] });
      setRecordPaymentDialog(false);
      setPaymentInvoice(null);
      setNewPayment({
        amount: '',
        paymentMethod: 'bank_transfer',
        referenceNumber: '',
        notes: '',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to record payment',
        variant: 'destructive',
      });
    },
  });

  // Filter invoices based on search and status
  const filteredInvoices = invoices.filter((invoice: Invoice) => {
    const matchesSearch = !searchTerm ||
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Chart colors using design system
  const COLORS = chartColors.semantic;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  return (
    <DashboardLayout
      navigation={financeNavigation}
      user={financeUser}
      logo={<span className="text-xl font-bold text-primary">DigiComply</span>}
    >
      <PageShell
        title="Financial Management"
        subtitle="Revenue analytics, invoicing, and financial planning"
        breadcrumbs={[
          { label: "Finance", href: "/financial-management" },
          { label: "Dashboard" },
        ]}
        actions={
          <div className="flex gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32" data-testid="select-date-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
            <Button data-testid="button-create-invoice" onClick={() => setCreateInvoiceDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card data-testid="card-total-revenue">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-foreground">
                    {summaryLoading ? '...' : formatCurrency(financialSummary?.totalRevenue || 0)}
                  </p>
                  <div className="flex items-center text-sm">
                    {(financialSummary?.monthlyGrowth || 0) >= 0 ? (
                      <ArrowUpRight className="h-4 w-4 text-success mr-1" aria-hidden="true" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-error mr-1" aria-hidden="true" />
                    )}
                    <span className={`font-medium ${(financialSummary?.monthlyGrowth || 0) >= 0 ? 'text-success' : 'text-error'}`}>
                      {formatPercentage(financialSummary?.monthlyGrowth || 0)}
                    </span>
                    <span className="text-muted-foreground ml-1">vs last month</span>
                  </div>
                </div>
                <div className="p-3 bg-success/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-success" aria-hidden="true" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-outstanding-amount">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Outstanding Amount</p>
                  <p className="text-2xl font-bold text-error">
                    {summaryLoading ? '...' : formatCurrency(financialSummary?.outstandingAmount || 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {financialSummary?.overdueInvoices || 0} overdue invoices
                  </p>
                </div>
                <div className="p-3 bg-error/10 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-error" aria-hidden="true" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-collection-rate">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Collection Rate</p>
                  <p className="text-2xl font-bold text-foreground">
                    {collectionMetrics ? `${collectionMetrics.collectionRate}%` : '...'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Avg {collectionMetrics?.avgCollectionDays || 0} days
                  </p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Target className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-profit-margin">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Net Profit Margin</p>
                  <p className="text-2xl font-bold text-foreground">
                    {kpisLoading ? '...' : `${kpis?.profitability.margin || 0}%`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(kpis?.profitability.netProfit || 0)}
                  </p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="invoices" data-testid="tab-invoices">Invoices</TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
            <TabsTrigger value="budgeting" data-testid="tab-budgeting">Budgeting</TabsTrigger>
            <TabsTrigger value="reports" data-testid="tab-reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Trend Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Revenue Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis tickFormatter={(value) => `₹${(value/1000)}k`} />
                        <Tooltip formatter={(value: any) => [formatCurrency(value), 'Revenue']} />
                        <Area 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="#10B981" 
                          fill="#10B981" 
                          fillOpacity={0.3} 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Cash Flow Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Cash Flow Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900 rounded">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Receivables</p>
                          <p className="text-sm text-gray-500">Money owed to us</p>
                        </div>
                      </div>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(kpis?.cashFlow.receivables || 0)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900 rounded">
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Payables</p>
                          <p className="text-sm text-gray-500">Money we owe</p>
                        </div>
                      </div>
                      <p className="text-lg font-bold text-red-600">
                        {formatCurrency(kpis?.cashFlow.payables || 0)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded">
                          <Calculator className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Net Cash Flow</p>
                          <p className="text-sm text-gray-500">Receivables - Payables</p>
                        </div>
                      </div>
                      <p className="text-lg font-bold text-blue-600">
                        {formatCurrency(kpis?.cashFlow.netCashFlow || 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Invoices */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Recent Invoices
                  </div>
                  <Button variant="outline" size="sm" data-testid="button-view-all-invoices">
                    View All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoicesLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                            <p className="mt-2 text-gray-500">Loading invoices...</p>
                          </TableCell>
                        </TableRow>
                      ) : invoices.slice(0, 5).map((invoice: Invoice) => (
                        <TableRow key={invoice.id} data-testid={`invoice-row-${invoice.invoiceNumber}`}>
                          <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                          <TableCell>{invoice.clientName}</TableCell>
                          <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(invoice.status)}>
                              {invoice.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setInvoiceDialog(true);
                                }}
                                data-testid={`button-view-invoice-${invoice.invoiceNumber}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                data-testid={`button-edit-invoice-${invoice.invoiceNumber}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices" className="space-y-6">
            {/* Invoice Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Invoice Management
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search invoices..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64"
                    />
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-40" data-testid="select-invoice-status">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" data-testid="button-export-invoices">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    <Button onClick={() => setCreateInvoiceDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Invoice
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Invoice Date</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Outstanding</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoicesLoading ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8">
                            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                            <p className="mt-2 text-gray-500">Loading invoices...</p>
                          </TableCell>
                        </TableRow>
                      ) : filteredInvoices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8">
                            <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                            <p className="text-gray-500">No invoices found</p>
                          </TableCell>
                        </TableRow>
                      ) : filteredInvoices.map((invoice: Invoice) => (
                        <TableRow key={invoice.id} data-testid={`invoice-row-${invoice.invoiceNumber}`}>
                          <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                          <TableCell>{invoice.clientName}</TableCell>
                          <TableCell>{invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : '-'}</TableCell>
                          <TableCell>
                            <span className={new Date(invoice.dueDate) < new Date() && invoice.status !== 'paid' ? 'text-red-600 font-medium' : ''}>
                              {new Date(invoice.dueDate).toLocaleDateString()}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(invoice.totalAmount)}</TableCell>
                          <TableCell className="text-right text-green-600">{formatCurrency(invoice.paidAmount)}</TableCell>
                          <TableCell className="text-right text-orange-600">{formatCurrency(invoice.outstandingAmount)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(invoice.status)}>
                              {invoice.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setInvoiceDialog(true);
                                }}
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setPaymentInvoice(invoice);
                                    setNewPayment({
                                      amount: String(invoice.outstandingAmount),
                                      paymentMethod: 'bank_transfer',
                                      referenceNumber: '',
                                      notes: '',
                                    });
                                    setRecordPaymentDialog(true);
                                  }}
                                  title="Record Payment"
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <DollarSign className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Edit Invoice"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Invoice Summary Stats */}
                <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total Invoices</p>
                    <p className="text-xl font-bold">{filteredInvoices.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total Value</p>
                    <p className="text-xl font-bold">{formatCurrency(filteredInvoices.reduce((sum: number, inv: Invoice) => sum + inv.totalAmount, 0))}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total Paid</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(filteredInvoices.reduce((sum: number, inv: Invoice) => sum + inv.paidAmount, 0))}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total Outstanding</p>
                    <p className="text-xl font-bold text-orange-600">{formatCurrency(filteredInvoices.reduce((sum: number, inv: Invoice) => sum + inv.outstandingAmount, 0))}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {/* Aging Report */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Accounts Receivable Aging Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-600 font-medium">Current (0-30 days)</p>
                    <p className="text-2xl font-bold text-green-700">{formatCurrency(agingReport?.current.amount || 0)}</p>
                    <p className="text-sm text-green-600">{agingReport?.current.count || 0} invoices</p>
                  </div>
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm text-yellow-600 font-medium">30-60 Days</p>
                    <p className="text-2xl font-bold text-yellow-700">{formatCurrency(agingReport?.days30_60.amount || 0)}</p>
                    <p className="text-sm text-yellow-600">{agingReport?.days30_60.count || 0} invoices</p>
                  </div>
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <p className="text-sm text-orange-600 font-medium">60-90 Days</p>
                    <p className="text-2xl font-bold text-orange-700">{formatCurrency(agingReport?.days60_90.amount || 0)}</p>
                    <p className="text-sm text-orange-600">{agingReport?.days60_90.count || 0} invoices</p>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-600 font-medium">Over 90 Days</p>
                    <p className="text-2xl font-bold text-red-700">{formatCurrency(agingReport?.over90.amount || 0)}</p>
                    <p className="text-sm text-red-600">{agingReport?.over90.count || 0} invoices</p>
                  </div>
                </div>

                {/* Aging Bar Chart */}
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { period: 'Current', amount: agingReport?.current.amount || 0, count: agingReport?.current.count || 0 },
                      { period: '30-60 Days', amount: agingReport?.days30_60.amount || 0, count: agingReport?.days30_60.count || 0 },
                      { period: '60-90 Days', amount: agingReport?.days60_90.amount || 0, count: agingReport?.days60_90.count || 0 },
                      { period: '90+ Days', amount: agingReport?.over90.amount || 0, count: agingReport?.over90.count || 0 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis tickFormatter={(value) => `₹${(value/1000)}k`} />
                      <Tooltip formatter={(value: any) => [formatCurrency(value), 'Amount']} />
                      <Bar dataKey="amount" fill="#F59E0B" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue by Month */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue vs Expenses Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis tickFormatter={(value) => `₹${(value/1000)}k`} />
                        <Tooltip formatter={(value: any) => [formatCurrency(value), '']} />
                        <Legend />
                        <Bar dataKey="revenue" name="Revenue" fill="#10B981" />
                        <Bar dataKey="expenses" name="Expenses" fill="#EF4444" />
                        <Bar dataKey="profit" name="Profit" fill="#3B82F6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Top Clients by Revenue */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Clients by Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  {clientRevenue.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No client revenue data available
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {clientRevenue.slice(0, 8).map((client, index) => {
                        const maxRevenue = clientRevenue[0]?.revenue || 1;
                        const percentage = (client.revenue / maxRevenue) * 100;
                        return (
                          <div key={index} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium truncate max-w-[200px]">{client.client}</span>
                              <span className="text-muted-foreground">{formatCurrency(client.revenue)}</span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                            <p className="text-xs text-muted-foreground">{client.invoiceCount} invoices</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Collection Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Collection Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 border rounded-lg text-center">
                    <p className="text-3xl font-bold text-green-600">{collectionMetrics?.collectionRate || 0}%</p>
                    <p className="text-sm text-muted-foreground">Collection Rate</p>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <p className="text-3xl font-bold text-blue-600">{collectionMetrics?.avgCollectionDays || 0}</p>
                    <p className="text-sm text-muted-foreground">Avg Collection Days</p>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <p className="text-3xl font-bold text-green-600">{collectionMetrics?.onTimePayments || 0}%</p>
                    <p className="text-sm text-muted-foreground">On-Time Payments</p>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <p className="text-3xl font-bold text-orange-600">{collectionMetrics?.latePayments || 0}%</p>
                    <p className="text-sm text-muted-foreground">Late Payments</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="budgeting" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Budget Planning & Forecasting
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(Array.isArray(budgetPlans) ? budgetPlans : []).map((plan: BudgetPlan) => (
                    <div key={plan.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">{plan.planName}</h3>
                          <p className="text-sm text-gray-500">FY {plan.fiscalYear}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(plan.revenueTarget)}</p>
                          <Badge className={plan.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
                            {plan.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!budgetPlans || budgetPlans.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      No budget plans found. Create your first budget plan to get started.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Financial Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col gap-2"
                    data-testid="button-profit-loss-report"
                  >
                    <FileText className="h-5 w-5" />
                    Profit & Loss Report
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col gap-2"
                    data-testid="button-cash-flow-report"
                  >
                    <TrendingUp className="h-5 w-5" />
                    Cash Flow Report
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col gap-2"
                    data-testid="button-aging-report"
                  >
                    <Clock className="h-5 w-5" />
                    Aging Report
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col gap-2"
                    data-testid="button-client-revenue-report"
                  >
                    <PieChart className="h-5 w-5" />
                    Client Revenue Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Invoice Detail Dialog */}
      <Dialog open={invoiceDialog} onOpenChange={setInvoiceDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice Details - {selectedInvoice?.invoiceNumber}</DialogTitle>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Client</p>
                  <p className="text-lg">{selectedInvoice.clientName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Amount</p>
                  <p className="text-lg font-bold">{formatCurrency(selectedInvoice.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <Badge className={getStatusColor(selectedInvoice.status)}>
                    {selectedInvoice.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Due Date</p>
                  <p>{new Date(selectedInvoice.dueDate).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Invoice
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Invoice Dialog */}
      <Dialog open={createInvoiceDialog} onOpenChange={setCreateInvoiceDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Invoice</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name</Label>
              <Input
                id="clientName"
                placeholder="Enter client name"
                value={newInvoice.clientName}
                onChange={(e) => setNewInvoice({ ...newInvoice, clientName: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalAmount">Amount (₹)</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  placeholder="0.00"
                  value={newInvoice.totalAmount}
                  onChange={(e) => setNewInvoice({ ...newInvoice, totalAmount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxAmount">Tax Amount (₹)</Label>
                <Input
                  id="taxAmount"
                  type="number"
                  placeholder="0.00"
                  value={newInvoice.taxAmount}
                  onChange={(e) => setNewInvoice({ ...newInvoice, taxAmount: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={newInvoice.dueDate}
                onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter invoice description or services..."
                value={newInvoice.description}
                onChange={(e) => setNewInvoice({ ...newInvoice, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateInvoiceDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createInvoiceMutation.mutate(newInvoice)}
              disabled={createInvoiceMutation.isPending || !newInvoice.totalAmount}
            >
              {createInvoiceMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Invoice'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={recordPaymentDialog} onOpenChange={setRecordPaymentDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>

          {paymentInvoice && (
            <div className="space-y-4 py-4">
              {/* Invoice Summary */}
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Invoice</span>
                  <span className="font-medium">{paymentInvoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Client</span>
                  <span className="font-medium">{paymentInvoice.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Amount</span>
                  <span className="font-medium">{formatCurrency(paymentInvoice.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Already Paid</span>
                  <span className="font-medium text-green-600">{formatCurrency(paymentInvoice.paidAmount)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-medium">Outstanding</span>
                  <span className="font-bold text-orange-600">{formatCurrency(paymentInvoice.outstandingAmount)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentAmount">Payment Amount (₹)</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  placeholder="0.00"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                  max={paymentInvoice.outstandingAmount}
                />
                {parseFloat(newPayment.amount) > paymentInvoice.outstandingAmount && (
                  <p className="text-xs text-red-500">Amount exceeds outstanding balance</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select
                  value={newPayment.paymentMethod}
                  onValueChange={(value) => setNewPayment({ ...newPayment, paymentMethod: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="debit_card">Debit Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="referenceNumber">Reference / Transaction ID</Label>
                <Input
                  id="referenceNumber"
                  placeholder="Enter transaction reference"
                  value={newPayment.referenceNumber}
                  onChange={(e) => setNewPayment({ ...newPayment, referenceNumber: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentNotes">Notes (Optional)</Label>
                <Textarea
                  id="paymentNotes"
                  placeholder="Any additional notes..."
                  value={newPayment.notes}
                  onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRecordPaymentDialog(false);
              setPaymentInvoice(null);
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (paymentInvoice) {
                  recordPaymentMutation.mutate({
                    invoiceId: paymentInvoice.id,
                    amount: parseFloat(newPayment.amount) || 0,
                    paymentMethod: newPayment.paymentMethod,
                    referenceNumber: newPayment.referenceNumber,
                    notes: newPayment.notes,
                  });
                }
              }}
              disabled={recordPaymentMutation.isPending || !newPayment.amount || parseFloat(newPayment.amount) <= 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {recordPaymentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Record Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  </DashboardLayout>
  );
};

export default FinancialManagementDashboard;