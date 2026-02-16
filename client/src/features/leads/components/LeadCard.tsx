import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  IndianRupee,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  MessageSquare,
  TrendingUp,
  User,
  Building,
  Target,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  formatCurrency,
  formatPhoneNumber,
  getLeadAgeInDays,
  entityTypeConfig,
  type EntityType,
} from '../config';
import {
  LeadStageBadge,
  LeadPriorityBadge,
  LeadSourceBadge,
  FollowUpUrgencyBadge,
  LeadStagePipeline,
  ConversionProbability,
} from './LeadStatusBadge';
import { leadStageConfig, type LeadStage } from '@/features/sales/config';

// ============================================================================
// Lead Info Display
// ============================================================================

interface LeadInfoDisplayProps {
  label: string;
  value: string | React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function LeadInfoDisplay({ label, value, icon, className }: LeadInfoDisplayProps) {
  return (
    <div className={cn('flex items-start gap-2', className)}>
      {icon && <span className="text-muted-foreground mt-0.5">{icon}</span>}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

// ============================================================================
// Lead Contact Card
// ============================================================================

interface LeadContactInfo {
  clientName: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  state?: string | null;
  entityType?: string | null;
}

interface LeadContactCardProps {
  lead: LeadContactInfo;
  showEntityType?: boolean;
  className?: string;
}

export function LeadContactCard({
  lead,
  showEntityType = true,
  className,
}: LeadContactCardProps) {
  const initials = lead.clientName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const entityConfig = lead.entityType
    ? entityTypeConfig[lead.entityType as EntityType]
    : null;

  return (
    <div className={cn('flex items-start gap-3', className)}>
      <Avatar className="h-10 w-10">
        <AvatarFallback className="bg-primary/10 text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold truncate">{lead.clientName}</h4>
          {showEntityType && entityConfig && (
            <Badge variant="outline" className="text-xs">
              {entityConfig.shortLabel}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
          {lead.contactPhone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {formatPhoneNumber(lead.contactPhone)}
            </span>
          )}
          {lead.contactEmail && (
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {lead.contactEmail}
            </span>
          )}
          {lead.state && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {lead.state}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Lead Summary Card
// ============================================================================

interface LeadSummary {
  id: number;
  leadId: string;
  clientName: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  state?: string | null;
  entityType?: string | null;
  serviceInterested?: string | null;
  leadSource?: string | null;
  leadStage?: string | null;
  priority?: string | null;
  estimatedValue?: string | number | null;
  nextFollowupDate?: Date | string | null;
  createdAt?: Date | string;
}

interface LeadSummaryCardProps {
  lead: LeadSummary;
  onEdit?: (lead: LeadSummary) => void;
  onDelete?: (id: number) => void;
  onView?: (lead: LeadSummary) => void;
  showActions?: boolean;
  className?: string;
}

export function LeadSummaryCard({
  lead,
  onEdit,
  onDelete,
  onView,
  showActions = true,
  className,
}: LeadSummaryCardProps) {
  const age = lead.createdAt ? getLeadAgeInDays(lead.createdAt) : 0;

  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <LeadContactCard lead={lead} showEntityType />
          {showActions && (
            <div className="flex items-center gap-1">
              {onView && (
                <Button variant="ghost" size="icon" onClick={() => onView(lead)}>
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              {onEdit && (
                <Button variant="ghost" size="icon" onClick={() => onEdit(lead)}>
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(lead.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Stage & Priority */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {lead.leadStage && <LeadStageBadge stage={lead.leadStage} size="sm" />}
          {lead.priority && <LeadPriorityBadge priority={lead.priority} size="sm" />}
          {lead.leadSource && <LeadSourceBadge source={lead.leadSource} size="sm" />}
        </div>

        {/* Service & Value */}
        <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
          {lead.serviceInterested && (
            <div>
              <p className="text-muted-foreground text-xs">Service</p>
              <p className="font-medium truncate">{lead.serviceInterested}</p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground text-xs">Est. Value</p>
            <p className="font-medium">{formatCurrency(lead.estimatedValue)}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{age}d old</span>
          </div>
          {lead.nextFollowupDate && (
            <FollowUpUrgencyBadge followUpDate={lead.nextFollowupDate} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Lead Detail Card
// ============================================================================

interface LeadDetail extends LeadSummary {
  preSalesExecutive?: string | null;
  remarks?: string | null;
  conversionProbability?: number;
}

interface LeadDetailCardProps {
  lead: LeadDetail;
  onEdit?: (lead: LeadDetail) => void;
  onDelete?: (id: number) => void;
  className?: string;
}

export function LeadDetailCard({
  lead,
  onEdit,
  onDelete,
  className,
}: LeadDetailCardProps) {
  const age = lead.createdAt ? getLeadAgeInDays(lead.createdAt) : 0;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-muted-foreground font-mono">{lead.leadId}</span>
              <span className="text-xs text-muted-foreground">|</span>
              <span className="text-xs text-muted-foreground">{age} days old</span>
            </div>
            <LeadContactCard lead={lead} showEntityType />
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={() => onEdit(lead)}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(lead.id)}
                className="text-destructive border-destructive/50 hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stage Pipeline */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Pipeline Progress</p>
          <LeadStagePipeline currentStage={lead.leadStage || 'new'} />
          <div className="flex items-center justify-between mt-2">
            <LeadStageBadge stage={lead.leadStage || 'new'} showIcon />
            <LeadPriorityBadge priority={lead.priority || 'medium'} showIcon />
          </div>
        </div>

        {/* Conversion Probability */}
        {lead.conversionProbability !== undefined && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Conversion Probability</p>
            <ConversionProbability probability={lead.conversionProbability} />
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <LeadInfoDisplay
            label="Service Interested"
            value={lead.serviceInterested || '—'}
            icon={<Target className="h-4 w-4" />}
          />
          <LeadInfoDisplay
            label="Lead Source"
            value={lead.leadSource || '—'}
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <LeadInfoDisplay
            label="Estimated Value"
            value={formatCurrency(lead.estimatedValue)}
            icon={<IndianRupee className="h-4 w-4" />}
          />
          <LeadInfoDisplay
            label="Pre-Sales Executive"
            value={lead.preSalesExecutive || '—'}
            icon={<User className="h-4 w-4" />}
          />
          <LeadInfoDisplay
            label="Next Follow-up"
            value={
              lead.nextFollowupDate ? (
                <div className="flex items-center gap-2">
                  {format(new Date(lead.nextFollowupDate), 'MMM dd, yyyy')}
                  <FollowUpUrgencyBadge followUpDate={lead.nextFollowupDate} showDays={false} />
                </div>
              ) : (
                '—'
              )
            }
            icon={<Calendar className="h-4 w-4" />}
          />
          {lead.entityType && (
            <LeadInfoDisplay
              label="Entity Type"
              value={entityTypeConfig[lead.entityType as EntityType]?.label || lead.entityType}
              icon={<Building className="h-4 w-4" />}
            />
          )}
        </div>

        {/* Remarks */}
        {lead.remarks && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Remarks</p>
            <p className="text-sm bg-muted/50 rounded-md p-3">{lead.remarks}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Lead Stats Card
// ============================================================================

interface LeadStatsCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
  className?: string;
}

export function LeadStatsCard({
  label,
  value,
  icon,
  trend,
  description,
  className,
}: LeadStatsCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {trend && (
              <p
                className={cn(
                  'text-xs mt-1',
                  trend.isPositive ? 'text-emerald-600' : 'text-red-600'
                )}
              >
                {trend.isPositive ? '+' : ''}{trend.value}% from last period
              </p>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Lead Stage Summary
// ============================================================================

interface StageSummary {
  stage: LeadStage;
  count: number;
  value: number;
}

interface LeadStageSummaryProps {
  stages: StageSummary[];
  totalLeads: number;
  className?: string;
}

export function LeadStageSummary({
  stages,
  totalLeads,
  className,
}: LeadStageSummaryProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <h3 className="font-semibold">Pipeline Summary</h3>
      </CardHeader>
      <CardContent className="space-y-3">
        {stages.map(({ stage, count, value }) => {
          const config = leadStageConfig[stage];
          const percentage = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;

          return (
            <div key={stage} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <config.icon className="h-4 w-4 text-muted-foreground" />
                  {config.label}
                </span>
                <span className="font-medium">
                  {count} <span className="text-muted-foreground">({formatCurrency(value)})</span>
                </span>
              </div>
              <Progress value={percentage} className="h-1.5" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Lead Quick Actions
// ============================================================================

interface LeadQuickActionsProps {
  onCall?: () => void;
  onEmail?: () => void;
  onWhatsApp?: () => void;
  onSchedule?: () => void;
  disabled?: boolean;
  className?: string;
}

export function LeadQuickActions({
  onCall,
  onEmail,
  onWhatsApp,
  onSchedule,
  disabled = false,
  className,
}: LeadQuickActionsProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {onCall && (
        <Button
          variant="outline"
          size="sm"
          onClick={onCall}
          disabled={disabled}
        >
          <Phone className="h-4 w-4 mr-1" />
          Call
        </Button>
      )}
      {onEmail && (
        <Button
          variant="outline"
          size="sm"
          onClick={onEmail}
          disabled={disabled}
        >
          <Mail className="h-4 w-4 mr-1" />
          Email
        </Button>
      )}
      {onWhatsApp && (
        <Button
          variant="outline"
          size="sm"
          onClick={onWhatsApp}
          disabled={disabled}
        >
          <MessageSquare className="h-4 w-4 mr-1" />
          WhatsApp
        </Button>
      )}
      {onSchedule && (
        <Button
          variant="outline"
          size="sm"
          onClick={onSchedule}
          disabled={disabled}
        >
          <Calendar className="h-4 w-4 mr-1" />
          Schedule
        </Button>
      )}
    </div>
  );
}
