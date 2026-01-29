import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';
import { getRoleNavigation, getRoleDisplayName } from '@/utils/roleBasedRouting';
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
