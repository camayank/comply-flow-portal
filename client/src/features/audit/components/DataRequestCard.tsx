import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Trash2,
  Download,
  Edit3,
  Lock,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Mail,
  User,
  Calendar,
  Eye,
  Shield,
  FileText,
  ExternalLink,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Types
export type DataRequestType = 'erasure' | 'portability' | 'rectification' | 'restriction';
export type DataRequestStatus = 'pending' | 'verified' | 'processing' | 'completed' | 'rejected';

export interface DataRequestData {
  id: number;
  subjectEmail: string;
  subjectName?: string | null;
  requestType: DataRequestType;
  scope?: Record<string, unknown> | null;
  status: DataRequestStatus;
  verifiedAt?: string | null;
  processingStartedAt?: string | null;
  completedAt?: string | null;
  rejectionReason?: string | null;
  exportUrl?: string | null;
  exportExpiresAt?: string | null;
  createdAt: string;
  requestedByName?: string | null;
}

// Config
interface RequestTypeConfig {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  textColor: string;
  icon: LucideIcon;
}

const requestTypeConfig: Record<DataRequestType, RequestTypeConfig> = {
  erasure: {
    label: 'Erasure',
    description: 'Right to be forgotten',
    color: 'red',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    icon: Trash2,
  },
  portability: {
    label: 'Portability',
    description: 'Data export request',
    color: 'blue',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-400',
    icon: Download,
  },
  rectification: {
    label: 'Rectification',
    description: 'Correct inaccurate data',
    color: 'amber',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-700 dark:text-amber-400',
    icon: Edit3,
  },
  restriction: {
    label: 'Restriction',
    description: 'Limit data processing',
    color: 'purple',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    textColor: 'text-purple-700 dark:text-purple-400',
    icon: Lock,
  },
};

interface RequestStatusConfig {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  icon: LucideIcon;
  progress: number;
}

const requestStatusConfig: Record<DataRequestStatus, RequestStatusConfig> = {
  pending: {
    label: 'Pending',
    color: 'slate',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-700 dark:text-slate-400',
    icon: Clock,
    progress: 0,
  },
  verified: {
    label: 'Verified',
    color: 'blue',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-400',
    icon: CheckCircle,
    progress: 33,
  },
  processing: {
    label: 'Processing',
    color: 'amber',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-700 dark:text-amber-400',
    icon: Loader2,
    progress: 66,
  },
  completed: {
    label: 'Completed',
    color: 'emerald',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    textColor: 'text-emerald-700 dark:text-emerald-400',
    icon: CheckCircle,
    progress: 100,
  },
  rejected: {
    label: 'Rejected',
    color: 'red',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    icon: XCircle,
    progress: 100,
  },
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatDateShort(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', {
    dateStyle: 'medium',
  });
}

// Request Type Badge
interface DataRequestTypeBadgeProps {
  type: DataRequestType;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function DataRequestTypeBadge({
  type,
  showIcon = true,
  size = 'md',
  className,
}: DataRequestTypeBadgeProps) {
  const config = requestTypeConfig[type];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        config.bgColor,
        config.textColor,
        'border-transparent font-medium',
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={cn(iconSizes[size], 'mr-1')} />}
      {config.label}
    </Badge>
  );
}

// Request Status Badge
interface DataRequestStatusBadgeProps {
  status: DataRequestStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function DataRequestStatusBadge({
  status,
  showIcon = true,
  size = 'md',
  className,
}: DataRequestStatusBadgeProps) {
  const config = requestStatusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        config.bgColor,
        config.textColor,
        'border-transparent font-medium',
        size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1',
        className
      )}
    >
      {showIcon && (
        <Icon className={cn(
          size === 'sm' ? 'h-3 w-3' : 'h-4 w-4',
          'mr-1',
          status === 'processing' && 'animate-spin'
        )} />
      )}
      {config.label}
    </Badge>
  );
}

// Request Progress Indicator
interface DataRequestProgressProps {
  status: DataRequestStatus;
  className?: string;
}

export function DataRequestProgress({ status, className }: DataRequestProgressProps) {
  const config = requestStatusConfig[status];
  const stages: DataRequestStatus[] = ['pending', 'verified', 'processing', 'completed'];
  const isRejected = status === 'rejected';

  if (isRejected) {
    return (
      <div className={cn('flex items-center gap-2 text-red-600 dark:text-red-400', className)}>
        <XCircle className="h-4 w-4" />
        <span className="text-sm font-medium">Request Rejected</span>
      </div>
    );
  }

  const currentIndex = stages.indexOf(status);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex justify-between text-xs text-muted-foreground">
        {stages.map((stage, index) => (
          <span
            key={stage}
            className={cn(
              'capitalize',
              index <= currentIndex && 'font-medium text-foreground'
            )}
          >
            {requestStatusConfig[stage].label}
          </span>
        ))}
      </div>
      <Progress value={config.progress} className="h-2" />
    </div>
  );
}

