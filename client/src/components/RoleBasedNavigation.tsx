import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Briefcase,
  Workflow,
  BarChart3,
  Users,
  Settings,
  Shield,
  TrendingUp,
  DollarSign,
  Bot,
  CheckSquare,
  FileText,
  ShieldCheck,
  Headphones,
  UserPlus,
  Share2,
  Home,
  Building2,
  FolderOpen,
  ShoppingCart,
  Calendar,
  Wallet,
  ClipboardCheck,
  Receipt,
  BadgeCheck,
  Plus,
  Bell,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';
import { getRoleNavigation, getRoleDisplayName, getRoleDashboardRoute } from '@/utils/roleBasedRouting';
import { useCurrentUser } from './ProtectedRoute';

const iconMap: Record<string, React.ComponentType<any>> = {
  LayoutDashboard,
  Briefcase,
  Workflow,
  BarChart3,
  Users,
  Settings,
  Shield,
  TrendingUp,
  DollarSign,
  Bot,
  CheckSquare,
  FileText,
  ShieldCheck,
  Headphones,
  UserPlus,
  Share2,
  Home,
  Building2,
  FolderOpen,
  ShoppingCart,
  Calendar,
  Wallet,
  ClipboardCheck,
  Receipt,
  BadgeCheck,
  Plus,
  Bell,
  HelpCircle,
};

// Quick actions by role
const roleQuickActions: Record<string, Array<{ label: string; path: string; icon: string }>> = {
  client: [
    { label: 'Upload Document', path: '/vault', icon: 'FileText' },
    { label: 'View Calendar', path: '/compliance-calendar', icon: 'Calendar' },
    { label: 'Get Support', path: '/support', icon: 'Headphones' },
  ],
  agent: [
    { label: 'New Lead', path: '/agent/leads', icon: 'UserPlus' },
    { label: 'Create Proposal', path: '/proposals', icon: 'FileText' },
    { label: 'View Commissions', path: '/agent/commissions', icon: 'DollarSign' },
  ],
  ops_executive: [
    { label: 'Work Queue', path: '/work-queue', icon: 'CheckSquare' },
    { label: 'Review Documents', path: '/document-review', icon: 'FileText' },
    { label: 'Escalations', path: '/escalations', icon: 'Shield' },
  ],
  ops_manager: [
    { label: 'Team Overview', path: '/operations', icon: 'Users' },
    { label: 'Escalations', path: '/escalations', icon: 'Shield' },
    { label: 'Quality Metrics', path: '/quality-metrics', icon: 'BarChart3' },
  ],
  admin: [
    { label: 'Manage Users', path: '/admin/users', icon: 'Users' },
    { label: 'Blueprints', path: '/admin/blueprints', icon: 'Workflow' },
    { label: 'Configuration', path: '/config', icon: 'Settings' },
  ],
  super_admin: [
    { label: 'System Status', path: '/super-admin', icon: 'Shield' },
    { label: 'All Users', path: '/admin/users', icon: 'Users' },
    { label: 'Audit Logs', path: '/audit-log', icon: 'FileText' },
  ],
};

interface RoleBasedNavigationProps {
  className?: string;
  vertical?: boolean;
  showRoleBadge?: boolean;
}

/**
 * RoleBasedNavigation Component
 * WordPress-style navigation that shows only relevant menu items based on user role
 */
