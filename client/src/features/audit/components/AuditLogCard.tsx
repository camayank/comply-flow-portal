import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Clock,
  User,
  Hash,
  Eye,
  FileText,
  Edit,
  Trash2,
  LogIn,
  LogOut,
  Download,
  Upload,
  Settings,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  Link,
  Copy,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Types
export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'view'
  | 'download'
  | 'upload'
  | 'export'
  | 'import'
  | 'approve'
  | 'reject'
  | 'assign'
  | 'unassign';

export type EntityType =
  | 'user'
  | 'client'
  | 'document'
  | 'service_request'
  | 'payment'
  | 'compliance'
  | 'entity'
  | 'system';

export interface AuditLogData {
  id: number;
  logHash: string;
  previousHash?: string | null;
  userId?: number | null;
  userName?: string | null;
  userEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  sessionId?: string | null;
  requestId?: string | null;
  timestamp: string;
}

// Config
interface ActionConfig {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  icon: LucideIcon;
}

const actionConfig: Record<string, ActionConfig> = {
  create: {
    label: 'Create',
    color: 'emerald',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    textColor: 'text-emerald-700 dark:text-emerald-400',
    icon: FileText,
  },
  update: {
    label: 'Update',
    color: 'blue',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-400',
    icon: Edit,
  },
  delete: {
    label: 'Delete',
    color: 'red',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    icon: Trash2,
  },
  login: {
    label: 'Login',
    color: 'purple',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    textColor: 'text-purple-700 dark:text-purple-400',
    icon: LogIn,
  },
  logout: {
    label: 'Logout',
    color: 'slate',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-700 dark:text-slate-400',
    icon: LogOut,
  },
  view: {
    label: 'View',
    color: 'amber',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-700 dark:text-amber-400',
    icon: Eye,
  },
  download: {
    label: 'Download',
    color: 'teal',
    bgColor: 'bg-teal-100 dark:bg-teal-900/30',
    textColor: 'text-teal-700 dark:text-teal-400',
    icon: Download,
  },
  upload: {
    label: 'Upload',
    color: 'indigo',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    textColor: 'text-indigo-700 dark:text-indigo-400',
    icon: Upload,
  },
  export: {
    label: 'Export',
    color: 'cyan',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    textColor: 'text-cyan-700 dark:text-cyan-400',
    icon: Download,
  },
  import: {
    label: 'Import',
    color: 'orange',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-700 dark:text-orange-400',
    icon: Upload,
  },
  approve: {
    label: 'Approve',
    color: 'emerald',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    textColor: 'text-emerald-700 dark:text-emerald-400',
    icon: CheckCircle,
  },
  reject: {
    label: 'Reject',
    color: 'red',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    icon: XCircle,
  },
  assign: {
    label: 'Assign',
    color: 'blue',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-400',
    icon: Link,
  },
  unassign: {
    label: 'Unassign',
    color: 'slate',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-700 dark:text-slate-400',
    icon: Link,
  },
};

const entityTypeConfig: Record<string, { label: string; icon: LucideIcon }> = {
  user: { label: 'User', icon: User },
  client: { label: 'Client', icon: User },
  document: { label: 'Document', icon: FileText },
  service_request: { label: 'Service Request', icon: FileText },
  payment: { label: 'Payment', icon: FileText },
  compliance: { label: 'Compliance', icon: Shield },
  entity: { label: 'Entity', icon: FileText },
  system: { label: 'System', icon: Settings },
};

