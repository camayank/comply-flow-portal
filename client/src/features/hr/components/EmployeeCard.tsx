import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  type EmployeeStatus,
  type Department,
  type PerformanceRating,
  type TrainingStatus,
  employeeStatusConfig,
  departmentConfig,
  performanceRatingConfig,
  trainingStatusConfig,
  getEmployeeInitials,
} from '../config';
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  Building2,
  Star,
  GraduationCap,
  Clock,
  MoreHorizontal,
  Edit,
  Eye,
  Trash2,
} from 'lucide-react';
import { format, differenceInYears, differenceInMonths } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ============================================================================
// Employee Status Badge
// ============================================================================

interface EmployeeStatusBadgeProps {
  status: EmployeeStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function EmployeeStatusBadge({
  status,
  size = 'md',
  showIcon = true,
  className,
}: EmployeeStatusBadgeProps) {
  const config = employeeStatusConfig[status as EmployeeStatus] || employeeStatusConfig.active;
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
// Department Badge
// ============================================================================

interface DepartmentBadgeProps {
  department: Department | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function DepartmentBadge({
  department,
  size = 'md',
  showIcon = true,
  className,
}: DepartmentBadgeProps) {
  const config = departmentConfig[department as Department] || departmentConfig.operations;
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

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    pink: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
    teal: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
    indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
    orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        colorClasses[config.color] || colorClasses.blue,
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
// Performance Rating Badge
// ============================================================================

interface PerformanceRatingBadgeProps {
  rating: PerformanceRating | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showScore?: boolean;
  className?: string;
}

export function PerformanceRatingBadge({
  rating,
  size = 'md',
  showIcon = true,
  showScore = false,
  className,
}: PerformanceRatingBadgeProps) {
  const config = performanceRatingConfig[rating as PerformanceRating] || performanceRatingConfig.meets;
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
      {showScore && (
        <span className="ml-1">({config.score}/{config.maxScore})</span>
      )}
    </Badge>
  );
}

// ============================================================================
// Training Status Badge
// ============================================================================

interface TrainingStatusBadgeProps {
  status: TrainingStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function TrainingStatusBadge({
  status,
  size = 'md',
  showIcon = true,
  className,
}: TrainingStatusBadgeProps) {
  const config = trainingStatusConfig[status as TrainingStatus] || trainingStatusConfig.not_started;
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
// Tenure Display
// ============================================================================

interface TenureDisplayProps {
  joinDate: Date | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function TenureDisplay({
  joinDate,
  size = 'md',
  showIcon = true,
  className,
}: TenureDisplayProps) {
  const date = new Date(joinDate);
  const now = new Date();
  const years = differenceInYears(now, date);
  const months = differenceInMonths(now, date) % 12;

  let tenureText = '';
  if (years > 0) {
    tenureText = `${years}y ${months}m`;
  } else if (months > 0) {
    tenureText = `${months} months`;
  } else {
    tenureText = 'New';
  }

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={cn('flex items-center gap-1 text-muted-foreground', sizeClasses[size], className)}>
      {showIcon && <Clock className="h-3.5 w-3.5" />}
      <span>{tenureText}</span>
    </div>
  );
}

// ============================================================================
// Employee Avatar
// ============================================================================

interface EmployeeAvatarProps {
  name: string;
  imageUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function EmployeeAvatar({
  name,
  imageUrl,
  size = 'md',
  className,
}: EmployeeAvatarProps) {
  const initials = getEmployeeInitials(name);

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
  };

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {imageUrl && <AvatarImage src={imageUrl} alt={name} />}
      <AvatarFallback className="bg-primary/10">{initials}</AvatarFallback>
    </Avatar>
  );
}

// ============================================================================
// Employee Card
// ============================================================================

interface EmployeeCardProps {
  id: number | string;
  name: string;
  employeeId?: string;
  email?: string;
  phone?: string;
  role: string;
  department: Department | string;
  status: EmployeeStatus | string;
  joinDate: Date | string;
  location?: string;
  imageUrl?: string;
  reportingTo?: string;
  performanceRating?: PerformanceRating | string;
  onView?: (id: number | string) => void;
  onEdit?: (id: number | string) => void;
  onDelete?: (id: number | string) => void;
  compact?: boolean;
  className?: string;
}

export function EmployeeCard({
  id,
  name,
  employeeId,
  email,
  phone,
  role,
  department,
  status,
  joinDate,
  location,
  imageUrl,
  reportingTo,
  performanceRating,
  onView,
  onEdit,
  onDelete,
  compact = false,
  className,
}: EmployeeCardProps) {
  if (compact) {
    return (
      <Card className={cn('hover:shadow-md transition-shadow cursor-pointer', className)} onClick={() => onView?.(id)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <EmployeeAvatar name={name} imageUrl={imageUrl} size="md" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium truncate">{name}</h4>
                <EmployeeStatusBadge status={status} size="sm" showIcon={false} />
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {role} • {departmentConfig[department as Department]?.label || department}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Employee Info */}
          <div className="flex items-start gap-4">
            <EmployeeAvatar name={name} imageUrl={imageUrl} size="lg" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg">{name}</h3>
                <EmployeeStatusBadge status={status} size="sm" />
              </div>
              {employeeId && (
                <p className="text-sm text-muted-foreground font-mono">{employeeId}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <DepartmentBadge department={department} size="sm" />
                <Badge variant="secondary" className="text-xs">
                  <Briefcase className="h-3 w-3 mr-1" />
                  {role}
                </Badge>
              </div>
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={() => onView(id)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Profile
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(id)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete(id)} className="text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Separator className="my-4" />

        {/* Contact & Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span className="truncate">{email}</span>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{phone}</span>
            </div>
          )}
          {location && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{location}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Joined {format(new Date(joinDate), 'MMM yyyy')}</span>
          </div>
        </div>

        {/* Additional Info */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <TenureDisplay joinDate={joinDate} />
          {performanceRating && (
            <PerformanceRatingBadge rating={performanceRating} size="sm" />
          )}
          {reportingTo && (
            <div className="text-xs text-muted-foreground">
              Reports to: <span className="font-medium">{reportingTo}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Employee List
// ============================================================================

interface EmployeeListProps {
  employees: Array<{
    id: number | string;
    name: string;
    employeeId?: string;
    email?: string;
    phone?: string;
    role: string;
    department: Department | string;
    status: EmployeeStatus | string;
    joinDate: Date | string;
    location?: string;
    imageUrl?: string;
    reportingTo?: string;
    performanceRating?: PerformanceRating | string;
  }>;
  onView?: (id: number | string) => void;
  onEdit?: (id: number | string) => void;
  onDelete?: (id: number | string) => void;
  compact?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function EmployeeList({
  employees,
  onView,
  onEdit,
  onDelete,
  compact = false,
  emptyMessage = 'No employees found',
  className,
}: EmployeeListProps) {
  if (employees.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn(compact ? 'space-y-2' : 'space-y-4', className)}>
      {employees.map((employee) => (
        <EmployeeCard
          key={employee.id}
          {...employee}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          compact={compact}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Employee Stats Card
// ============================================================================

interface EmployeeStatsCardProps {
  totalEmployees: number;
  activeEmployees: number;
  onProbation: number;
  onLeave: number;
  newHiresThisMonth?: number;
  className?: string;
}

export function EmployeeStatsCard({
  totalEmployees,
  activeEmployees,
  onProbation,
  onLeave,
  newHiresThisMonth = 0,
  className,
}: EmployeeStatsCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Employee Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold mb-4">{totalEmployees}</div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Active</p>
            <p className="font-semibold text-emerald-600">{activeEmployees}</p>
          </div>
          <div>
            <p className="text-muted-foreground">On Probation</p>
            <p className="font-semibold text-amber-600">{onProbation}</p>
          </div>
          <div>
            <p className="text-muted-foreground">On Leave</p>
            <p className="font-semibold text-blue-600">{onLeave}</p>
          </div>
          <div>
            <p className="text-muted-foreground">New This Month</p>
            <p className="font-semibold text-purple-600">{newHiresThisMonth}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Training Progress Card
// ============================================================================

interface TrainingProgressCardProps {
  trainingName: string;
  status: TrainingStatus | string;
  progress: number;
  dueDate?: Date | string;
  completedDate?: Date | string;
  className?: string;
}

export function TrainingProgressCard({
  trainingName,
  status,
  progress,
  dueDate,
  completedDate,
  className,
}: TrainingProgressCardProps) {
  const config = trainingStatusConfig[status as TrainingStatus];
  const isOverdue = dueDate && new Date(dueDate) < new Date() && status !== 'completed';

  return (
    <Card className={cn('', className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-medium">{trainingName}</h4>
          </div>
          <TrainingStatusBadge status={status} size="sm" />
        </div>
        <Progress value={progress} className="h-2 mb-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{progress}% complete</span>
          {completedDate ? (
            <span>Completed {format(new Date(completedDate), 'MMM d, yyyy')}</span>
          ) : dueDate ? (
            <span className={cn(isOverdue && 'text-red-600')}>
              Due {format(new Date(dueDate), 'MMM d, yyyy')}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
