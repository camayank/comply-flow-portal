import {
  Home,
  Heart,
  Plane,
  Baby,
  AlertTriangle,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Pause,
  Timer,
  Sun,
  Moon,
  Sunrise,
  Users,
  User,
  Briefcase,
  GraduationCap,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Target,
  BarChart,
  FileText,
  Settings,
  Building2,
  MapPin,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

// ============================================================================
// Leave Type Configuration
// ============================================================================

export type LeaveType =
  | 'casual'
  | 'sick'
  | 'annual'
  | 'maternity'
  | 'paternity'
  | 'emergency'
  | 'unpaid'
  | 'bereavement'
  | 'study';

export interface LeaveTypeConfig {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  icon: LucideIcon;
  defaultAllowance: number;
  carryForwardLimit: number;
  requiresApproval: boolean;
  requiresDocumentation: boolean;
  minNoticeDays: number;
}

export const leaveTypeConfig: Record<LeaveType, LeaveTypeConfig> = {
  casual: {
    label: 'Casual Leave',
    description: 'For personal or casual needs',
    color: 'blue',
    bgColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    icon: Home,
    defaultAllowance: 12,
    carryForwardLimit: 3,
    requiresApproval: true,
    requiresDocumentation: false,
    minNoticeDays: 1,
  },
  sick: {
    label: 'Sick Leave',
    description: 'For illness or medical reasons',
    color: 'red',
    bgColor: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    icon: Heart,
    defaultAllowance: 10,
    carryForwardLimit: 0,
    requiresApproval: true,
    requiresDocumentation: true,
    minNoticeDays: 0,
  },
  annual: {
    label: 'Annual Leave',
    description: 'Yearly vacation entitlement',
    color: 'emerald',
    bgColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
    icon: Plane,
    defaultAllowance: 15,
    carryForwardLimit: 5,
    requiresApproval: true,
    requiresDocumentation: false,
    minNoticeDays: 7,
  },
  maternity: {
    label: 'Maternity Leave',
    description: 'For expecting mothers',
    color: 'pink',
    bgColor: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
    icon: Baby,
    defaultAllowance: 182,
    carryForwardLimit: 0,
    requiresApproval: true,
    requiresDocumentation: true,
    minNoticeDays: 30,
  },
  paternity: {
    label: 'Paternity Leave',
    description: 'For new fathers',
    color: 'indigo',
    bgColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
    icon: Baby,
    defaultAllowance: 15,
    carryForwardLimit: 0,
    requiresApproval: true,
    requiresDocumentation: true,
    minNoticeDays: 15,
  },
  emergency: {
    label: 'Emergency Leave',
    description: 'For urgent unforeseen situations',
    color: 'orange',
    bgColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    icon: AlertTriangle,
    defaultAllowance: 3,
    carryForwardLimit: 0,
    requiresApproval: true,
    requiresDocumentation: false,
    minNoticeDays: 0,
  },
  unpaid: {
    label: 'Unpaid Leave',
    description: 'Leave without pay',
    color: 'slate',
    bgColor: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
    icon: Calendar,
    defaultAllowance: 0,
    carryForwardLimit: 0,
    requiresApproval: true,
    requiresDocumentation: false,
    minNoticeDays: 3,
  },
  bereavement: {
    label: 'Bereavement Leave',
    description: 'For loss of family member',
    color: 'gray',
    bgColor: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    icon: Heart,
    defaultAllowance: 5,
    carryForwardLimit: 0,
    requiresApproval: true,
    requiresDocumentation: true,
    minNoticeDays: 0,
  },
  study: {
    label: 'Study Leave',
    description: 'For educational pursuits',
    color: 'purple',
    bgColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    icon: GraduationCap,
    defaultAllowance: 5,
    carryForwardLimit: 0,
    requiresApproval: true,
    requiresDocumentation: true,
    minNoticeDays: 14,
  },
};

// ============================================================================
// Leave Request Status Configuration
// ============================================================================

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'partially_approved';

export interface LeaveRequestStatusConfig {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  icon: LucideIcon;
  isTerminal: boolean;
}

export const leaveRequestStatusConfig: Record<LeaveRequestStatus, LeaveRequestStatusConfig> = {
  pending: {
    label: 'Pending',
    description: 'Awaiting approval',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    icon: Clock,
    isTerminal: false,
  },
  approved: {
    label: 'Approved',
    description: 'Leave request approved',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
    icon: CheckCircle,
    isTerminal: true,
  },
  rejected: {
    label: 'Rejected',
    description: 'Leave request rejected',
    color: 'text-red-600',
    bgColor: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    icon: XCircle,
    isTerminal: true,
  },
  cancelled: {
    label: 'Cancelled',
    description: 'Leave request cancelled',
    color: 'text-slate-600',
    bgColor: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
    icon: XCircle,
    isTerminal: true,
  },
  partially_approved: {
    label: 'Partially Approved',
    description: 'Some days approved',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    icon: AlertCircle,
    isTerminal: true,
  },
};

// ============================================================================
// Attendance Status Configuration
// ============================================================================

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'on_leave' | 'work_from_home' | 'holiday';

export interface AttendanceStatusConfig {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  icon: LucideIcon;
  countsAsPresent: boolean;
}

export const attendanceStatusConfig: Record<AttendanceStatus, AttendanceStatusConfig> = {
  present: {
    label: 'Present',
    description: 'Employee attended work',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
    icon: CheckCircle,
    countsAsPresent: true,
  },
  absent: {
    label: 'Absent',
    description: 'Employee did not attend',
    color: 'text-red-600',
    bgColor: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    icon: XCircle,
    countsAsPresent: false,
  },
  late: {
    label: 'Late',
    description: 'Arrived after grace period',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    icon: AlertTriangle,
    countsAsPresent: true,
  },
  half_day: {
    label: 'Half Day',
    description: 'Worked partial day',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    icon: Pause,
    countsAsPresent: true,
  },
  on_leave: {
    label: 'On Leave',
    description: 'Approved leave',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    icon: Plane,
    countsAsPresent: false,
  },
  work_from_home: {
    label: 'Work from Home',
    description: 'Working remotely',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    icon: Home,
    countsAsPresent: true,
  },
  holiday: {
    label: 'Holiday',
    description: 'Public or company holiday',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
    icon: Star,
    countsAsPresent: false,
  },
};

// ============================================================================
// Shift Type Configuration
// ============================================================================

export type ShiftType = 'regular' | 'morning' | 'evening' | 'night' | 'weekend' | 'flexible' | 'rotational';

export interface ShiftTypeConfig {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  icon: LucideIcon;
  defaultStartTime: string;
  defaultEndTime: string;
  workingHours: number;
}

export const shiftTypeConfig: Record<ShiftType, ShiftTypeConfig> = {
  regular: {
    label: 'Regular',
    description: 'Standard 9-6 shift',
    color: 'blue',
    bgColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    icon: Sun,
    defaultStartTime: '09:00',
    defaultEndTime: '18:00',
    workingHours: 8,
  },
  morning: {
    label: 'Morning',
    description: 'Early morning shift',
    color: 'amber',
    bgColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    icon: Sunrise,
    defaultStartTime: '06:00',
    defaultEndTime: '14:00',
    workingHours: 8,
  },
  evening: {
    label: 'Evening',
    description: 'Afternoon to evening shift',
    color: 'orange',
    bgColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    icon: Sun,
    defaultStartTime: '14:00',
    defaultEndTime: '22:00',
    workingHours: 8,
  },
  night: {
    label: 'Night',
    description: 'Overnight shift',
    color: 'indigo',
    bgColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
    icon: Moon,
    defaultStartTime: '22:00',
    defaultEndTime: '06:00',
    workingHours: 8,
  },
  weekend: {
    label: 'Weekend',
    description: 'Saturday/Sunday shift',
    color: 'purple',
    bgColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    icon: Calendar,
    defaultStartTime: '10:00',
    defaultEndTime: '18:00',
    workingHours: 8,
  },
  flexible: {
    label: 'Flexible',
    description: 'Flexible work hours',
    color: 'emerald',
    bgColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
    icon: Timer,
    defaultStartTime: '00:00',
    defaultEndTime: '23:59',
    workingHours: 8,
  },
  rotational: {
    label: 'Rotational',
    description: 'Rotating shifts',
    color: 'teal',
    bgColor: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
    icon: Timer,
    defaultStartTime: '00:00',
    defaultEndTime: '00:00',
    workingHours: 8,
  },
};

// ============================================================================
// Employee Status Configuration
// ============================================================================

export type EmployeeStatus = 'active' | 'on_probation' | 'on_leave' | 'resigned' | 'terminated' | 'retired';

export interface EmployeeStatusConfig {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  icon: LucideIcon;
  isActive: boolean;
}

export const employeeStatusConfig: Record<EmployeeStatus, EmployeeStatusConfig> = {
  active: {
    label: 'Active',
    description: 'Currently employed',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
    icon: CheckCircle,
    isActive: true,
  },
  on_probation: {
    label: 'Probation',
    description: 'On probation period',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    icon: Clock,
    isActive: true,
  },
  on_leave: {
    label: 'On Leave',
    description: 'On extended leave',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    icon: Plane,
    isActive: true,
  },
  resigned: {
    label: 'Resigned',
    description: 'Voluntarily left',
    color: 'text-slate-600',
    bgColor: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
    icon: XCircle,
    isActive: false,
  },
  terminated: {
    label: 'Terminated',
    description: 'Employment ended',
    color: 'text-red-600',
    bgColor: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    icon: XCircle,
    isActive: false,
  },
  retired: {
    label: 'Retired',
    description: 'Reached retirement',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    icon: Award,
    isActive: false,
  },
};

// ============================================================================
// Performance Rating Configuration
// ============================================================================

export type PerformanceRating = 'exceptional' | 'exceeds' | 'meets' | 'needs_improvement' | 'unsatisfactory';

export interface PerformanceRatingConfig {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  icon: LucideIcon;
  score: number;
  maxScore: number;
}

export const performanceRatingConfig: Record<PerformanceRating, PerformanceRatingConfig> = {
  exceptional: {
    label: 'Exceptional',
    description: 'Outstanding performance',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
    icon: Star,
    score: 5,
    maxScore: 5,
  },
  exceeds: {
    label: 'Exceeds Expectations',
    description: 'Above average performance',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    icon: TrendingUp,
    score: 4,
    maxScore: 5,
  },
  meets: {
    label: 'Meets Expectations',
    description: 'Satisfactory performance',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    icon: Minus,
    score: 3,
    maxScore: 5,
  },
  needs_improvement: {
    label: 'Needs Improvement',
    description: 'Below expectations',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    icon: TrendingDown,
    score: 2,
    maxScore: 5,
  },
  unsatisfactory: {
    label: 'Unsatisfactory',
    description: 'Poor performance',
    color: 'text-red-600',
    bgColor: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    icon: XCircle,
    score: 1,
    maxScore: 5,
  },
};

// ============================================================================
// Training Status Configuration
// ============================================================================

export type TrainingStatus = 'not_started' | 'in_progress' | 'completed' | 'failed' | 'expired';

export interface TrainingStatusConfig {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  icon: LucideIcon;
  isComplete: boolean;
}

export const trainingStatusConfig: Record<TrainingStatus, TrainingStatusConfig> = {
  not_started: {
    label: 'Not Started',
    description: 'Training not yet begun',
    color: 'text-slate-600',
    bgColor: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
    icon: Clock,
    isComplete: false,
  },
  in_progress: {
    label: 'In Progress',
    description: 'Currently undergoing training',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    icon: Timer,
    isComplete: false,
  },
  completed: {
    label: 'Completed',
    description: 'Training successfully completed',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
    icon: CheckCircle,
    isComplete: true,
  },
  failed: {
    label: 'Failed',
    description: 'Training not passed',
    color: 'text-red-600',
    bgColor: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    icon: XCircle,
    isComplete: true,
  },
  expired: {
    label: 'Expired',
    description: 'Training certification expired',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    icon: AlertTriangle,
    isComplete: true,
  },
};

// ============================================================================
// Department Configuration
// ============================================================================

export type Department =
  | 'operations'
  | 'sales'
  | 'quality'
  | 'admin'
  | 'hr'
  | 'finance'
  | 'technology'
  | 'management';

export interface DepartmentConfig {
  label: string;
  description: string;
  color: string;
  icon: LucideIcon;
}

export const departmentConfig: Record<Department, DepartmentConfig> = {
  operations: {
    label: 'Operations',
    description: 'Day-to-day operations',
    color: 'blue',
    icon: Briefcase,
  },
  sales: {
    label: 'Sales',
    description: 'Sales and business development',
    color: 'emerald',
    icon: TrendingUp,
  },
  quality: {
    label: 'Quality',
    description: 'Quality control and assurance',
    color: 'purple',
    icon: CheckCircle,
  },
  admin: {
    label: 'Admin',
    description: 'Administrative functions',
    color: 'amber',
    icon: Building2,
  },
  hr: {
    label: 'HR',
    description: 'Human resources',
    color: 'pink',
    icon: Users,
  },
  finance: {
    label: 'Finance',
    description: 'Finance and accounting',
    color: 'teal',
    icon: Wallet,
  },
  technology: {
    label: 'Technology',
    description: 'IT and development',
    color: 'indigo',
    icon: Settings,
  },
  management: {
    label: 'Management',
    description: 'Leadership and management',
    color: 'orange',
    icon: Target,
  },
};

// ============================================================================
// Navigation Configuration
// ============================================================================

export interface HRNavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
}

