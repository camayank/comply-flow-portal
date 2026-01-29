/**
 * Mobile Navigation Component
 * Consistent bottom navigation for mobile views
 */

import { cn } from '@/lib/utils';
import { Link, useLocation } from 'wouter';
import { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface MobileNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

interface MobileBottomNavProps {
  items: MobileNavItem[];
  className?: string;
}

/**
 * Bottom navigation bar for mobile devices
 */
export function MobileBottomNav({ items, className }: MobileBottomNavProps) {
  const [location] = useLocation();

  const isActive = (href: string) => {
    return location === href || location.startsWith(href + '/');
  };

  return (
    <nav 
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 border-t bg-card',
        'lg:hidden',
        className
      )}
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around px-2 py-2 safe-area-bottom">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link key={item.href} href={item.href}>
              <a
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[4rem]',
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {item.badge !== undefined && item.badge > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-4 min-w-[1rem] flex items-center justify-center px-1 text-[10px]"
                    >
                      {item.badge > 9 ? '9+' : item.badge}
                    </Badge>
                  )}
                </div>
                <span className="text-[11px] font-medium truncate max-w-full">
                  {item.label}
                </span>
              </a>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Add padding to content to account for bottom nav
 */
export function MobileNavSpacer() {
  return <div className="h-20 lg:hidden" aria-hidden="true" />;
}
