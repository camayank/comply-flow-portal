import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  type LeaveType,
  type LeaveRequestStatus,
  leaveTypeConfig,
  leaveRequestStatusConfig,
  calculateLeaveDays,
  getLeaveBalance,
} from '../config';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  User,
} from 'lucide-react';
import { format, differenceInDays, isAfter, isBefore } from 'date-fns';

// ============================================================================
// Leave Type Badge
// ============================================================================

interface LeaveTypeBadgeProps {
  type: LeaveType | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function LeaveTypeBadge({
  type,
  size = 'md',
  showIcon = true,
  className,
}: LeaveTypeBadgeProps) {
  const config = leaveTypeConfig[type as LeaveType] || leaveTypeConfig.casual;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  return (
    <Badge
      className={cn(
        config.bgColor,
        sizeClasses[size],
        'font-medium inline-flex items-center gap-1',
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </Badge>
  );
}

// ============================================================================
// Leave Request Status Badge
// ============================================================================

interface LeaveRequestStatusBadgeProps {
  status: LeaveRequestStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function LeaveRequestStatusBadge({
  status,
  size = 'md',
  showIcon = true,
  className,
}: LeaveRequestStatusBadgeProps) {
  const config = leaveRequestStatusConfig[status as LeaveRequestStatus] || leaveRequestStatusConfig.pending;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        config.bgColor,
        sizeClasses[size],
        'font-medium inline-flex items-center gap-1',
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </Badge>
  );
}

// ============================================================================
// Leave Duration Badge
// ============================================================================

interface LeaveDurationBadgeProps {
  startDate: Date | string;
  endDate: Date | string;
  showDates?: boolean;
  className?: string;
}

export function LeaveDurationBadge({
  startDate,
  endDate,
  showDates = false,
  className,
}: LeaveDurationBadgeProps) {
  const days = calculateLeaveDays(startDate, endDate);

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <Badge variant="secondary" className="font-medium">
        {days} {days === 1 ? 'day' : 'days'}
      </Badge>
      {showDates && (
        <span className="text-muted-foreground">
          {format(new Date(startDate), 'MMM d')} - {format(new Date(endDate), 'MMM d, yyyy')}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Leave Balance Progress
// ============================================================================

interface LeaveBalanceProgressProps {
  type: LeaveType | string;
  totalDays: number;
  usedDays: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LeaveBalanceProgress({
  type,
  totalDays,
  usedDays,
  showLabel = true,
  size = 'md',
  className,
}: LeaveBalanceProgressProps) {
  const { remaining, percentage } = getLeaveBalance(totalDays, usedDays);
  const config = leaveTypeConfig[type as LeaveType] || leaveTypeConfig.casual;
  const isLow = remaining <= 2 && totalDays > 0;

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={cn('space-y-1', className)}>
      {showLabel && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{config.label}</span>
          <span className={cn('font-medium', isLow && 'text-amber-600')}>
            {remaining} / {totalDays} days
          </span>
        </div>
      )}
      <Progress
        value={percentage}
        className={cn(heightClasses[size], isLow && '[&>div]:bg-amber-500')}
      />
    </div>
  );
}

// ============================================================================
// Leave Balance Card
// ============================================================================

interface LeaveBalanceCardProps {
  balances: Array<{
    type: LeaveType | string;
    totalDays: number;
    usedDays: number;
    carryForward?: number;
  }>;
  year?: number;
  className?: string;
}

export function LeaveBalanceCard({
  balances,
  year = new Date().getFullYear(),
  className,
}: LeaveBalanceCardProps) {
  const totalAvailable = balances.reduce((sum, b) => sum + b.totalDays, 0);
  const totalUsed = balances.reduce((sum, b) => sum + b.usedDays, 0);
  const { percentage } = getLeaveBalance(totalAvailable, totalUsed);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Leave Balance {year}
          </span>
          <span className="text-lg font-bold text-foreground">
            {totalAvailable - totalUsed} days
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Overall Usage</span>
            <span>{Math.round(percentage)}%</span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {balances.map((balance) => {
            const config = leaveTypeConfig[balance.type as LeaveType];
            const Icon = config?.icon || Calendar;
            const remaining = balance.totalDays - balance.usedDays;
            return (
              <div
                key={balance.type}
                className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
              >
                <div className={cn('p-1.5 rounded', config?.bgColor || 'bg-slate-100')}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{config?.label || balance.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {remaining} / {balance.totalDays}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Leave Request Card
// ============================================================================

interface LeaveRequestCardProps {
  id: number | string;
  employeeName: string;
  employeeRole?: string;
  employeeDepartment?: string;
  leaveType: LeaveType | string;
  status: LeaveRequestStatus | string;
  startDate: Date | string;
  endDate: Date | string;
  appliedDate: Date | string;
  reason?: string;
  isEmergency?: boolean;
  onApprove?: (id: number | string) => void;
  onReject?: (id: number | string) => void;
  onView?: (id: number | string) => void;
  className?: string;
}

export function LeaveRequestCard({
  id,
  employeeName,
  employeeRole,
  employeeDepartment,
  leaveType,
  status,
  startDate,
  endDate,
  appliedDate,
  reason,
  isEmergency,
  onApprove,
  onReject,
  onView,
  className,
}: LeaveRequestCardProps) {
  const days = calculateLeaveDays(startDate, endDate);
  const config = leaveTypeConfig[leaveType as LeaveType] || leaveTypeConfig.casual;
  const Icon = config.icon;
  const isPending = status === 'pending';
  const isUpcoming = isAfter(new Date(startDate), new Date());

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Employee Info */}
          <div className="flex items-center gap-3">
            <div className={cn('p-2.5 rounded-full', config.bgColor)}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-medium">{employeeName}</h4>
              {(employeeRole || employeeDepartment) && (
                <p className="text-sm text-muted-foreground">
                  {[employeeDepartment, employeeRole].filter(Boolean).join(' • ')}
                </p>
              )}
            </div>
          </div>

          {/* Status and Actions */}
          <div className="flex items-center gap-2">
            {isEmergency && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Emergency
              </Badge>
            )}
            <LeaveRequestStatusBadge status={status} size="sm" />
          </div>
        </div>

        {/* Leave Details */}
        <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Type</p>
            <p className="font-medium capitalize">{config.label}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Duration</p>
            <p className="font-medium">{days} {days === 1 ? 'day' : 'days'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Dates</p>
            <p className="font-medium">
              {format(new Date(startDate), 'MMM d')} - {format(new Date(endDate), 'MMM d')}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Applied</p>
            <p className="font-medium">{format(new Date(appliedDate), 'MMM d, yyyy')}</p>
          </div>
        </div>

        {/* Reason */}
        {reason && (
          <div className="mt-3 p-2 bg-muted/50 rounded text-sm">
            <p className="text-muted-foreground line-clamp-2">{reason}</p>
          </div>
        )}

        {/* Actions */}
        {isPending && (onApprove || onReject) && (
          <div className="mt-4 flex justify-end gap-2">
            {onReject && (
              <button
                onClick={() => onReject(id)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </button>
            )}
            {onApprove && (
              <button
                onClick={() => onApprove(id)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                Approve
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Leave Request List
// ============================================================================

interface LeaveRequestListProps {
  requests: Array<{
    id: number | string;
    employeeName: string;
    employeeRole?: string;
    employeeDepartment?: string;
    leaveType: LeaveType | string;
    status: LeaveRequestStatus | string;
    startDate: Date | string;
    endDate: Date | string;
    appliedDate: Date | string;
    reason?: string;
    isEmergency?: boolean;
  }>;
  onApprove?: (id: number | string) => void;
  onReject?: (id: number | string) => void;
  onView?: (id: number | string) => void;
  emptyMessage?: string;
  className?: string;
}

export function LeaveRequestList({
  requests,
  onApprove,
  onReject,
  onView,
  emptyMessage = 'No leave requests found',
  className,
}: LeaveRequestListProps) {
  if (requests.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {requests.map((request) => (
        <LeaveRequestCard
          key={request.id}
          {...request}
          onApprove={onApprove}
          onReject={onReject}
          onView={onView}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Leave Calendar Day
// ============================================================================

interface LeaveCalendarDayProps {
  date: Date;
  leaves?: Array<{
    employeeName: string;
    leaveType: LeaveType | string;
  }>;
  isToday?: boolean;
  isCurrentMonth?: boolean;
  className?: string;
}

export function LeaveCalendarDay({
  date,
  leaves = [],
  isToday = false,
  isCurrentMonth = true,
  className,
}: LeaveCalendarDayProps) {
  const hasLeaves = leaves.length > 0;

  return (
    <div
      className={cn(
        'h-12 border rounded flex flex-col items-center justify-center text-sm relative',
        !isCurrentMonth && 'bg-muted/50 text-muted-foreground',
        isToday && 'bg-primary/10 text-primary font-bold ring-2 ring-primary',
        hasLeaves && isCurrentMonth && 'bg-amber-50 dark:bg-amber-900/20',
        className
      )}
    >
      <span>{date.getDate()}</span>
      {hasLeaves && (
        <div className="absolute bottom-1 flex gap-0.5">
          {leaves.slice(0, 3).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
          ))}
          {leaves.length > 3 && (
            <span className="text-[8px] text-amber-600">+{leaves.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Leave Summary Stats
// ============================================================================

interface LeaveSummaryStatsProps {
  pendingCount: number;
  onLeaveToday: number;
  approvedThisMonth: number;
  utilizationRate: number;
  className?: string;
}

export function LeaveSummaryStats({
  pendingCount,
  onLeaveToday,
  approvedThisMonth,
  utilizationRate,
  className,
}: LeaveSummaryStatsProps) {
  const stats = [
    {
      label: 'Pending Requests',
      value: pendingCount,
      icon: Clock,
      color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
    },
    {
      label: 'On Leave Today',
      value: onLeaveToday,
      icon: User,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Approved This Month',
      value: approvedThisMonth,
      icon: CheckCircle,
      color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
    },
    {
      label: 'Utilization Rate',
      value: `${utilizationRate}%`,
      icon: FileText,
      color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
    },
  ];

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', stat.color)}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
