/**
 * Progressive Disclosure Components
 * Reveal complexity progressively - show summary first, details on demand
 *
 * Design Philosophy:
 * - 3-second scan: User understands status immediately
 * - Click to expand: Details available when needed
 * - No cognitive overload: Information hierarchy is clear
 */

import { useState, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// 1. ExpandableCard - Card that expands to show more content
// ============================================

interface ExpandableCardProps {
  title: string;
  summary: ReactNode;
  details: ReactNode;
  badge?: ReactNode;
  icon?: ReactNode;
  defaultExpanded?: boolean;
  variant?: 'default' | 'compact' | 'highlight';
  className?: string;
}

export function ExpandableCard({
  title,
  summary,
  details,
  badge,
  icon,
  defaultExpanded = false,
  variant = 'default',
  className
}: ExpandableCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <Card className={cn(
      "transition-all duration-200",
      isExpanded && "ring-1 ring-primary/20",
      variant === 'highlight' && "border-primary/30 bg-primary/5",
      className
    )}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {icon && (
                  <div className="shrink-0 mt-0.5">{icon}</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className={cn(
                      "truncate",
                      variant === 'compact' ? "text-base" : "text-lg"
                    )}>
                      {title}
                    </CardTitle>
                    {badge}
                  </div>
                  <CardDescription className="line-clamp-2">
                    {summary}
                  </CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="shrink-0">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 border-t">
            <div className="pt-4">
              {details}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ============================================
// 2. SummaryDetailView - Toggle between summary and detail modes
// ============================================

interface SummaryDetailViewProps {
  summaryView: ReactNode;
  detailView: ReactNode;
  summaryLabel?: string;
  detailLabel?: string;
  defaultMode?: 'summary' | 'detail';
  className?: string;
}

export function SummaryDetailView({
  summaryView,
  detailView,
  summaryLabel = 'Summary',
  detailLabel = 'Details',
  defaultMode = 'summary',
  className
}: SummaryDetailViewProps) {
  const [mode, setMode] = useState<'summary' | 'detail'>(defaultMode);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-end gap-2">
        <Button
          variant={mode === 'summary' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setMode('summary')}
          className="gap-2"
        >
          <Minimize2 className="h-3.5 w-3.5" />
          {summaryLabel}
        </Button>
        <Button
          variant={mode === 'detail' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setMode('detail')}
          className="gap-2"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          {detailLabel}
        </Button>
      </div>
      <div className={cn(
        "transition-all duration-300",
        mode === 'detail' && "animate-in fade-in slide-in-from-bottom-2"
      )}>
        {mode === 'summary' ? summaryView : detailView}
      </div>
    </div>
  );
}

// ============================================
// 3. RevealOnHover - Show additional info on hover
// ============================================

interface RevealOnHoverProps {
  children: ReactNode;
  revealContent: ReactNode;
  position?: 'top' | 'bottom' | 'inline';
  className?: string;
}

export function RevealOnHover({
  children,
  revealContent,
  position = 'bottom',
  className
}: RevealOnHoverProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn("relative group", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      <div className={cn(
        "transition-all duration-200",
        position === 'inline' ? "inline-block ml-2" : "absolute left-0 right-0",
        position === 'top' && "bottom-full mb-2",
        position === 'bottom' && "top-full mt-2",
        isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 pointer-events-none"
      )}>
        {revealContent}
      </div>
    </div>
  );
}

// ============================================
// 4. ShowMoreList - List that shows limited items with expand option
// ============================================

interface ShowMoreListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  initialCount?: number;
  showMoreLabel?: string;
  showLessLabel?: string;
  className?: string;
  emptyMessage?: string;
}

export function ShowMoreList<T>({
  items,
  renderItem,
  initialCount = 3,
  showMoreLabel = 'Show more',
  showLessLabel = 'Show less',
  className,
  emptyMessage = 'No items to display'
}: ShowMoreListProps<T>) {
  const [showAll, setShowAll] = useState(false);

  if (items.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const visibleItems = showAll ? items : items.slice(0, initialCount);
  const hasMore = items.length > initialCount;

  return (
    <div className={cn("space-y-2", className)}>
      {visibleItems.map((item, index) => (
        <div
          key={index}
          className={cn(
            "transition-all duration-200",
            showAll && index >= initialCount && "animate-in fade-in slide-in-from-top-2"
          )}
        >
          {renderItem(item, index)}
        </div>
      ))}
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(!showAll)}
          className="w-full text-muted-foreground hover:text-foreground"
        >
          {showAll ? (
            <>
              <EyeOff className="h-4 w-4 mr-2" />
              {showLessLabel}
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              {showMoreLabel} ({items.length - initialCount} more)
            </>
          )}
        </Button>
      )}
    </div>
  );
}

