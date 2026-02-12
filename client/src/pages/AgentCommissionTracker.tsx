import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DollarSign,
  ArrowLeft,
  TrendingUp,
  Clock,
  CheckCircle,
  Download,
  Filter,
  Calendar
} from 'lucide-react';
import { Link } from 'wouter';
import { format } from 'date-fns';
import { SkeletonTable } from '@/components/ui/skeleton-loader';
import { EmptyList } from '@/components/ui/empty-state';

export default function AgentCommissionTracker() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');

  const { data: commissionsData, isLoading } = useQuery({
    queryKey: ['/api/agent/commissions', { status: statusFilter, period: periodFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (periodFilter && periodFilter !== 'all') params.append('period', periodFilter);
      const response = await fetch(`/api/agent/commissions?${params.toString()}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch commissions');
      return response.json();
    },
  });

  const { data: summaryData, isLoading: loadingSummary } = useQuery({
    queryKey: ['/api/agent/commissions/summary'],
    queryFn: async () => {
      const response = await fetch('/api/agent/commissions/summary', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch commission summary');
      return response.json();
    },
  });

  const commissions = (commissionsData as any)?.commissions || [];
  const summary = (summaryData as any);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'cleared':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'cleared':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/agent/dashboard">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Commission Tracker
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Track your earnings and payouts
            </p>
          </div>
          <Button variant="outline" data-testid="button-download-report">
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        {loadingSummary ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </>
        ) : summary ? (
          <>
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
              <CardHeader className="pb-3">
                <CardDescription>Total Earned</CardDescription>
                <CardTitle className="text-3xl text-green-700 dark:text-green-400">
                  ₹{(summary.totalEarned || 0).toLocaleString('en-IN')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-medium">Lifetime earnings</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950">
              <CardHeader className="pb-3">
                <CardDescription>Pending Payout</CardDescription>
                <CardTitle className="text-3xl text-orange-700 dark:text-orange-400">
                  ₹{(summary.pendingAmount || 0).toLocaleString('en-IN')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-orange-600">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">Processing</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Cleared Amount</CardDescription>
                <CardTitle className="text-3xl">
                  ₹{(summary.clearedAmount || 0).toLocaleString('en-IN')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium">Already paid</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>This Month</CardDescription>
                <CardTitle className="text-3xl">
                  ₹{(summary.thisMonthEarnings || 0).toLocaleString('en-IN')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">Current month</span>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="col-span-4 text-center py-8 text-gray-500">
            <p>Unable to load commission summary. Please try again.</p>
          </div>
        )}
      </div>

      {/* Next Payout Card */}
      {loadingSummary ? (
        <Skeleton className="h-24 w-full mb-6" />
      ) : summary?.nextPayoutDate ? (
        <Card className="mb-6 border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <DollarSign className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    Next Payout
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Scheduled for {format(new Date(summary.nextPayoutDate), 'PPP')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-primary">
                  ₹{(summary.nextPayoutAmount || 0).toLocaleString('en-IN')}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  To be credited
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="cleared">Cleared</SelectItem>
                </SelectContent>
              </Select>
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger data-testid="select-period-filter">
                  <SelectValue placeholder="Filter by period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="this_quarter">This Quarter</SelectItem>
                  <SelectItem value="this_year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commission History */}
      <Card>
        <CardHeader>
          <CardTitle>Commission History</CardTitle>
          <CardDescription>
            Detailed breakdown of all your earnings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonTable rows={5} columns={7} />
          ) : commissions.length === 0 ? (
            <EmptyList
              title="No commissions yet"
              description="Start converting leads to earn commissions. Your earnings will appear here once clients complete services"
              actionLabel="View Leads"
              onAction={() => window.location.href = '/agent/leads'}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Client/Lead</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payout Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((commission: any, index: number) => (
                    <TableRow key={commission.id || index} data-testid={`commission-row-${index}`}>
                      <TableCell className="font-medium">
                        {commission.createdAt ? format(new Date(commission.createdAt), 'dd MMM yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell>{commission.clientName || commission.leadName || 'N/A'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {commission.serviceName || 'N/A'}
                      </TableCell>
                      <TableCell>₹{commission.serviceAmount?.toLocaleString('en-IN') || '0'}</TableCell>
                      <TableCell className="font-semibold text-green-600">
                        ₹{commission.commissionAmount?.toLocaleString('en-IN') || '0'}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(commission.status)} variant="secondary">
                          {getStatusIcon(commission.status)}
                          <span className="ml-1 capitalize">{commission.status || 'pending'}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {commission.payoutDate ? format(new Date(commission.payoutDate), 'dd MMM yyyy') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
