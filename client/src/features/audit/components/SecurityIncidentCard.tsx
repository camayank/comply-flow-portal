import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Clock,
  User,
  Users,
  Server,
  Database,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Calendar,
  FileText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Types
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';

export interface SecurityIncidentData {
  id: number;
  incidentId: string;
  incidentType: string;
  severity: IncidentSeverity;
  title: string;
  description: string;
  affectedUsers?: string[] | null;
  affectedData?: string[] | null;
  affectedSystems?: string[] | null;
  detectionMethod?: string | null;
  containmentActions?: string | null;
  eradicationActions?: string | null;
  recoveryActions?: string | null;
  lessonsLearned?: string | null;
  status: IncidentStatus;
  assignedTo?: number | null;
  assignedToName?: string | null;
  detectedAt: string;
  containedAt?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
}

// Config
interface SeverityConfig {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: LucideIcon;
  priority: number;
}

const severityConfig: Record<IncidentSeverity, SeverityConfig> = {
  low: {
    label: 'Low',
    color: 'blue',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-400',
    borderColor: 'border-blue-300 dark:border-blue-700',
    icon: Shield,
    priority: 0,
  },
  medium: {
    label: 'Medium',
    color: 'amber',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-700 dark:text-amber-400',
    borderColor: 'border-amber-300 dark:border-amber-700',
    icon: AlertCircle,
    priority: 1,
  },
  high: {
    label: 'High',
    color: 'orange',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-700 dark:text-orange-400',
    borderColor: 'border-orange-300 dark:border-orange-700',
    icon: AlertTriangle,
    priority: 2,
  },
  critical: {
    label: 'Critical',
    color: 'red',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    borderColor: 'border-red-300 dark:border-red-700',
    icon: ShieldAlert,
    priority: 3,
  },
};

interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  icon: LucideIcon;
  progress: number;
}

const statusConfig: Record<IncidentStatus, StatusConfig> = {
  open: {
    label: 'Open',
    color: 'red',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    icon: ShieldX,
    progress: 0,
  },
  investigating: {
    label: 'Investigating',
    color: 'amber',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-700 dark:text-amber-400',
    icon: Loader2,
    progress: 25,
  },
  contained: {
    label: 'Contained',
    color: 'blue',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-400',
    icon: Shield,
    progress: 50,
  },
  resolved: {
    label: 'Resolved',
    color: 'emerald',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    textColor: 'text-emerald-700 dark:text-emerald-400',
    icon: ShieldCheck,
    progress: 75,
  },
  closed: {
    label: 'Closed',
    color: 'slate',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-700 dark:text-slate-400',
    icon: CheckCircle,
    progress: 100,
  },
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// Severity Badge Component
interface SeverityBadgeProps {
  severity: IncidentSeverity;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SeverityBadge({
  severity,
  showIcon = true,
  size = 'md',
  className,
}: SeverityBadgeProps) {
  const config = severityConfig[severity];
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
        config.borderColor,
        'font-medium',
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={cn(iconSizes[size], 'mr-1')} />}
      {config.label}
    </Badge>
  );
}

// Incident Status Badge
interface IncidentStatusBadgeProps {
  status: IncidentStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function IncidentStatusBadge({
  status,
  showIcon = true,
  size = 'md',
  className,
}: IncidentStatusBadgeProps) {
  const config = statusConfig[status];
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
          status === 'investigating' && 'animate-spin'
        )} />
      )}
      {config.label}
    </Badge>
  );
}

// Incident Progress Indicator
interface IncidentProgressProps {
  status: IncidentStatus;
  className?: string;
}

export function IncidentProgress({ status, className }: IncidentProgressProps) {
  const config = statusConfig[status];
  const stages: IncidentStatus[] = ['open', 'investigating', 'contained', 'resolved', 'closed'];
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
            {statusConfig[stage].label}
          </span>
        ))}
      </div>
      <Progress value={config.progress} className="h-2" />
    </div>
  );
}

// Affected Items Display
interface AffectedItemsProps {
  users?: string[] | null;
  data?: string[] | null;
  systems?: string[] | null;
  className?: string;
}