// GDPR/DPDP Compliance Badge
interface ComplianceBadgeProps {
  type: 'GDPR' | 'DPDP';
  className?: string;
}

export function ComplianceBadge({ type, className }: ComplianceBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'bg-indigo-100 text-indigo-700 border-indigo-200',
        'dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800',
        className
      )}
    >
      <Shield className="h-3 w-3 mr-1" />
      {type}
    </Badge>
  );
}

// Data Request Card
interface DataRequestCardProps {
  request: DataRequestData;
  onViewDetail?: () => void;
  onProcess?: () => void;
  onVerify?: () => void;
  showProgress?: boolean;
  compact?: boolean;
  className?: string;
}

export function DataRequestCard({
  request,
  onViewDetail,
  onProcess,
  onVerify,
  showProgress = false,
  compact = false,
  className,
}: DataRequestCardProps) {
  const isCompleted = request.status === 'completed';
  const isRejected = request.status === 'rejected';
  const isPending = request.status === 'pending';
  const isVerified = request.status === 'verified';
  const hasExport = request.exportUrl && request.requestType === 'portability';

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors',
          (isCompleted || isRejected) && 'opacity-75',
          className
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <DataRequestTypeBadge type={request.requestType} size="sm" />
            <DataRequestStatusBadge status={request.status} size="sm" />
          </div>
          <p className="text-sm flex items-center gap-1 truncate">
            <Mail className="h-3 w-3 text-muted-foreground" />
            {request.subjectEmail}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDateShort(request.createdAt)}
          </p>
        </div>
        {onViewDetail && (
          <Button size="sm" variant="ghost" onClick={onViewDetail}>
            <Eye className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={cn((isCompleted || isRejected) && 'opacity-75', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <DataRequestTypeBadge type={request.requestType} />
              <DataRequestStatusBadge status={request.status} />
            </div>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              {request.subjectEmail}
            </CardTitle>
            {request.subjectName && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <User className="h-4 w-4" />
                {request.subjectName}
              </p>
            )}
          </div>
          {onViewDetail && (
            <Button size="sm" variant="outline" onClick={onViewDetail}>
              <Eye className="h-4 w-4 mr-1" />
              Details
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showProgress && <DataRequestProgress status={request.status} />}

        {/* Type description */}
        <p className="text-sm text-muted-foreground">
          {requestTypeConfig[request.requestType].description}
        </p>

        {/* Rejection reason */}
        {isRejected && request.rejectionReason && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-300">
              <strong>Rejection Reason:</strong> {request.rejectionReason}
            </p>
          </div>
        )}

        {/* Timeline */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Requested: {formatDateShort(request.createdAt)}</span>
          </div>
          {request.verifiedAt && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <CheckCircle className="h-4 w-4" />
              <span>Verified: {formatDateShort(request.verifiedAt)}</span>
            </div>
          )}
          {request.processingStartedAt && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Loader2 className="h-4 w-4" />
              <span>Started: {formatDateShort(request.processingStartedAt)}</span>
            </div>
          )}
          {request.completedAt && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <CheckCircle className="h-4 w-4" />
              <span>Completed: {formatDateShort(request.completedAt)}</span>
            </div>
          )}
        </div>

        {/* Export link for portability requests */}
        {hasExport && request.exportUrl && (
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  Data Export Available
                </p>
                {request.exportExpiresAt && (
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Expires: {formatDate(request.exportExpiresAt)}
                  </p>
                )}
              </div>
              <Button size="sm" variant="outline" asChild>
                <a href={request.exportUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </a>
              </Button>
            </div>
          </div>
        )}

        {/* Actions */}
        {(isPending || isVerified) && (onVerify || onProcess) && (
          <div className="flex gap-2 pt-2 border-t">
            {isPending && onVerify && (
              <Button size="sm" onClick={onVerify}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Verify Request
              </Button>
            )}
            {isVerified && onProcess && (
              <Button size="sm" onClick={onProcess}>
                <Loader2 className="h-4 w-4 mr-1" />
                Start Processing
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Data Request List
interface DataRequestListProps {
  requests: DataRequestData[];
  onViewDetail?: (request: DataRequestData) => void;
  compact?: boolean;
  className?: string;
}

export function DataRequestList({
  requests,
  onViewDetail,
  compact = true,
  className,
}: DataRequestListProps) {
  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No data requests found</p>
      </div>
    );
  }

  // Sort by status priority and date
  const statusOrder: Record<DataRequestStatus, number> = {
    pending: 0,
    verified: 1,
    processing: 2,
    completed: 3,
    rejected: 4,
  };

  const sortedRequests = [...requests].sort((a, b) => {
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className={cn('space-y-2', className)}>
      {sortedRequests.map((request) => (
        <DataRequestCard
          key={request.id}
          request={request}
          onViewDetail={onViewDetail ? () => onViewDetail(request) : undefined}
          compact={compact}
        />
      ))}
    </div>
  );
}

// Export config
export { requestTypeConfig, requestStatusConfig };
