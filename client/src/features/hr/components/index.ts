// HR Components - Public API

// Page Components
export { default as AttendanceManagement } from './AttendanceManagement';
export { default as HRAnalytics } from './HRAnalytics';
export { default as LeaveManagement } from './LeaveManagement';
export { default as PerformanceManagement } from './PerformanceManagement';
export { default as TrainingManagement } from './TrainingManagement';

// Leave Components
export {
  LeaveTypeBadge,
  LeaveRequestStatusBadge,
  LeaveDurationBadge,
  LeaveBalanceProgress,
  LeaveBalanceCard,
  LeaveRequestCard,
  LeaveRequestList,
  LeaveCalendarDay,
  LeaveSummaryStats,
} from './LeaveStatusBadge';

// Attendance Components
export {
  AttendanceStatusBadge,
  ShiftTypeBadge,
  TimeDisplay,
  WorkingHoursDisplay,
  LocationBadge,
  AttendanceRecordCard,
  AttendanceSummaryCard,
  WeeklyAttendanceChart,
  DepartmentAttendance,
} from './AttendanceStatusBadge';

// Employee Components
export {
  EmployeeStatusBadge,
  DepartmentBadge,
  PerformanceRatingBadge,
  TrainingStatusBadge,
  TenureDisplay,
  EmployeeAvatar,
  EmployeeCard,
  EmployeeList,
  EmployeeStatsCard,
  TrainingProgressCard,
} from './EmployeeCard';