export const hrNavigation: HRNavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/hr',
    icon: BarChart,
    description: 'HR overview',
  },
  {
    id: 'employees',
    label: 'Employees',
    href: '/hr/employees',
    icon: Users,
    description: 'Employee directory',
  },
  {
    id: 'attendance',
    label: 'Attendance',
    href: '/hr/attendance',
    icon: Clock,
    description: 'Attendance tracking',
  },
  {
    id: 'leave',
    label: 'Leave Management',
    href: '/hr/leave',
    icon: Calendar,
    description: 'Leave requests and balances',
  },
  {
    id: 'performance',
    label: 'Performance',
    href: '/hr/performance',
    icon: Target,
    description: 'Performance reviews',
  },
  {
    id: 'training',
    label: 'Training',
    href: '/hr/training',
    icon: GraduationCap,
    description: 'Training programs',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    href: '/hr/analytics',
    icon: BarChart,
    description: 'HR analytics',
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/hr/settings',
    icon: Settings,
    description: 'HR configuration',
  },
];

// ============================================================================
// HR Metrics Configuration
// ============================================================================

export interface HRMetricConfig {
  id: string;
  label: string;
  description: string;
  format: 'number' | 'percentage' | 'currency' | 'duration';
  icon: LucideIcon;
}

export const hrMetrics: HRMetricConfig[] = [
  {
    id: 'total_employees',
    label: 'Total Employees',
    description: 'Current headcount',
    format: 'number',
    icon: Users,
  },
  {
    id: 'attendance_rate',
    label: 'Attendance Rate',
    description: 'Average attendance',
    format: 'percentage',
    icon: CheckCircle,
  },
  {
    id: 'leave_utilization',
    label: 'Leave Utilization',
    description: 'Leave used vs available',
    format: 'percentage',
    icon: Calendar,
  },
  {
    id: 'avg_tenure',
    label: 'Avg Tenure',
    description: 'Average employee tenure',
    format: 'duration',
    icon: Clock,
  },
  {
    id: 'turnover_rate',
    label: 'Turnover Rate',
    description: 'Employee turnover',
    format: 'percentage',
    icon: TrendingDown,
  },
  {
    id: 'training_completion',
    label: 'Training Completion',
    description: 'Training completion rate',
    format: 'percentage',
    icon: GraduationCap,
  },
];