// ============================================
// 5. InfoTooltipCard - Card with expandable info section
// ============================================

interface InfoTooltipCardProps {
  title: string;
  value: ReactNode;
  info: string;
  trend?: { value: string; positive: boolean };
  icon?: ReactNode;
  className?: string;
}

export function InfoTooltipCard({
  title,
  value,
  info,
  trend,
  icon,
  className
}: InfoTooltipCardProps) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm text-muted-foreground">{title}</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => setShowInfo(!showInfo)}
              >
                <Info className={cn(
                  "h-3.5 w-3.5 transition-colors",
                  showInfo ? "text-primary" : "text-muted-foreground"
                )} />
              </Button>
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold">{value}</div>
              {trend && (
                <Badge variant="outline" className={cn(
                  "text-xs",
                  trend.positive ? "text-emerald-600" : "text-red-600"
                )}>
                  {trend.value}
                </Badge>
              )}
            </div>
          </div>
          {icon && (
            <div className="text-muted-foreground">{icon}</div>
          )}
        </div>

        {/* Info panel */}
        <div className={cn(
          "overflow-hidden transition-all duration-300",
          showInfo ? "max-h-32 opacity-100 mt-3 pt-3 border-t" : "max-h-0 opacity-0"
        )}>
          <p className="text-xs text-muted-foreground">{info}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// 6. StepByStepGuide - Progressive step reveal
// ============================================

interface Step {
  title: string;
  description: string;
  content: ReactNode;
  status?: 'complete' | 'current' | 'pending';
}

interface StepByStepGuideProps {
  steps: Step[];
  currentStep?: number;
  className?: string;
}

export function StepByStepGuide({
  steps,
  currentStep = 0,
  className
}: StepByStepGuideProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(currentStep);

  return (
    <div className={cn("space-y-3", className)}>
      {steps.map((step, index) => {
        const status = step.status ||
          (index < currentStep ? 'complete' : index === currentStep ? 'current' : 'pending');
        const isExpanded = expandedStep === index;

        return (
          <Collapsible
            key={index}
            open={isExpanded}
            onOpenChange={() => setExpandedStep(isExpanded ? null : index)}
          >
            <CollapsibleTrigger asChild>
              <div className={cn(
                "flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-colors",
                status === 'complete' && "bg-emerald-50 hover:bg-emerald-100",
                status === 'current' && "bg-primary/10 hover:bg-primary/15 ring-1 ring-primary/20",
                status === 'pending' && "bg-muted/50 hover:bg-muted"
              )}>
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0",
                  status === 'complete' && "bg-emerald-500 text-white",
                  status === 'current' && "bg-primary text-primary-foreground",
                  status === 'pending' && "bg-muted-foreground/20 text-muted-foreground"
                )}>
                  {status === 'complete' ? '✓' : index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium",
                    status === 'pending' && "text-muted-foreground"
                  )}>
                    {step.title}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {step.description}
                  </p>
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  isExpanded && "rotate-180"
                )} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-12 mt-2 p-4 border-l-2 border-muted">
                {step.content}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}

export default {
  ExpandableCard,
  SummaryDetailView,
  RevealOnHover,
  ShowMoreList,
  InfoTooltipCard,
  StepByStepGuide
};
