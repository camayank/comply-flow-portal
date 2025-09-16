import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { 
  Bell, 
  Search, 
  Settings, 
  RefreshCw, 
  Download, 
  Filter,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';

// Standardized Dashboard Layout Components
interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  notifications?: number;
  className?: string;
}

export function DashboardHeader({ 
  title, 
  subtitle, 
  icon, 
  actions, 
  notifications = 0,
  className 
}: DashboardHeaderProps) {
  return (
    <header className={cn(
      "sticky top-0 z-50 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800",
      className
    )}>
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          {icon && <div className="text-blue-600">{icon}</div>}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
            {subtitle && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" data-testid="button-notifications">
            <Bell className="h-4 w-4" />
            {notifications > 0 && (
              <Badge className="ml-2 bg-red-500 text-white px-1.5 py-0.5 text-xs">
                {notifications}
              </Badge>
            )}
          </Button>
          {actions}
        </div>
      </div>
    </header>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: string;
  };
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  className?: string;
}

export function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend, 
  color = 'blue',
  className 
}: MetricCardProps) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    green: 'text-green-600 bg-green-50 dark:bg-green-900/20',
    orange: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
    red: 'text-red-600 bg-red-50 dark:bg-red-900/20',
    purple: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
  };

  return (
    <Card className={cn("relative overflow-hidden", className)} data-testid={`card-metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </CardTitle>
          {icon && (
            <div className={cn("p-2 rounded-lg", colorClasses[color])}>
              {icon}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="text-2xl font-bold text-gray-900 dark:text-white" data-testid={`text-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            {value}
          </div>
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              "text-sm font-medium",
              trend.direction === 'up' && "text-green-600",
              trend.direction === 'down' && "text-red-600",
              trend.direction === 'neutral' && "text-gray-600"
            )}>
              {trend.value}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface DashboardGridProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardGrid({ children, className }: DashboardGridProps) {
  return (
    <div className={cn(
      "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6",
      className
    )}>
      {children}
    </div>
  );
}

interface DashboardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardContent({ children, className }: DashboardContentProps) {
  return (
    <main className={cn("flex-1 px-6 py-6 space-y-6 bg-gray-50 dark:bg-gray-900/50", className)}>
      {children}
    </main>
  );
}

interface DashboardTabsProps {
  defaultValue: string;
  children: React.ReactNode;
  className?: string;
}

export function DashboardTabs({ defaultValue, children, className }: DashboardTabsProps) {
  return (
    <Tabs defaultValue={defaultValue} className={cn("w-full", className)}>
      {children}
    </Tabs>
  );
}

interface AlertCardProps {
  type?: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  dismissible?: boolean;
  actions?: React.ReactNode;
  className?: string;
}

export function AlertCard({ 
  type = 'info', 
  title, 
  message, 
  dismissible = false, 
  actions,
  className 
}: AlertCardProps) {
  const typeStyles = {
    info: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20',
    warning: 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20',
    error: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20',
    success: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20',
  };

  return (
    <Card className={cn(typeStyles[type], className)} data-testid={`alert-${type}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className={cn(
            "text-sm font-medium",
            type === 'info' && "text-blue-700 dark:text-blue-300",
            type === 'warning' && "text-yellow-700 dark:text-yellow-300",
            type === 'error' && "text-red-700 dark:text-red-300",
            type === 'success' && "text-green-700 dark:text-green-300"
          )}>
            {title}
          </CardTitle>
          {dismissible && (
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{message}</p>
        {actions && (
          <div className="flex gap-2">
            {actions}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'compact';
  className?: string;
}

export function StatusBadge({ status, variant = 'default', className }: StatusBadgeProps) {
  const getStatusColor = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    if (['completed', 'approved', 'active', 'success'].includes(normalizedStatus)) {
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
    }
    if (['in_progress', 'processing', 'pending'].includes(normalizedStatus)) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
    }
    if (['warning', 'due_soon', 'attention'].includes(normalizedStatus)) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
    }
    if (['failed', 'rejected', 'error', 'overdue'].includes(normalizedStatus)) {
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  };

  return (
    <Badge 
      className={cn(
        "font-medium capitalize",
        getStatusColor(status),
        variant === 'compact' && "text-xs px-2 py-1",
        className
      )}
      data-testid={`badge-status-${status.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

interface DashboardFiltersProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  filterValue: string;
  onFilterChange: (value: string) => void;
  filterOptions: Array<{ value: string; label: string }>;
  additionalActions?: React.ReactNode;
  className?: string;
}

export function DashboardFilters({
  searchValue,
  onSearchChange,
  filterValue,
  onFilterChange,
  filterOptions,
  additionalActions,
  className
}: DashboardFiltersProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            data-testid="input-search"
          />
        </div>
        <select
          value={filterValue}
          onChange={(e) => onFilterChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          data-testid="select-filter"
        >
          {filterOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        {additionalActions}
        <Button variant="outline" size="sm" data-testid="button-refresh">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    </div>
  );
}