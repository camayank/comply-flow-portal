import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  type AttendanceStatus,
  type ShiftType,
  attendanceStatusConfig,
  shiftTypeConfig,
  calculateWorkingHours,
  isLateArrival,
  formatDuration,
  getAttendancePercentage,
} from '../config';
import {
  Clock,
  MapPin,
  Timer,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';

// ============================================================================
// Attendance Status Badge
// ============================================================================

interface AttendanceStatusBadgeProps {
  status: AttendanceStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function AttendanceStatusBadge({
  status,
  size = 'md',
  showIcon = true,
  className,
}: AttendanceStatusBadgeProps) {
  const config = attendanceStatusConfig[status as AttendanceStatus] || attendanceStatusConfig.present;
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
// Shift Type Badge
// ============================================================================

interface ShiftTypeBadgeProps {
  type: ShiftType | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showTime?: boolean;
  className?: string;
}

export function ShiftTypeBadge({
  type,
  size = 'md',
  showIcon = true,
  showTime = false,
  className,
}: ShiftTypeBadgeProps) {
  const config = shiftTypeConfig[type as ShiftType] || shiftTypeConfig.regular;
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
    <div className={cn('inline-flex items-center gap-2', className)}>
      <Badge
        variant="outline"
        className={cn(
          config.bgColor,
          sizeClasses[size],
          'font-medium inline-flex items-center gap-1'
        )}
      >
        {showIcon && <Icon className={iconSizes[size]} />}
        {config.label}
      </Badge>
      {showTime && (
        <span className="text-xs text-muted-foreground">
          {config.defaultStartTime} - {config.defaultEndTime}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Time Display
// ============================================================================

interface TimeDisplayProps {
  time: string | null;
  label?: string;
  isLate?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function TimeDisplay({
  time,
  label,
  isLate = false,
  size = 'md',
  className,
}: TimeDisplayProps) {
  const formatTime = (timeString: string | null) => {
    if (!timeString) return '--:--';
    try {
      return format(new Date(`2000-01-01T${timeString}`), 'hh:mm a');
    } catch {
      return timeString;
    }
  };

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <div className={cn('text-center', className)}>
      {label && <p className="text-xs text-muted-foreground mb-0.5">{label}</p>}
      <p
        className={cn(
          'font-medium',
          sizeClasses[size],
          isLate && 'text-orange-600'
        )}
      >
        {formatTime(time)}
        {isLate && <AlertTriangle className="inline h-3 w-3 ml-1" />}
      </p>
    </div>
  );
}

// ============================================================================
// Working Hours Display
// ============================================================================

interface WorkingHoursDisplayProps {
  checkIn: string | null;
  checkOut: string | null;
  breakMinutes?: number;
  targetHours?: number;
  showProgress?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function WorkingHoursDisplay({
  checkIn,
  checkOut,
  breakMinutes = 0,
  targetHours = 8,
  showProgress = false,
  size = 'md',
  className,
}: WorkingHoursDisplayProps) {
  const hours = checkIn && checkOut
    ? calculateWorkingHours(checkIn, checkOut, breakMinutes)
    : 0;
  const percentage = (hours / targetHours) * 100;
  const isUnder = hours < targetHours;
  const isOver = hours > targetHours;

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg font-semibold',
  };

  return (
    <div className={cn('', className)}>
      <div className="flex items-center gap-2">
        <Timer className="h-4 w-4 text-muted-foreground" />
        <span className={cn(sizeClasses[size], 'font-medium')}>
          {formatDuration(hours)}
        </span>
        {isOver && (
          <Badge variant="secondary" className="text-xs text-emerald-600">
            <TrendingUp className="h-3 w-3 mr-1" />
            +{formatDuration(hours - targetHours)}
          </Badge>
        )}
        {isUnder && checkOut && (
          <Badge variant="secondary" className="text-xs text-amber-600">
            <TrendingDown className="h-3 w-3 mr-1" />
            -{formatDuration(targetHours - hours)}
          </Badge>
        )}
      </div>
      {showProgress && (
        <Progress
          value={Math.min(percentage, 100)}
          className={cn(
            'h-1.5 mt-1',
            isOver && '[&>div]:bg-emerald-500',
            isUnder && checkOut && '[&>div]:bg-amber-500'
          )}
        />
      )}
    </div>
  );
}

// ============================================================================
// Location Badge
// ============================================================================

interface LocationBadgeProps {
  location: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function LocationBadge({ location, size = 'md', className }: LocationBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
  };

  return (
    <div className={cn('flex items-center gap-1 text-muted-foreground', sizeClasses[size], className)}>
      <MapPin className="h-3 w-3" />
      <span>{location}</span>
    </div>
  );
}

// ============================================================================
// Attendance Record Card
// ============================================================================

interface AttendanceRecordCardProps {
  employeeId: number | string;
  employeeName: string;
  employeeDepartment?: string;
  employeeRole?: string;
  date: Date | string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceStatus | string;
  location?: string;
  breakMinutes?: number;
  shiftType?: ShiftType | string;
  onEdit?: (id: number | string) => void;
  className?: string;
}

export function AttendanceRecordCard({
  employeeId,
  employeeName,
  employeeDepartment,
  employeeRole,
  date,
  checkIn,
  checkOut,
  status,
  location,
  breakMinutes = 0,
  shiftType,
  onEdit,
  className,
}: AttendanceRecordCardProps) {
  const config = attendanceStatusConfig[status as AttendanceStatus];
  const shiftConfig = shiftType ? shiftTypeConfig[shiftType as ShiftType] : null;
  const isLate = checkIn && shiftConfig
    ? isLateArrival(checkIn, shiftConfig.defaultStartTime)
    : false;

  const initials = employeeName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className={cn('', className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Employee Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium">{initials}</span>
            </div>
            <div>
              <h4 className="font-medium">{employeeName}</h4>
              {(employeeDepartment || employeeRole) && (
                <p className="text-sm text-muted-foreground">
                  {[employeeDepartment, employeeRole].filter(Boolean).join(' • ')}
                </p>
              )}
            </div>
          </div>

          {/* Attendance Details */}
          <div className="flex items-center gap-6">
            <TimeDisplay time={checkIn} label="Check In" isLate={isLate} />
            <TimeDisplay time={checkOut} label="Check Out" />
            <WorkingHoursDisplay
              checkIn={checkIn}
              checkOut={checkOut}
              breakMinutes={breakMinutes}
            />
            <AttendanceStatusBadge status={status} size="sm" />
            {location && <LocationBadge location={location} size="sm" />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Attendance Summary Card
// ============================================================================

interface AttendanceSummaryCardProps {
  present: number;
  absent: number;
  late: number;
  onLeave: number;
  totalEmployees: number;
  className?: string;
}

export function AttendanceSummaryCard({
  present,
  absent,
  late,
  onLeave,
  totalEmployees,
  className,
}: AttendanceSummaryCardProps) {
  const presentPercentage = getAttendancePercentage(present, totalEmployees);

  const stats = [
    { label: 'Present', value: present, color: 'bg-emerald-500', icon: CheckCircle },
    { label: 'Late', value: late, color: 'bg-orange-500', icon: AlertTriangle },
    { label: 'Absent', value: absent, color: 'bg-red-500', icon: XCircle },
    { label: 'On Leave', value: onLeave, color: 'bg-blue-500', icon: Clock },
  ];

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
          <span>Today's Attendance</span>
          <span className="text-2xl font-bold text-foreground">{presentPercentage}%</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar breakdown */}
        <div className="flex h-3 rounded-full overflow-hidden">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={cn(stat.color)}
              style={{ width: `${(stat.value / totalEmployees) * 100}%` }}
            />
          ))}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className={cn('w-8 h-8 rounded-full mx-auto flex items-center justify-center', stat.color)}>
                <span className="text-white text-sm font-bold">{stat.value}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Weekly Attendance Chart
// ============================================================================

interface WeeklyAttendanceProps {
  data: Array<{
    day: string;
    present: number;
    late: number;
    absent: number;
  }>;
  className?: string;
}

export function WeeklyAttendanceChart({ data, className }: WeeklyAttendanceProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Weekly Attendance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((day) => (
            <div key={day.day} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium w-8">{day.day}</span>
                <span className="text-muted-foreground">{day.present}% present</span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500" style={{ width: `${day.present}%` }} />
                <div className="bg-orange-500" style={{ width: `${day.late}%` }} />
                <div className="bg-red-500" style={{ width: `${day.absent}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-emerald-500 rounded" />
            <span>Present</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-orange-500 rounded" />
            <span>Late</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded" />
            <span>Absent</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Department Attendance
// ============================================================================

interface DepartmentAttendanceProps {
  departments: Array<{
    name: string;
    attendance: number;
    employees: number;
  }>;
  className?: string;
}

export function DepartmentAttendance({ departments, className }: DepartmentAttendanceProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Department Attendance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {departments.map((dept) => (
            <div key={dept.name} className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{dept.name}</h4>
                <p className="text-xs text-muted-foreground">{dept.employees} employees</p>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={dept.attendance} className="w-20 h-2" />
                <span className="text-sm font-medium w-10 text-right">{dept.attendance}%</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
