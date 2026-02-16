import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  User,
  Users,
  CheckCircle,
  AlertTriangle,
  Briefcase,
  ArrowRight,
  Clock,
} from 'lucide-react';

export interface TeamMember {
  id: number | string;
  name: string;
  role?: string;
  avatar?: string;
  activeWorkload: number;
  maxCapacity: number;
  available: boolean;
  pendingTasks?: number;
  completedToday?: number;
  avgResponseTime?: string;
}

interface TeamWorkloadCardProps {
  member: TeamMember;
  onAssign?: () => void;
  onViewProfile?: () => void;
  compact?: boolean;
  className?: string;
}

function getWorkloadColor(percentage: number) {
  if (percentage >= 90) return { text: 'text-red-600', bar: 'bg-red-500' };
  if (percentage >= 75) return { text: 'text-orange-600', bar: 'bg-orange-500' };
  if (percentage >= 50) return { text: 'text-amber-600', bar: 'bg-amber-500' };
  return { text: 'text-emerald-600', bar: 'bg-emerald-500' };
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function TeamWorkloadCard({
  member,
  onAssign,
  onViewProfile,
  compact = false,
  className,
}: TeamWorkloadCardProps) {
  const workloadPercentage = Math.round(
    (member.activeWorkload / member.maxCapacity) * 100
  );
  const colors = getWorkloadColor(workloadPercentage);
  const isOverloaded = workloadPercentage >= 90;
  const hasCapacity = workloadPercentage < 75;

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors',
          !member.available && 'opacity-60',
          className
        )}
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs bg-primary/10">
            {getInitials(member.name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{member.name}</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full', colors.bar)}
                style={{ width: `${Math.min(workloadPercentage, 100)}%` }}
              />
            </div>
            <span className={cn('text-xs font-medium', colors.text)}>
              {member.activeWorkload}/{member.maxCapacity}
            </span>
          </div>
        </div>

        {!member.available && (
          <Badge variant="outline" className="text-xs shrink-0">
            Unavailable
          </Badge>
        )}

        {onAssign && member.available && hasCapacity && (
          <Button size="sm" variant="ghost" onClick={onAssign}>
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-4 space-y-4',
        !member.available && 'opacity-60',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary/10">
            {getInitials(member.name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{member.name}</p>
            {!member.available && (
              <Badge variant="outline" className="text-xs">
                Unavailable
              </Badge>
            )}
            {isOverloaded && member.available && (
              <Badge variant="outline" className="text-xs text-red-600 border-red-200 bg-red-50">
                Overloaded
              </Badge>
            )}
          </div>
          {member.role && (
            <p className="text-sm text-muted-foreground">{member.role}</p>
          )}
        </div>
      </div>

      {/* Workload Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Current Workload</span>
          <span className={cn('font-medium', colors.text)}>
            {member.activeWorkload}/{member.maxCapacity} ({workloadPercentage}%)
          </span>
        </div>
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', colors.bar)}
            style={{ width: `${Math.min(workloadPercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      {(member.pendingTasks !== undefined ||
        member.completedToday !== undefined ||
        member.avgResponseTime) && (
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          {member.pendingTasks !== undefined && (
            <div className="text-center">
              <p className="text-lg font-semibold">{member.pendingTasks}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          )}
          {member.completedToday !== undefined && (
            <div className="text-center">
              <p className="text-lg font-semibold text-emerald-600">
                {member.completedToday}
              </p>
              <p className="text-xs text-muted-foreground">Today</p>
            </div>
          )}
          {member.avgResponseTime && (
            <div className="text-center">
              <p className="text-lg font-semibold">{member.avgResponseTime}</p>
              <p className="text-xs text-muted-foreground">Avg Time</p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {(onAssign || onViewProfile) && (
        <div className="flex gap-2 pt-2 border-t">
          {onAssign && member.available && hasCapacity && (
            <Button size="sm" className="flex-1" onClick={onAssign}>
              Assign Task
            </Button>
          )}
          {onViewProfile && (
            <Button
              size="sm"
              variant="outline"
              className={!onAssign ? 'flex-1' : ''}
              onClick={onViewProfile}
            >
              View Profile
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

interface TeamWorkloadListProps {
  members: TeamMember[];
  onAssign?: (memberId: number | string) => void;
  onViewProfile?: (memberId: number | string) => void;
  compact?: boolean;
  showOnlyAvailable?: boolean;
  sortByCapacity?: boolean;
  className?: string;
}

export function TeamWorkloadList({
  members,
  onAssign,
  onViewProfile,
  compact = false,
  showOnlyAvailable = false,
  sortByCapacity = true,
  className,
}: TeamWorkloadListProps) {
  let displayMembers = showOnlyAvailable
    ? members.filter((m) => m.available)
    : members;

  if (sortByCapacity) {
    displayMembers = [...displayMembers].sort((a, b) => {
      const aCapacity = (a.activeWorkload / a.maxCapacity) * 100;
      const bCapacity = (b.activeWorkload / b.maxCapacity) * 100;
      return aCapacity - bCapacity;
    });
  }

  if (displayMembers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No team members available</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {displayMembers.map((member) => (
        <TeamWorkloadCard
          key={member.id}
          member={member}
          onAssign={onAssign ? () => onAssign(member.id) : undefined}
          onViewProfile={onViewProfile ? () => onViewProfile(member.id) : undefined}
          compact={compact}
        />
      ))}
    </div>
  );
}

interface TeamCapacitySummaryProps {
  members: TeamMember[];
  className?: string;
}

export function TeamCapacitySummary({ members, className }: TeamCapacitySummaryProps) {
  const totalCapacity = members.reduce((sum, m) => sum + m.maxCapacity, 0);
  const totalWorkload = members.reduce((sum, m) => sum + m.activeWorkload, 0);
  const availableMembers = members.filter((m) => m.available).length;
  const overloadedMembers = members.filter(
    (m) => (m.activeWorkload / m.maxCapacity) * 100 >= 90
  ).length;
  const utilizationRate = Math.round((totalWorkload / totalCapacity) * 100);

  const colors = getWorkloadColor(utilizationRate);

  return (
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Capacity
        </h3>
        <span className={cn('text-2xl font-bold', colors.text)}>
          {utilizationRate}%
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="relative h-3 bg-muted rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', colors.bar)}
            style={{ width: `${Math.min(utilizationRate, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{totalWorkload} active tasks</span>
          <span>{totalCapacity} max capacity</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 pt-4 border-t">
        <div className="text-center">
          <p className="text-lg font-semibold">{members.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-emerald-600">{availableMembers}</p>
          <p className="text-xs text-muted-foreground">Available</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600">{overloadedMembers}</p>
          <p className="text-xs text-muted-foreground">Overloaded</p>
        </div>
      </div>
    </div>
  );
}