function getActionConfig(action: string): ActionConfig {
  return actionConfig[action.toLowerCase()] || {
    label: action,
    color: 'slate',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-700 dark:text-slate-400',
    icon: AlertCircle,
  };
}

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// Action Badge Component
interface AuditActionBadgeProps {
  action: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AuditActionBadge({
  action,
  showIcon = true,
  size = 'md',
  className,
}: AuditActionBadgeProps) {
  const config = getActionConfig(action);
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

// Entity Type Badge
interface EntityTypeBadgeProps {
  entityType: string;
  entityId?: string | null;
  className?: string;
}

export function EntityTypeBadge({ entityType, entityId, className }: EntityTypeBadgeProps) {
  const config = entityTypeConfig[entityType.toLowerCase()] || {
    label: entityType,
    icon: FileText,
  };
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn('gap-1', className)}>
      <Icon className="h-3 w-3" />
      {config.label}
      {entityId && <span className="font-mono text-xs opacity-70">#{entityId}</span>}
    </Badge>
  );
}

// Hash Display Component
interface HashDisplayProps {
  hash: string;
  truncate?: boolean;
  showCopy?: boolean;
  className?: string;
}

export function HashDisplay({ hash, truncate = true, showCopy = false, className }: HashDisplayProps) {
  const displayHash = truncate ? `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}` : hash;

  const handleCopy = () => {
    navigator.clipboard.writeText(hash);
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Hash className="h-3 w-3 text-muted-foreground" />
      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{displayHash}</code>
      {showCopy && (
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCopy}>
          <Copy className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

// Chain Verification Indicator
interface ChainVerificationIndicatorProps {
  isValid: boolean;
  verifiedCount?: number;
  brokenAt?: number | null;
  className?: string;
}

export function ChainVerificationIndicator({
  isValid,
  verifiedCount,
  brokenAt,
  className,
}: ChainVerificationIndicatorProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 p-3 rounded-lg border',
        isValid
          ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800'
          : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
        className
      )}
    >
      {isValid ? (
        <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
      )}
      <div>
        <p className={cn(
          'font-medium text-sm',
          isValid ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'
        )}>
          {isValid ? 'Chain Integrity Verified' : 'Chain Integrity Compromised'}
        </p>
        <p className={cn(
          'text-xs',
          isValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
        )}>
          {isValid
            ? `${verifiedCount || 0} entries validated`
            : `Tampering detected at entry #${brokenAt}`}
        </p>
      </div>
    </div>
  );
}

// Audit Log Card Component
interface AuditLogCardProps {
  log: AuditLogData;
  onViewDetail?: () => void;
  showHash?: boolean;
  compact?: boolean;
  className?: string;
}

export function AuditLogCard({
  log,
  onViewDetail,
  showHash = true,
  compact = false,
  className,
}: AuditLogCardProps) {
  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors',
          className
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <AuditActionBadge action={log.action} size="sm" />
            <EntityTypeBadge entityType={log.entityType} entityId={log.entityId} />
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTimestamp(log.timestamp)}
            </span>
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {log.userName || 'System'}
            </span>
          </div>
        </div>
        {showHash && <HashDisplay hash={log.logHash} truncate className="shrink-0" />}
        {onViewDetail && (
          <Button size="sm" variant="ghost" onClick={onViewDetail}>
            <Eye className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <AuditActionBadge action={log.action} />
              <EntityTypeBadge entityType={log.entityType} entityId={log.entityId} />
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatTimestamp(log.timestamp)}
            </p>
          </div>
          {onViewDetail && (
            <Button size="sm" variant="outline" onClick={onViewDetail}>
              <Eye className="h-4 w-4 mr-1" />
              Details
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1 text-muted-foreground">
            <User className="h-4 w-4" />
            {log.userName || 'System'}
          </span>
          {log.ipAddress && (
            <span className="font-mono text-xs text-muted-foreground">
              IP: {log.ipAddress}
            </span>
          )}
        </div>

        {showHash && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Log Hash:</span>
              <HashDisplay hash={log.logHash} showCopy />
            </div>
            {log.previousHash && (
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">Previous Hash:</span>
                <HashDisplay hash={log.previousHash} />
              </div>
            )}
          </div>
        )}

        {(log.oldValues || log.newValues) && (
          <div className="pt-2 border-t space-y-2">
            {log.oldValues && Object.keys(log.oldValues).length > 0 && (
              <div>
                <span className="text-xs font-medium text-red-600 dark:text-red-400">
                  Previous Values:
                </span>
                <pre className="mt-1 text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded overflow-x-auto">
                  {JSON.stringify(log.oldValues, null, 2)}
                </pre>
              </div>
            )}
            {log.newValues && Object.keys(log.newValues).length > 0 && (
              <div>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  New Values:
                </span>
                <pre className="mt-1 text-xs bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded overflow-x-auto">
                  {JSON.stringify(log.newValues, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Audit Log List
interface AuditLogListProps {
  logs: AuditLogData[];
  onViewDetail?: (log: AuditLogData) => void;
  compact?: boolean;
  className?: string;
}

export function AuditLogList({ logs, onViewDetail, compact = true, className }: AuditLogListProps) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No audit logs found</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {logs.map((log) => (
        <AuditLogCard
          key={log.id}
          log={log}
          onViewDetail={onViewDetail ? () => onViewDetail(log) : undefined}
          compact={compact}
        />
      ))}
    </div>
  );
}

// Export config
export { actionConfig, entityTypeConfig, getActionConfig };
