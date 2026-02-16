import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  type LeadStage,
  type LeadPriority,
  leadStageConfig,
  formatCurrency,
  getDealSize,
  dealSizeConfig,
} from '../config';
import {
  LeadStageBadge,
  LeadPriorityBadge,
  LeadContactInfo,
  FollowUpIndicator,
  DealValue,
  LeadScore,
  LeadAgeIndicator,
} from './LeadStageBadge';
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Phone,
  Mail,
  Calendar,
  ArrowRight,
  Building2,
  User,
  Briefcase,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ============================================================================
// Deal Card (for Pipeline/Kanban view)
// ============================================================================

interface DealCardProps {
  id: number | string;
  leadId?: string;
  clientName: string;
  companyName?: string;
  stage: LeadStage | string;
  priority: LeadPriority | string;
  estimatedValue?: number | string | null;
  service?: string;
  executive?: string;
  phone?: string | null;
  email?: string | null;
  nextFollowUp?: Date | string | null;
  createdAt?: Date | string;
  score?: number;
  onEdit?: (id: number | string) => void;
  onDelete?: (id: number | string) => void;
  onCall?: (id: number | string) => void;
  onEmail?: (id: number | string) => void;
  onMoveStage?: (id: number | string, newStage: LeadStage) => void;
  onClick?: (id: number | string) => void;
  compact?: boolean;
  className?: string;
}

