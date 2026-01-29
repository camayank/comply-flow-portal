/**
 * UNIFIED DATA HOOKS
 *
 * Central data access layer for all frontend components.
 * Ensures data consistency by routing all queries through the
 * same Core Data Engine API endpoints.
 *
 * Key Benefits:
 * - Single source of truth for all service data
 * - Role-based filtering happens on the server
 * - Consistent caching via React Query
 * - Real-time updates across all views
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// ============================================================================
// TYPES
// ============================================================================

export interface UserContext {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    roleDisplay: string;
  };
  entity: {
    id: number;
    name: string;
    clientId: string;
    type: string;
  } | null;
  permissions: string[];
  capabilities: string[];
}

export interface ServiceRequest {
  id: number;
  serviceKey: string;
  serviceName: string;
  serviceCategory: string;
  status: string;
  priority: string;
  progress: number;
  slaStatus: string;
  slaDeadline: string | null;
  assigneeId: number | null;
  assigneeName: string | null;
  clientName: string | null;
  businessEntityId: number;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalRequests: number;
  activeRequests: number;
  completedRequests: number;
  pendingActions: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  slaSummary: {
    onTrack: number;
    atRisk: number;
    breached: number;
  };
}

export interface ComplianceData {
  overallScore?: number;
  status?: string;
  upcomingDeadlines?: any[];
  recentFilings?: any[];
  pendingActions?: any[];
  atRiskClients?: number;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  href: string;
}

// ============================================================================
// DASHBOARD HOOKS
// ============================================================================

/**
 * Main dashboard data - returns role-appropriate dashboard
 * This is the primary hook for loading dashboard screens
 */
