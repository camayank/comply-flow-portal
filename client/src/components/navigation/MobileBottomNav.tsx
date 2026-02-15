import { Link, useLocation } from 'wouter';
import { Home, Briefcase, FileText, Bell, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface MobileBottomNavProps {
  role?: string;
  className?: string;
}

const NAV_ITEMS: Record<string, NavItem[]> = {
  client: [
    { label: 'Home', href: '/portal-v2', icon: Home },
    { label: 'Services', href: '/services', icon: Briefcase },
    { label: 'Requests', href: '/service-requests', icon: FileText },
    { label: 'Alerts', href: '/notifications', icon: Bell },
    { label: 'Account', href: '/portal-v2/account', icon: User },
  ],
  agent: [
    { label: 'Home', href: '/agent', icon: Home },
    { label: 'Leads', href: '/agent/leads', icon: Briefcase },
    { label: 'Earnings', href: '/agent/commissions', icon: FileText },
    { label: 'Alerts', href: '/notifications', icon: Bell },
    { label: 'Profile', href: '/agent/profile', icon: User },
  ],
  operations: [
    { label: 'Home', href: '/operations', icon: Home },
    { label: 'Queue', href: '/work-queue', icon: Briefcase },
    { label: 'Review', href: '/document-review', icon: FileText },
    { label: 'Alerts', href: '/notifications', icon: Bell },
    { label: 'More', href: '/escalations', icon: User },
  ],
  default: [
    { label: 'Home', href: '/dashboard', icon: Home },
    { label: 'Tasks', href: '/tasks', icon: FileText },
    { label: 'Alerts', href: '/notifications', icon: Bell },
    { label: 'Account', href: '/settings', icon: User },
  ],
};

export function MobileBottomNav({ role, className }: MobileBottomNavProps) {
  const [location] = useLocation();
  const normalizedRole = role?.toLowerCase() || 'default';
  const items = NAV_ITEMS[normalizedRole] || NAV_ITEMS.default;

  const isActive = (href: string) => {
    return location === href || location.startsWith(href + '/');
  };

  return (
    <nav
      className={cn(
        "fixed bottom-0 inset-x-0 bg-white border-t border-border z-40 pb-safe",
        className
      )}
      aria-label="Mobile navigation"
    >
      <div className="flex justify-around items-center h-16">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link key={item.href} href={item.href}>
              <a
                className={cn(
                  "flex flex-col items-center justify-center px-3 py-2 min-w-[64px] transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span className="text-xs mt-1 font-medium">{item.label}</span>
              </a>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