// ============================================================================
// Utility Functions
// ============================================================================

export function calculateLeaveDays(startDate: Date | string, endDate: Date | string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

export function calculateWorkingHours(checkIn: string, checkOut: string, breakMinutes: number = 0): number {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(`2000-01-01T${checkIn}`);
  const end = new Date(`2000-01-01T${checkOut}`);
  const diffMs = end.getTime() - start.getTime();
  const hours = diffMs / (1000 * 60 * 60) - breakMinutes / 60;
  return Math.max(0, hours);
}

export function isLateArrival(checkInTime: string, shiftStartTime: string, graceMinutes: number = 15): boolean {
  if (!checkInTime || !shiftStartTime) return false;
  const checkIn = new Date(`2000-01-01T${checkInTime}`);
  const shiftStart = new Date(`2000-01-01T${shiftStartTime}`);
  const graceMs = graceMinutes * 60 * 1000;
  return checkIn.getTime() > shiftStart.getTime() + graceMs;
}

export function formatDuration(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function getLeaveBalance(totalDays: number, usedDays: number): { remaining: number; percentage: number } {
  const remaining = Math.max(0, totalDays - usedDays);
  const percentage = totalDays > 0 ? (usedDays / totalDays) * 100 : 0;
  return { remaining, percentage };
}

export function getEmployeeInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getAttendancePercentage(presentDays: number, totalDays: number): number {
  if (totalDays === 0) return 0;
  return Math.round((presentDays / totalDays) * 100);
}