export function useDashboard() {
  return useQuery<{
    success: boolean;
    role: string;
    timestamp: string;
    data: any;
  }>({
    queryKey: ["/api/dashboard"],
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Dashboard statistics - aggregated metrics based on role
 */
export function useDashboardStats() {
  return useQuery<{
    success: boolean;
    role: string;
    stats: DashboardStats;
  }>({
    queryKey: ["/api/dashboard/stats"],
    staleTime: 60000, // 1 minute
  });
}

/**
 * Quick actions - role-specific shortcuts
 */
export function useQuickActions() {
  return useQuery<{
    success: boolean;
    actions: QuickAction[];
  }>({
    queryKey: ["/api/dashboard/quick-actions"],
    staleTime: 300000, // 5 minutes (doesn't change often)
  });
}

/**
 * User context - current user info and permissions
 */
export function useUserContext() {
  return useQuery<{
    success: boolean;
    context: UserContext;
  }>({
    queryKey: ["/api/dashboard/context"],
    staleTime: 300000, // 5 minutes
  });
}

// ============================================================================
// SERVICE REQUEST HOOKS
// ============================================================================

export interface ServiceRequestFilters {
  status?: string;
  serviceKey?: string;
  category?: string;
  priority?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Fetch service requests with role-based filtering
 * Clients see their own, Ops see team's, Admins see all
 */
export function useServiceRequests(filters: ServiceRequestFilters = {}) {
  const queryString = new URLSearchParams();

  if (filters.status) queryString.set("status", filters.status);
  if (filters.serviceKey) queryString.set("serviceKey", filters.serviceKey);
  if (filters.category) queryString.set("category", filters.category);
  if (filters.priority) queryString.set("priority", filters.priority);
  if (filters.search) queryString.set("search", filters.search);
  if (filters.page) queryString.set("page", String(filters.page));
  if (filters.limit) queryString.set("limit", String(filters.limit));
  if (filters.sortBy) queryString.set("sortBy", filters.sortBy);
  if (filters.sortOrder) queryString.set("sortOrder", filters.sortOrder);

  const queryStr = queryString.toString();
  const url = queryStr ? `/api/dashboard/requests?${queryStr}` : "/api/dashboard/requests";

  return useQuery<{
    success: boolean;
    requests: ServiceRequest[];
    total: number;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>({
    queryKey: ["/api/dashboard/requests", filters],
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Fetch single service request detail
 */
export function useServiceRequest(id: number | null) {
  return useQuery<{
    success: boolean;
    data: ServiceRequest;
  }>({
    queryKey: ["/api/dashboard/requests", id],
    enabled: id !== null,
    staleTime: 30000,
  });
}

// ============================================================================
// SERVICES CATALOG HOOKS
// ============================================================================

export interface ServicesFilters {
  category?: string;
  search?: string;
  activeOnly?: boolean;
}

/**
 * Fetch services catalog
 */
export function useServices(filters: ServicesFilters = {}) {
  const queryString = new URLSearchParams();

  if (filters.category) queryString.set("category", filters.category);
  if (filters.search) queryString.set("search", filters.search);
  if (filters.activeOnly !== undefined) {
    queryString.set("activeOnly", String(filters.activeOnly));
  }

  const queryStr = queryString.toString();
  const url = queryStr ? `/api/dashboard/services?${queryStr}` : "/api/dashboard/services";

  return useQuery<{
    success: boolean;
    total: number;
    services: any[];
    byCategory: Record<string, any[]>;
    categories: string[];
  }>({
    queryKey: ["/api/dashboard/services", filters],
    staleTime: 300000, // 5 minutes
  });
}

// ============================================================================
// COMPLIANCE HOOKS
// ============================================================================

/**
 * Fetch compliance status (varies by role)
 */
export function useComplianceStatus() {
  return useQuery<{
    success: boolean;
    role: string;
    compliance: ComplianceData;
  }>({
    queryKey: ["/api/dashboard/compliance"],
    staleTime: 60000, // 1 minute
  });
}

// ============================================================================
// ACTIVITY & NOTIFICATIONS HOOKS
// ============================================================================

/**
 * Fetch recent activity feed
 */
export function useActivityFeed(limit: number = 20) {
  return useQuery<{
    success: boolean;
    activities: any[];
    total: number;
  }>({
    queryKey: ["/api/dashboard/activity", { limit }],
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Fetch notifications
 */
export function useNotifications(unreadOnly: boolean = false) {
  return useQuery<{
    success: boolean;
    notifications: any[];
    unreadCount: number;
  }>({
    queryKey: ["/api/dashboard/notifications", { unreadOnly }],
    staleTime: 30000, // 30 seconds
  });
}

// ============================================================================
// SEARCH HOOKS
// ============================================================================

/**
 * Unified search across entities
 */
export function useUnifiedSearch(query: string, type: string = "all") {
  return useQuery<{
    success: boolean;
    query: string;
    results: any[];
    total: number;
  }>({
    queryKey: ["/api/dashboard/search", { q: query, type }],
    enabled: query.length >= 2,
    staleTime: 30000,
  });
}

// ============================================================================
// MUTATION HOOKS FOR DATA CONSISTENCY
// ============================================================================

/**
 * Helper to invalidate related queries after mutations
 */
export function useInvalidateRelated() {
  const queryClient = useQueryClient();

  return {
    invalidateServiceRequests: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
  };
}

/**
 * Create service request mutation
 */
export function useCreateServiceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to create service request");
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all related queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
  });
}

/**
 * Update service request status mutation
 */
export function useUpdateServiceRequestStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status: string; notes?: string }) => {
      const response = await fetch(`/api/service-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update service request");
      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate specific request and related queries
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/requests", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
  });
}

// ============================================================================
// REAL-TIME SUBSCRIPTION (Future enhancement)
// ============================================================================

/**
 * Subscribe to real-time updates for a specific entity
 * This would use WebSocket or SSE in production
 */
export function useRealtimeUpdates(entityType: string, entityId?: number) {
  // Placeholder for real-time updates
  // In production, this would establish a WebSocket connection
  // or use Server-Sent Events (SSE) to receive push updates
  return {
    isConnected: false,
    lastUpdate: null,
  };
}

// ============================================================================
// DATA CONSISTENCY UTILITIES
// ============================================================================

/**
 * Hook to ensure all dashboard components receive consistent data
 * Use this when rendering multiple components that need the same data
 */
export function useConsistentDashboardData() {
  const dashboard = useDashboard();
  const stats = useDashboardStats();
  const actions = useQuickActions();
  const context = useUserContext();

  const isLoading =
    dashboard.isLoading || stats.isLoading || actions.isLoading || context.isLoading;

  const hasError = dashboard.error || stats.error || actions.error || context.error;

  return {
    // Data
    dashboard: dashboard.data?.data,
    stats: stats.data?.stats,
    actions: actions.data?.actions || [],
    context: context.data?.context,
    role: dashboard.data?.role || context.data?.context?.user?.role,

    // Status
    isLoading,
    hasError,

    // Refetch all
    refetchAll: () => {
      dashboard.refetch();
      stats.refetch();
      actions.refetch();
      context.refetch();
    },
  };
}

export default {
  useDashboard,
  useDashboardStats,
  useQuickActions,
  useUserContext,
  useServiceRequests,
  useServiceRequest,
  useServices,
  useComplianceStatus,
  useActivityFeed,
  useNotifications,
  useUnifiedSearch,
  useInvalidateRelated,
  useCreateServiceRequest,
  useUpdateServiceRequestStatus,
  useConsistentDashboardData,
};
