import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  type ProposalStatus,
  type PaymentStatus,
  type QualifiedLeadStatus,
  proposalStatusConfig,
  paymentStatusConfig,
  qualifiedLeadStatusConfig,
  formatCurrency,
} from '../config';
import {
  Calendar,
  Clock,
  AlertTriangle,
  DollarSign,
  FileText,
  CheckCircle,
  XCircle,
  Send,
  Eye,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

// ============================================================================
// Proposal Status Badge
// ============================================================================

interface ProposalStatusBadgeProps {
  status: ProposalStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function ProposalStatusBadge({
  status,
  size = 'md',
  showIcon = true,
  className,
}: ProposalStatusBadgeProps) {
  const config = proposalStatusConfig[status as ProposalStatus] || proposalStatusConfig.draft;
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
// Payment Status Badge
// ============================================================================

interface PaymentStatusBadgeProps {
  status: PaymentStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function PaymentStatusBadge({
  status,
  size = 'md',
  showIcon = true,
  className,
}: PaymentStatusBadgeProps) {
  const config = paymentStatusConfig[status as PaymentStatus] || paymentStatusConfig.pending;
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
// Qualified Lead Status Badge
// ============================================================================

interface QualifiedLeadStatusBadgeProps {
  status: QualifiedLeadStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function QualifiedLeadStatusBadge({
  status,
  size = 'md',
  showIcon = true,
  className,
}: QualifiedLeadStatusBadgeProps) {
  const config = qualifiedLeadStatusConfig[status as QualifiedLeadStatus] || qualifiedLeadStatusConfig.qualified;
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
// Payment Progress Indicator
// ============================================================================

interface PaymentProgressProps {
  totalAmount: number | string;
  paidAmount: number | string;
  pendingAmount?: number | string;
  currency?: string;
  showLabels?: boolean;
  className?: string;
}

export function PaymentProgress({
  totalAmount,
  paidAmount,
  pendingAmount,
  currency = 'INR',
  showLabels = true,
  className,
}: PaymentProgressProps) {
  const total = typeof totalAmount === 'string' ? parseFloat(totalAmount) : totalAmount;
  const paid = typeof paidAmount === 'string' ? parseFloat(paidAmount) : paidAmount;
  const pending = pendingAmount
    ? typeof pendingAmount === 'string'
      ? parseFloat(pendingAmount)
      : pendingAmount
    : total - paid;

  const percentage = total > 0 ? (paid / total) * 100 : 0;

  return (
    <div className={cn('space-y-2', className)}>
      {showLabels && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Payment Progress</span>
          <span className="font-medium">{Math.round(percentage)}%</span>
        </div>
      )}
      <Progress value={percentage} className="h-2" />
      {showLabels && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="text-emerald-600">
            Paid: {formatCurrency(paid, currency)}
          </span>
          {pending > 0 && (
            <span className="text-amber-600">
              Pending: {formatCurrency(pending, currency)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Proposal Value Card
// ============================================================================

interface ProposalValueCardProps {
  amount: number | string | null;
  paidAmount?: number | string;
  pendingAmount?: number | string;
  currency?: string;
  showProgress?: boolean;
  className?: string;
}

export function ProposalValueCard({
  amount,
  paidAmount,
  pendingAmount,
  currency = 'INR',
  showProgress = true,
  className,
}: ProposalValueCardProps) {
  const total = amount ? (typeof amount === 'string' ? parseFloat(amount) : amount) : 0;
  const paid = paidAmount ? (typeof paidAmount === 'string' ? parseFloat(paidAmount) : paidAmount) : 0;
  const pending = pendingAmount
    ? typeof pendingAmount === 'string'
      ? parseFloat(pendingAmount)
      : pendingAmount
    : total - paid;

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Proposal Value
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-2xl font-bold">{formatCurrency(total, currency)}</div>
        {showProgress && total > 0 && (
          <PaymentProgress
            totalAmount={total}
            paidAmount={paid}
            pendingAmount={pending}
            currency={currency}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Proposal Validity Indicator
// ============================================================================

interface ProposalValidityProps {
  validUntil: Date | string | null;
  className?: string;
}

export function ProposalValidity({ validUntil, className }: ProposalValidityProps) {
  if (!validUntil) return null;

  const date = new Date(validUntil);
  const today = new Date();
  const daysRemaining = differenceInDays(date, today);
  const isExpired = daysRemaining < 0;
  const isExpiringSoon = daysRemaining <= 7 && daysRemaining >= 0;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-sm',
        isExpired
          ? 'text-red-600'
          : isExpiringSoon
          ? 'text-amber-600'
          : 'text-muted-foreground',
        className
      )}
    >
      {isExpired ? (
        <XCircle className="h-3.5 w-3.5" />
      ) : isExpiringSoon ? (
        <AlertTriangle className="h-3.5 w-3.5" />
      ) : (
        <Calendar className="h-3.5 w-3.5" />
      )}
      <span>
        {isExpired
          ? `Expired on ${format(date, 'MMM d')}`
          : daysRemaining === 0
          ? 'Expires today'
          : daysRemaining === 1
          ? 'Expires tomorrow'
          : `Valid until ${format(date, 'MMM d, yyyy')}`}
      </span>
    </div>
  );
}

// ============================================================================
// Services Summary
// ============================================================================

interface ServicesSummaryProps {
  services: Array<{ name: string; price?: number | string }> | null;
  maxDisplay?: number;
  className?: string;
}

export function ServicesSummary({
  services,
  maxDisplay = 2,
  className,
}: ServicesSummaryProps) {
  if (!services || services.length === 0) {
    return (
      <span className={cn('text-muted-foreground text-sm', className)}>
        No services selected
      </span>
    );
  }

  const displayServices = services.slice(0, maxDisplay);
  const remainingCount = services.length - maxDisplay;

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {displayServices.map((service, index) => (
        <Badge key={index} variant="secondary" className="text-xs">
          {service.name}
        </Badge>
      ))}
      {remainingCount > 0 && (
        <Badge variant="outline" className="text-xs">
          +{remainingCount} more
        </Badge>
      )}
    </div>
  );
}

// ============================================================================
// Proposal Timeline Badge
// ============================================================================

interface ProposalTimelineBadgeProps {
  status: ProposalStatus | string;
  sentDate?: Date | string | null;
  viewedDate?: Date | string | null;
  acceptedDate?: Date | string | null;
  className?: string;
}

export function ProposalTimelineBadge({
  status,
  sentDate,
  viewedDate,
  acceptedDate,
  className,
}: ProposalTimelineBadgeProps) {
  const stages = [
    { key: 'sent', label: 'Sent', date: sentDate, icon: Send },
    { key: 'viewed', label: 'Viewed', date: viewedDate, icon: Eye },
    { key: 'accepted', label: 'Accepted', date: acceptedDate, icon: CheckCircle },
  ];

  const completedStages = stages.filter((s) => s.date !== null && s.date !== undefined);

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {stages.map((stage, index) => {
        const isCompleted = stage.date !== null && stage.date !== undefined;
        const Icon = stage.icon;
        return (
          <div key={stage.key} className="flex items-center">
            <div
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-xs',
                isCompleted
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <Icon className="h-3 w-3" />
              <span className="hidden sm:inline">{stage.label}</span>
            </div>
            {index < stages.length - 1 && (
              <div
                className={cn(
                  'w-4 h-0.5 mx-0.5',
                  isCompleted ? 'bg-emerald-500' : 'bg-muted'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Proposal Actions Indicator
// ============================================================================

interface ProposalActionsProps {
  canSend: boolean;
  canEdit: boolean;
  canRevise: boolean;
  className?: string;
}

export function ProposalActions({
  canSend,
  canEdit,
  canRevise,
  className,
}: ProposalActionsProps) {
  return (
    <div className={cn('flex items-center gap-2 text-xs', className)}>
      {canSend && (
        <Badge variant="outline" className="text-blue-600 border-blue-200">
          Ready to Send
        </Badge>
      )}
      {canRevise && (
        <Badge variant="outline" className="text-amber-600 border-amber-200">
          Revision Possible
        </Badge>
      )}
      {!canEdit && (
        <Badge variant="outline" className="text-slate-600 border-slate-200">
          Locked
        </Badge>
      )}
    </div>
  );
}

// ============================================================================
// Proposal Conversion Indicator
// ============================================================================

interface ProposalConversionProps {
  probability: number;
  className?: string;
}

export function ProposalConversion({ probability, className }: ProposalConversionProps) {
  const isHigh = probability >= 75;
  const isMedium = probability >= 50;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isHigh ? 'bg-emerald-500' : isMedium ? 'bg-amber-500' : 'bg-red-500'
          )}
          style={{ width: `${probability}%` }}
        />
      </div>
      <span
        className={cn(
          'text-sm font-medium',
          isHigh ? 'text-emerald-600' : isMedium ? 'text-amber-600' : 'text-red-600'
        )}
      >
        {probability}%
      </span>
    </div>
  );
}