export function DealCard({
  id,
  leadId,
  clientName,
  companyName,
  stage,
  priority,
  estimatedValue,
  service,
  executive,
  phone,
  email,
  nextFollowUp,
  createdAt,
  score,
  onEdit,
  onDelete,
  onCall,
  onEmail,
  onMoveStage,
  onClick,
  compact = false,
  className,
}: DealCardProps) {
  const stageConfig = leadStageConfig[stage as LeadStage];
  const value = estimatedValue
    ? typeof estimatedValue === 'string'
      ? parseFloat(estimatedValue)
      : estimatedValue
    : 0;
  const dealSize = getDealSize(value);
  const dealSizeInfo = dealSizeConfig[dealSize];

  // Get possible next stages
  const getNextStages = (): LeadStage[] => {
    const currentConfig = leadStageConfig[stage as LeadStage];
    if (!currentConfig || currentConfig.isTerminal) return [];

    const stageOrder: LeadStage[] = ['new', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost'];
    const currentIndex = stageOrder.indexOf(stage as LeadStage);
    return stageOrder.slice(currentIndex + 1).filter((s) => s !== 'lost' || stage === 'negotiation');
  };

  const nextStages = getNextStages();

  if (compact) {
    return (
      <Card
        className={cn(
          'cursor-pointer hover:shadow-md transition-shadow',
          className
        )}
        onClick={() => onClick?.(id)}
      >
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{clientName}</p>
              {companyName && (
                <p className="text-xs text-muted-foreground truncate">{companyName}</p>
              )}
            </div>
            <LeadPriorityBadge priority={priority} size="sm" showIcon={false} />
          </div>

          <div className="flex items-center justify-between text-sm">
            <DealValue value={value} size="sm" />
            {nextFollowUp && (
              <FollowUpIndicator date={nextFollowUp} className="text-xs" />
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              {leadId && (
                <Badge variant="outline" className="text-xs font-mono">
                  {leadId}
                </Badge>
              )}
              <LeadStageBadge stage={stage} size="sm" />
            </div>
            <h3
              className="font-semibold text-lg truncate cursor-pointer hover:text-primary"
              onClick={() => onClick?.(id)}
            >
              {clientName}
            </h3>
            {companyName && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {companyName}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(id)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {onCall && phone && (
                <DropdownMenuItem onClick={() => onCall(id)}>
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </DropdownMenuItem>
              )}
              {onEmail && email && (
                <DropdownMenuItem onClick={() => onEmail(id)}>
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </DropdownMenuItem>
              )}
              {nextStages.length > 0 && onMoveStage && (
                <>
                  <DropdownMenuSeparator />
                  {nextStages.map((nextStage) => (
                    <DropdownMenuItem
                      key={nextStage}
                      onClick={() => onMoveStage(id, nextStage)}
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Move to {leadStageConfig[nextStage].label}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 space-y-3">
        {/* Value and Priority */}
        <div className="flex items-center justify-between">
          <DealValue value={value} size="lg" />
          <LeadPriorityBadge priority={priority} size="sm" />
        </div>

        {/* Service and Executive */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {service && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Briefcase className="h-3.5 w-3.5" />
              <span className="truncate">{service}</span>
            </div>
          )}
          {executive && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span className="truncate">{executive}</span>
            </div>
          )}
        </div>

        {/* Contact Info */}
        <LeadContactInfo phone={phone} email={email} compact />

        <Separator />

        {/* Footer info */}
        <div className="flex items-center justify-between text-sm">
          {nextFollowUp ? (
            <FollowUpIndicator date={nextFollowUp} />
          ) : createdAt ? (
            <LeadAgeIndicator createdAt={createdAt} />
          ) : null}
          {score !== undefined && <LeadScore score={score} size="sm" showLabel={false} />}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Deal Card List
// ============================================================================

interface DealCardListProps {
  deals: Array<{
    id: number | string;
    leadId?: string;
    clientName: string;
    companyName?: string;
    stage: LeadStage | string;
    priority: LeadPriority | string;
    estimatedValue?: number | string | null;
    service?: string;
    executive?: string;
    phone?: string | null;
    email?: string | null;
    nextFollowUp?: Date | string | null;
    createdAt?: Date | string;
    score?: number;
  }>;
  onEdit?: (id: number | string) => void;
  onDelete?: (id: number | string) => void;
  onClick?: (id: number | string) => void;
  onMoveStage?: (id: number | string, newStage: LeadStage) => void;
  compact?: boolean;
  className?: string;
}

export function DealCardList({
  deals,
  onEdit,
  onDelete,
  onClick,
  onMoveStage,
  compact = false,
  className,
}: DealCardListProps) {
  if (deals.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        No deals found
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {deals.map((deal) => (
        <DealCard
          key={deal.id}
          {...deal}
          onEdit={onEdit}
          onDelete={onDelete}
          onClick={onClick}
          onMoveStage={onMoveStage}
          compact={compact}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Pipeline Stage Column
// ============================================================================

interface PipelineStageColumnProps {
  stage: LeadStage;
  deals: Array<{
    id: number | string;
    leadId?: string;
    clientName: string;
    companyName?: string;
    stage: LeadStage | string;
    priority: LeadPriority | string;
    estimatedValue?: number | string | null;
    service?: string;
    executive?: string;
    phone?: string | null;
    email?: string | null;
    nextFollowUp?: Date | string | null;
    score?: number;
  }>;
  totalValue?: number;
  onDealClick?: (id: number | string) => void;
  onMoveStage?: (id: number | string, newStage: LeadStage) => void;
  className?: string;
}

export function PipelineStageColumn({
  stage,
  deals,
  totalValue,
  onDealClick,
  onMoveStage,
  className,
}: PipelineStageColumnProps) {
  const config = leadStageConfig[stage];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex flex-col min-w-[280px] max-w-[320px] bg-muted/30 rounded-lg',
        className
      )}
    >
      {/* Header */}
      <div className="p-3 border-b bg-background rounded-t-lg">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className={cn('w-2 h-2 rounded-full', config.color)} />
            <h3 className="font-semibold">{config.label}</h3>
            <Badge variant="secondary" className="text-xs">
              {deals.length}
            </Badge>
          </div>
        </div>
        {totalValue !== undefined && totalValue > 0 && (
          <p className="text-sm text-muted-foreground">
            {formatCurrency(totalValue)}
          </p>
        )}
      </div>

      {/* Deals */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-250px)]">
        {deals.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No deals in this stage
          </div>
        ) : (
          deals.map((deal) => (
            <DealCard
              key={deal.id}
              {...deal}
              onClick={onDealClick}
              onMoveStage={onMoveStage}
              compact
            />
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Pipeline Board
// ============================================================================

interface PipelineBoardProps {
  stages: LeadStage[];
  dealsByStage: Record<LeadStage, Array<{
    id: number | string;
    leadId?: string;
    clientName: string;
    companyName?: string;
    stage: LeadStage | string;
    priority: LeadPriority | string;
    estimatedValue?: number | string | null;
    service?: string;
    executive?: string;
    phone?: string | null;
    email?: string | null;
    nextFollowUp?: Date | string | null;
    score?: number;
  }>>;
  valuesByStage?: Record<LeadStage, number>;
  onDealClick?: (id: number | string) => void;
  onMoveStage?: (id: number | string, newStage: LeadStage) => void;
  className?: string;
}

export function PipelineBoard({
  stages,
  dealsByStage,
  valuesByStage,
  onDealClick,
  onMoveStage,
  className,
}: PipelineBoardProps) {
  return (
    <div className={cn('flex gap-4 overflow-x-auto pb-4', className)}>
      {stages.map((stage) => (
        <PipelineStageColumn
          key={stage}
          stage={stage}
          deals={dealsByStage[stage] || []}
          totalValue={valuesByStage?.[stage]}
          onDealClick={onDealClick}
          onMoveStage={onMoveStage}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Deal Summary Card (for dashboard)
// ============================================================================

interface DealSummaryCardProps {
  title: string;
  count: number;
  value: number;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
  onClick?: () => void;
  className?: string;
}

export function DealSummaryCard({
  title,
  count,
  value,
  icon,
  trend,
  onClick,
  className,
}: DealSummaryCardProps) {
  return (
    <Card
      className={cn(
        onClick && 'cursor-pointer hover:shadow-md transition-shadow',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{count}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {formatCurrency(value)}
            </p>
          </div>
          {icon && (
            <div className="p-2 bg-primary/10 rounded-lg">{icon}</div>
          )}
        </div>
        {trend && (
          <div
            className={cn(
              'flex items-center gap-1 mt-2 text-xs',
              trend.value >= 0 ? 'text-emerald-600' : 'text-red-600'
            )}
          >
            <ChevronRight
              className={cn('h-3 w-3', trend.value < 0 && 'rotate-90')}
            />
            <span>
              {trend.value >= 0 ? '+' : ''}
              {trend.value}% {trend.label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