export function RoleBasedNavigation({ 
  className = '', 
  vertical = false,
  showRoleBadge = true,
}: RoleBasedNavigationProps) {
  const user = useCurrentUser();
  
  if (!user) {
    return null;
  }
  
  const navigationItems = getRoleNavigation(user.role);
  const roleDisplayName = getRoleDisplayName(user.role);
  
  return (
    <nav className={`${className}`}>
      {showRoleBadge && (
        <div className="mb-4 px-3 py-2 bg-primary/10 rounded-lg">
          <p className="text-xs text-muted-foreground">Logged in as</p>
          <p className="text-sm font-semibold text-primary">{roleDisplayName}</p>
        </div>
      )}
      
      <div className={`flex ${vertical ? 'flex-col space-y-1' : 'flex-row space-x-2'}`}>
        {navigationItems.map((item, index) => {
          const Icon = iconMap[item.icon] || LayoutDashboard;
          
          return (
            <Link key={index} href={item.path}>
              <Button
                variant="ghost"
                className={`${vertical ? 'w-full justify-start' : ''} gap-2`}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Compact role-based navigation for mobile/header
 */
export function CompactRoleNavigation({ className = '' }: { className?: string }) {
  const user = useCurrentUser();
  
  if (!user) {
    return null;
  }
  
  const navigationItems = getRoleNavigation(user.role);
  
  // Show only first 4 items for compact view
  const compactItems = navigationItems.slice(0, 4);
  
  return (
    <div className={`flex gap-2 ${className}`}>
      {compactItems.map((item, index) => {
        const Icon = iconMap[item.icon] || LayoutDashboard;
        
        return (
          <Link key={index} href={item.path}>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              data-testid={`compact-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden md:inline">{item.label}</span>
            </Button>
          </Link>
        );
      })}
    </div>
  );
}

/**
 * Role-specific dashboard welcome message
 */
export function RoleBasedWelcome() {
  const user = useCurrentUser();

  if (!user) {
    return null;
  }

  const welcomeMessages: Record<string, { title: string; description: string }> = {
    super_admin: {
      title: 'System Administrator Dashboard',
      description: 'Manage all system configurations, users, and monitor platform health',
    },
    admin: {
      title: 'Admin Dashboard',
      description: 'Manage services, workflows, users, and view analytics',
    },
    ops_manager: {
      title: 'Operations Manager Dashboard',
      description: 'Oversee all operations, team performance, and service delivery',
    },
    ops_executive: {
      title: 'Operations Dashboard',
      description: 'Manage active services, tasks, and quality control',
    },
    ops_exec: {
      title: 'Operations Dashboard',
      description: 'Manage active services, tasks, and quality control',
    },
    ops_lead: {
      title: 'Operations Lead Dashboard',
      description: 'Oversee team operations, service delivery, and quality metrics',
    },
    customer_service: {
      title: 'Customer Service Dashboard',
      description: 'Support clients, manage tickets, and handle service requests',
    },
    qc_executive: {
      title: 'Quality Control Dashboard',
      description: 'Review deliverables, manage quality checks, and ensure compliance',
    },
    accountant: {
      title: 'Financial Dashboard',
      description: 'Track revenue, manage invoices, and generate financial reports',
    },
    agent: {
      title: 'Agent Portal',
      description: 'Manage leads, proposals, referrals, and track commissions',
    },
    client: {
      title: 'Client Portal',
      description: 'Track your services, upload documents, and manage compliance',
    },
  };

  const message = welcomeMessages[user.role] || welcomeMessages.client;

  return (
    <div className="mb-6">
      <h1 className="text-2xl lg:text-3xl font-bold">{message.title}</h1>
      <p className="text-muted-foreground mt-1">{message.description}</p>
    </div>
  );
}

/**
 * Modern Sidebar Navigation
 * Premium sidebar with quick actions and active state
 */
interface SidebarNavigationProps {
  className?: string;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function SidebarNavigation({
  className,
  collapsed = false,
}: SidebarNavigationProps) {
  const user = useCurrentUser();
  const [location] = useLocation();

  if (!user) return null;

  const navigationItems = getRoleNavigation(user.role);
  const roleDisplayName = getRoleDisplayName(user.role);
  const quickActions = roleQuickActions[user.role] || roleQuickActions.client;
  const dashboardRoute = getRoleDashboardRoute(user.role);

  return (
    <aside className={cn(
      "flex flex-col h-full border-r bg-background",
      collapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Logo & Role */}
      <div className="p-4 border-b">
        <Link href={dashboardRoute}>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">DigiComply</p>
                <Badge variant="secondary" className="text-xs mt-0.5">
                  {roleDisplayName}
                </Badge>
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* Quick Actions */}
      {!collapsed && quickActions.length > 0 && (
        <div className="p-3 border-b">
          <p className="text-xs font-medium text-muted-foreground mb-2 px-2">Quick Actions</p>
          <div className="space-y-1">
            {quickActions.map((action, idx) => {
              const ActionIcon = iconMap[action.icon] || Plus;
              return (
                <Link key={idx} href={action.path}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 h-8 text-xs"
                  >
                    <ActionIcon className="h-3.5 w-3.5" />
                    {action.label}
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Navigation */}
      <ScrollArea className="flex-1 px-3 py-2">
        <nav className="space-y-1">
          {navigationItems.map((item, index) => {
            const Icon = iconMap[item.icon] || LayoutDashboard;
            const isActive = location === item.path || location.startsWith(item.path + '/');

            return (
              <Link key={index} href={item.path}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full gap-3",
                    collapsed ? "justify-center px-2" : "justify-start",
                    isActive && "bg-primary/10 text-primary hover:bg-primary/15"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      {isActive && <ChevronRight className="h-4 w-4 text-primary" />}
                    </>
                  )}
                </Button>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="p-3 border-t space-y-1">
        <Link href="/notifications">
          <Button
            variant="ghost"
            className={cn("w-full gap-3", collapsed ? "justify-center px-2" : "justify-start")}
          >
            <Bell className="h-4 w-4" />
            {!collapsed && <span className="flex-1 text-left">Notifications</span>}
          </Button>
        </Link>
        <Link href="/support">
          <Button
            variant="ghost"
            className={cn("w-full gap-3", collapsed ? "justify-center px-2" : "justify-start")}
          >
            <HelpCircle className="h-4 w-4" />
            {!collapsed && <span className="flex-1 text-left">Help & Support</span>}
          </Button>
        </Link>
      </div>
    </aside>
  );
}

/**
 * Role Quick Action Bar - Horizontal quick actions for mobile
 */
export function RoleQuickActionBar({ className }: { className?: string }) {
  const user = useCurrentUser();

  if (!user) return null;

  const quickActions = roleQuickActions[user.role] || roleQuickActions.client;

  return (
    <div className={cn("flex gap-2 overflow-x-auto pb-2 scrollbar-hide", className)}>
      {quickActions.map((action, idx) => {
        const ActionIcon = iconMap[action.icon] || Plus;
        return (
          <Link key={idx} href={action.path}>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 whitespace-nowrap shrink-0"
            >
              <ActionIcon className="h-4 w-4" />
              {action.label}
            </Button>
          </Link>
        );
      })}
    </div>
  );
}
