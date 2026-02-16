import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  Users
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
    title: "Settings",
    items: [
      { label: "Payment Methods", href: "/settings/payments", icon: CreditCard },
      { label: "Team", href: "/settings/team", icon: Users },
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
            <Button data-testid="button-create-invoice">
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
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-40" data-testid="select-invoice-status">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button data-testid="button-export-invoices">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 mb-4">Complete invoice management system will be implemented here.</p>
                {/* Full invoice management interface will be implemented */}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Profit Margin Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Profit Margin Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="revenue" fill="#10B981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Client Revenue Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Client Revenue Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={[
                            { name: 'High Value', value: 40, color: '#8B5CF6' },
                            { name: 'Medium Value', value: 35, color: '#06B6D4' },
                            { name: 'Low Value', value: 25, color: '#84CC16' }
                          ]}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                        >
                          {[
                            { name: 'High Value', value: 40, color: '#8B5CF6' },
                            { name: 'Medium Value', value: 35, color: '#06B6D4' },
                            { name: 'Low Value', value: 25, color: '#84CC16' }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
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
                  {budgetPlans.map((plan: BudgetPlan) => (
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
    </PageShell>
  </DashboardLayout>
  );
};

export default FinancialManagementDashboard;