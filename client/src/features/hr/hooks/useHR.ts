/**
 * useHR Hook
 *
 * Custom hooks for HR features:
 * - Employee Management
 * - Attendance Tracking
 * - Leave Management
 * - Performance Reviews
 * - Training Management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type LeaveType,
  type LeaveRequestStatus,
  type AttendanceStatus,
  type EmployeeStatus,
  type Department,
  type ShiftType,
  type PerformanceRating,
  type TrainingStatus,
} from '../config';

// ============================================================================
// Types
// ============================================================================

export interface Employee {
  id: number;
  employeeId: string;
  tenantId: string | null;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  department: Department | string;
  status: EmployeeStatus | string;
  joinDate: string;
  location: string | null;
  imageUrl: string | null;
  reportingTo: number | null;
  reportingToName?: string;
  salary?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRequest {
  id: number;
  employeeId: number;
  employeeName?: string;
  employeeDepartment?: string;
  employeeRole?: string;
  leaveType: LeaveType | string;
  status: LeaveRequestStatus | string;
  startDate: string;
  endDate: string;
  reason: string | null;
  appliedDate: string;
  isEmergency: boolean;
  contactDuringLeave: string | null;
  workHandoverNotes: string | null;
  approvedBy: number | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveBalance {
  id: number;
  employeeId: number;
  leaveType: LeaveType | string;
  totalDays: number;
  usedDays: number;
  carryForward: number;
  year: number;
}

export interface AttendanceRecord {
  id: number;
  employeeId: number;
  employeeName?: string;
  employeeDepartment?: string;
  employeeRole?: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceStatus | string;
  breakMinutes: number;
  location: string | null;
  notes: string | null;
  shiftType: ShiftType | string | null;
}

export interface Shift {
  id: number;
  employeeId: number;
  employeeName?: string;
  shiftType: ShiftType | string;
  startTime: string;
  endTime: string;
  workingDays: string[];
  effectiveDate: string;
  endDate: string | null;
}

export interface PerformanceReview {
  id: number;
  employeeId: number;
  employeeName?: string;
  reviewPeriod: string;
  reviewDate: string;
  reviewerId: number;
  reviewerName?: string;
  overallRating: PerformanceRating | string;
  goals: Array<{ title: string; status: string; weight: number }>;
  strengths: string[];
  areasForImprovement: string[];
  comments: string | null;
  status: 'draft' | 'submitted' | 'acknowledged';
}

export interface Training {
  id: number;
  name: string;
  description: string | null;
  category: string;
  durationHours: number;
  isMandatory: boolean;
  validityMonths: number | null;
}

export interface EmployeeTraining {
  id: number;
  employeeId: number;
  trainingId: number;
  trainingName?: string;
  status: TrainingStatus | string;
  progress: number;
  assignedDate: string;
  dueDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  score: number | null;
}

export interface HRMetrics {
  totalEmployees: number;
  activeEmployees: number;
  onProbation: number;
  onLeave: number;
  newHiresThisMonth: number;
  turnoverRate: number;
  attendanceRate: number;
  leaveUtilization: number;
  trainingCompletion: number;
}

// ============================================================================
// API Functions
// ============================================================================

const API_BASE = '/api/hr';

// Employee APIs
async function fetchEmployees(params?: {
  department?: Department | string;
  status?: EmployeeStatus | string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: Employee[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
  const searchParams = new URLSearchParams();
  if (params?.department) searchParams.set('department', params.department);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());

  const response = await fetch(`${API_BASE}/employees?${searchParams}`);
  if (!response.ok) throw new Error('Failed to fetch employees');
  return response.json();
}

async function fetchEmployee(id: number): Promise<Employee> {
  const response = await fetch(`${API_BASE}/employees/${id}`);
  if (!response.ok) throw new Error('Failed to fetch employee');
  return response.json();
}

async function createEmployee(data: Partial<Employee>): Promise<Employee> {
  const response = await fetch(`${API_BASE}/employees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create employee');
  return response.json();
}

async function updateEmployee(id: number, data: Partial<Employee>): Promise<Employee> {
  const response = await fetch(`${API_BASE}/employees/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update employee');
  return response.json();
}

// Leave APIs
async function fetchLeaveRequests(params?: {
  status?: LeaveRequestStatus | string;
  type?: LeaveType | string;
  employeeId?: number;
  page?: number;
  limit?: number;
}): Promise<{ data: LeaveRequest[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.type) searchParams.set('type', params.type);
  if (params?.employeeId) searchParams.set('employeeId', params.employeeId.toString());
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());

  const response = await fetch(`${API_BASE}/leave/requests?${searchParams}`);
  if (!response.ok) throw new Error('Failed to fetch leave requests');
  return response.json();
}

async function createLeaveRequest(data: Partial<LeaveRequest>): Promise<LeaveRequest> {
  const response = await fetch(`${API_BASE}/leave/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create leave request');
  return response.json();
}

async function approveLeaveRequest(id: number): Promise<LeaveRequest> {
  const response = await fetch(`${API_BASE}/leave/requests/${id}/approve`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to approve leave request');
  return response.json();
}

async function rejectLeaveRequest(id: number, reason: string): Promise<LeaveRequest> {
  const response = await fetch(`${API_BASE}/leave/requests/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) throw new Error('Failed to reject leave request');
  return response.json();
}

async function fetchLeaveBalances(employeeId?: number): Promise<LeaveBalance[]> {
  const searchParams = new URLSearchParams();
  if (employeeId) searchParams.set('employeeId', employeeId.toString());

  const response = await fetch(`${API_BASE}/leave/balances?${searchParams}`);
  if (!response.ok) throw new Error('Failed to fetch leave balances');
  return response.json();
}

// Attendance APIs
async function fetchAttendance(params?: {
  date?: string;
  employeeId?: number;
  status?: AttendanceStatus | string;
}): Promise<AttendanceRecord[]> {
  const searchParams = new URLSearchParams();
  if (params?.date) searchParams.set('date', params.date);
  if (params?.employeeId) searchParams.set('employeeId', params.employeeId.toString());
  if (params?.status) searchParams.set('status', params.status);

  const response = await fetch(`${API_BASE}/attendance?${searchParams}`);
  if (!response.ok) throw new Error('Failed to fetch attendance');
  return response.json();
}

async function markAttendance(data: Partial<AttendanceRecord>): Promise<AttendanceRecord> {
  const response = await fetch(`${API_BASE}/attendance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to mark attendance');
  return response.json();
}

async function updateAttendance(id: number, data: Partial<AttendanceRecord>): Promise<AttendanceRecord> {
  const response = await fetch(`${API_BASE}/attendance/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update attendance');
  return response.json();
}

// Shift APIs
async function fetchShifts(employeeId?: number): Promise<Shift[]> {
  const searchParams = new URLSearchParams();
  if (employeeId) searchParams.set('employeeId', employeeId.toString());

  const response = await fetch(`${API_BASE}/shifts?${searchParams}`);
  if (!response.ok) throw new Error('Failed to fetch shifts');
  return response.json();
}

async function createShift(data: Partial<Shift>): Promise<Shift> {
  const response = await fetch(`${API_BASE}/shifts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create shift');
  return response.json();
}

// Performance APIs
async function fetchPerformanceReviews(employeeId?: number): Promise<PerformanceReview[]> {
  const searchParams = new URLSearchParams();
  if (employeeId) searchParams.set('employeeId', employeeId.toString());

  const response = await fetch(`${API_BASE}/performance/reviews?${searchParams}`);
  if (!response.ok) throw new Error('Failed to fetch performance reviews');
  return response.json();
}

async function createPerformanceReview(data: Partial<PerformanceReview>): Promise<PerformanceReview> {
  const response = await fetch(`${API_BASE}/performance/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create performance review');
  return response.json();
}

// Training APIs
async function fetchTrainings(): Promise<Training[]> {
  const response = await fetch(`${API_BASE}/trainings`);
  if (!response.ok) throw new Error('Failed to fetch trainings');
  return response.json();
}

async function fetchEmployeeTrainings(employeeId: number): Promise<EmployeeTraining[]> {
  const response = await fetch(`${API_BASE}/employees/${employeeId}/trainings`);
  if (!response.ok) throw new Error('Failed to fetch employee trainings');
  return response.json();
}

async function assignTraining(employeeId: number, trainingId: number): Promise<EmployeeTraining> {
  const response = await fetch(`${API_BASE}/employees/${employeeId}/trainings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trainingId }),
  });
  if (!response.ok) throw new Error('Failed to assign training');
  return response.json();
}

// Metrics API
async function fetchHRMetrics(): Promise<HRMetrics> {
  const response = await fetch(`${API_BASE}/metrics`);
  if (!response.ok) throw new Error('Failed to fetch HR metrics');
  return response.json();
}

// ============================================================================
// Query Keys
// ============================================================================

export const hrQueryKeys = {
  all: ['hr'] as const,
  employees: () => [...hrQueryKeys.all, 'employees'] as const,
  employeesList: (params?: Record<string, unknown>) => [...hrQueryKeys.employees(), 'list', params] as const,
  employee: (id: number) => [...hrQueryKeys.employees(), id] as const,
  leaveRequests: () => [...hrQueryKeys.all, 'leave-requests'] as const,
  leaveRequestsList: (params?: Record<string, unknown>) => [...hrQueryKeys.leaveRequests(), 'list', params] as const,
  leaveBalances: (employeeId?: number) => [...hrQueryKeys.all, 'leave-balances', employeeId] as const,
  attendance: (params?: Record<string, unknown>) => [...hrQueryKeys.all, 'attendance', params] as const,
  shifts: (employeeId?: number) => [...hrQueryKeys.all, 'shifts', employeeId] as const,
  performanceReviews: (employeeId?: number) => [...hrQueryKeys.all, 'performance', employeeId] as const,
  trainings: () => [...hrQueryKeys.all, 'trainings'] as const,
  employeeTrainings: (employeeId: number) => [...hrQueryKeys.all, 'employee-trainings', employeeId] as const,
  metrics: () => [...hrQueryKeys.all, 'metrics'] as const,
};

// ============================================================================
// Employee Hooks
// ============================================================================

export function useEmployees(params?: {
  department?: Department | string;
  status?: EmployeeStatus | string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: hrQueryKeys.employeesList(params),
    queryFn: () => fetchEmployees(params),
  });
}

export function useEmployee(id: number) {
  return useQuery({
    queryKey: hrQueryKeys.employee(id),
    queryFn: () => fetchEmployee(id),
    enabled: id > 0,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrQueryKeys.employees() });
      queryClient.invalidateQueries({ queryKey: hrQueryKeys.metrics() });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Employee> }) => updateEmployee(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: hrQueryKeys.employee(id) });
      queryClient.invalidateQueries({ queryKey: hrQueryKeys.employees() });
    },
  });
}

// ============================================================================
// Leave Hooks
// ============================================================================

export function useLeaveRequests(params?: {
  status?: LeaveRequestStatus | string;
  type?: LeaveType | string;
  employeeId?: number;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: hrQueryKeys.leaveRequestsList(params),
    queryFn: () => fetchLeaveRequests(params),
  });
}

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createLeaveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrQueryKeys.leaveRequests() });
    },
  });
}

export function useApproveLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approveLeaveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrQueryKeys.leaveRequests() });
      queryClient.invalidateQueries({ queryKey: hrQueryKeys.leaveBalances() });
    },
  });
}

export function useRejectLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => rejectLeaveRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrQueryKeys.leaveRequests() });
    },
  });
}

export function useLeaveBalances(employeeId?: number) {
  return useQuery({
    queryKey: hrQueryKeys.leaveBalances(employeeId),
    queryFn: () => fetchLeaveBalances(employeeId),
  });
}

// ============================================================================
// Attendance Hooks
// ============================================================================

export function useAttendance(params?: {
  date?: string;
  employeeId?: number;
  status?: AttendanceStatus | string;
}) {
  return useQuery({
    queryKey: hrQueryKeys.attendance(params),
    queryFn: () => fetchAttendance(params),
  });
}

export function useMarkAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAttendance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrQueryKeys.attendance() });
      queryClient.invalidateQueries({ queryKey: hrQueryKeys.metrics() });
    },
  });
}

export function useUpdateAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AttendanceRecord> }) => updateAttendance(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrQueryKeys.attendance() });
    },
  });
}

// ============================================================================
// Shift Hooks
// ============================================================================

export function useShifts(employeeId?: number) {
  return useQuery({
    queryKey: hrQueryKeys.shifts(employeeId),
    queryFn: () => fetchShifts(employeeId),
  });
}

export function useCreateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrQueryKeys.shifts() });
    },
  });
}

// ============================================================================
// Performance Hooks
// ============================================================================

export function usePerformanceReviews(employeeId?: number) {
  return useQuery({
    queryKey: hrQueryKeys.performanceReviews(employeeId),
    queryFn: () => fetchPerformanceReviews(employeeId),
  });
}

export function useCreatePerformanceReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPerformanceReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrQueryKeys.performanceReviews() });
    },
  });
}

// ============================================================================
// Training Hooks
// ============================================================================

export function useTrainings() {
  return useQuery({
    queryKey: hrQueryKeys.trainings(),
    queryFn: fetchTrainings,
  });
}

export function useEmployeeTrainings(employeeId: number) {
  return useQuery({
    queryKey: hrQueryKeys.employeeTrainings(employeeId),
    queryFn: () => fetchEmployeeTrainings(employeeId),
    enabled: employeeId > 0,
  });
}

export function useAssignTraining() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ employeeId, trainingId }: { employeeId: number; trainingId: number }) =>
      assignTraining(employeeId, trainingId),
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({ queryKey: hrQueryKeys.employeeTrainings(employeeId) });
    },
  });
}

// ============================================================================
// Metrics Hooks
// ============================================================================

export function useHRMetrics() {
  return useQuery({
    queryKey: hrQueryKeys.metrics(),
    queryFn: fetchHRMetrics,
  });
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Returns pending leave requests for approval
 */
export function usePendingLeaveRequests() {
  return useLeaveRequests({ status: 'pending' });
}

/**
 * Returns today's attendance
 */
export function useTodayAttendance() {
  const today = new Date().toISOString().split('T')[0];
  return useAttendance({ date: today });
}

/**
 * Returns employees on leave today
 */
export function useEmployeesOnLeaveToday() {
  const today = new Date().toISOString().split('T')[0];
  return useAttendance({ date: today, status: 'on_leave' });
}