export function AffectedItems({ users, data, systems, className }: AffectedItemsProps) {
  const hasAffected = (users?.length || 0) + (data?.length || 0) + (systems?.length || 0) > 0;

  if (!hasAffected) return null;

  return (
    <div className={cn('space-y-2', className)}>
      {users && users.length > 0 && (
        <div className="flex items-start gap-2">
          <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div>
            <span className="text-xs font-medium text-muted-foreground">Affected Users:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {users.slice(0, 5).map((user, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {user}
                </Badge>
              ))}
              {users.length > 5 && (
                <Badge variant="secondary" className="text-xs">
                  +{users.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}
      {data && data.length > 0 && (
        <div className="flex items-start gap-2">
          <Database className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div>
            <span className="text-xs font-medium text-muted-foreground">Affected Data:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {data.slice(0, 5).map((item, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {item}
                </Badge>
              ))}
              {data.length > 5 && (
                <Badge variant="secondary" className="text-xs">
                  +{data.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}
      {systems && systems.length > 0 && (
        <div className="flex items-start gap-2">
          <Server className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div>
            <span className="text-xs font-medium text-muted-foreground">Affected Systems:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {systems.slice(0, 5).map((system, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {system}
                </Badge>
              ))}
              {systems.length > 5 && (
                <Badge variant="secondary" className="text-xs">
                  +{systems.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Security Incident Card
interface SecurityIncidentCardProps {
  incident: SecurityIncidentData;
  onViewDetail?: () => void;
  onUpdateStatus?: (status: IncidentStatus) => void;
  showProgress?: boolean;
  showAffected?: boolean;
  compact?: boolean;
  className?: string;
}

export function SecurityIncidentCard({
  incident,
  onViewDetail,
  onUpdateStatus,
  showProgress = false,
  showAffected = true,
  compact = false,
  className,
}: SecurityIncidentCardProps) {
  const isClosed = incident.status === 'closed' || incident.status === 'resolved';

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
            <SeverityBadge severity={incident.severity} size="sm" />
            <IncidentStatusBadge status={incident.status} size="sm" />
          </div>
          <p className="font-medium text-sm truncate">{incident.title}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Detected: {formatDate(incident.detectedAt)}
          </p>
        </div>
        <Badge variant="outline" className="shrink-0 font-mono text-xs">
          {incident.incidentId}
        </Badge>
        {onViewDetail && (
          <Button size="sm" variant="ghost" onClick={onViewDetail}>
            <Eye className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={cn(isClosed && 'opacity-75', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <SeverityBadge severity={incident.severity} />
              <IncidentStatusBadge status={incident.status} />
              <Badge variant="outline" className="font-mono text-xs">
                {incident.incidentId}
              </Badge>
            </div>
            <CardTitle className="text-lg">{incident.title}</CardTitle>
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
        <p className="text-sm text-muted-foreground">{incident.description}</p>

        {showProgress && <IncidentProgress status={incident.status} />}

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Detected: {formatDate(incident.detectedAt)}</span>
          </div>
          {incident.assignedToName && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Assigned: {incident.assignedToName}</span>
            </div>
          )}
          {incident.containedAt && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Contained: {formatDate(incident.containedAt)}</span>
            </div>
          )}
          {incident.resolvedAt && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <CheckCircle className="h-4 w-4" />
              <span>Resolved: {formatDate(incident.resolvedAt)}</span>
            </div>
          )}
        </div>

        {showAffected && (
          <AffectedItems
            users={incident.affectedUsers}
            data={incident.affectedData}
            systems={incident.affectedSystems}
          />
        )}

        {incident.incidentType && (
          <div className="pt-2 border-t">
            <Badge variant="outline">
              <FileText className="h-3 w-3 mr-1" />
              {incident.incidentType}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Incident List
interface SecurityIncidentListProps {
  incidents: SecurityIncidentData[];
  onViewDetail?: (incident: SecurityIncidentData) => void;
  compact?: boolean;
  className?: string;
}

export function SecurityIncidentList({
  incidents,
  onViewDetail,
  compact = true,
  className,
}: SecurityIncidentListProps) {
  if (incidents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ShieldCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No security incidents found</p>
      </div>
    );
  }

  // Sort by severity and then by date
  const sortedIncidents = [...incidents].sort((a, b) => {
    const severityDiff = severityConfig[b.severity].priority - severityConfig[a.severity].priority;
    if (severityDiff !== 0) return severityDiff;
    return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
  });

  return (
    <div className={cn('space-y-2', className)}>
      {sortedIncidents.map((incident) => (
        <SecurityIncidentCard
          key={incident.id}
          incident={incident}
          onViewDetail={onViewDetail ? () => onViewDetail(incident) : undefined}
          compact={compact}
        />
      ))}
    </div>
  );
}

// Export config
export { severityConfig, statusConfig };
