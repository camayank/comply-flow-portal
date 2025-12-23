/**
 * Mobile Bottom Navigation
 * iOS/Android-style bottom navigation bar for mobile devices
 */

import * as React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Badge } from "./badge";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: string | number;
  ariaLabel?: string;
}

interface MobileBottomNavProps {
  items: NavItem[];
  /**
   * Additional className for the nav container
   */
  className?: string;
}

/**
 * Mobile Bottom Navigation Component
 * Provides iOS/Android-style navigation bar fixed at bottom of screen
 *
 * @example
 * ```tsx
 * <MobileBottomNav
 *   items={[
 *     { id: 'home', label: 'Home', icon: Home, href: '/portal' },
 *     { id: 'requests', label: 'Requests', icon: FileText, href: '/service-requests', badge: 3 },
 *     { id: 'upload', label: 'Upload', icon: Upload, href: '/document-vault' },
 *     { id: 'profile', label: 'Profile', icon: User, href: '/profile' },
 *   ]}
 * />
 * ```
 */
export function MobileBottomNav({ items, className }: MobileBottomNavProps) {
  const [location] = useLocation();

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-card border-t border-border",
        "safe-area-bottom", // iOS safe area support
        "lg:hidden", // Hide on desktop
        className
      )}
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || location.startsWith(item.href + "/");

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center",
                "min-w-[64px] h-full gap-1 px-2",
                "transition-colors duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "rounded-md",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={item.ariaLabel || item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "h-6 w-6 transition-transform duration-200",
                    isActive && "scale-110"
                  )}
                  aria-hidden="true"
                />
                {item.badge && (
                  <Badge
                    className={cn(
                      "absolute -top-2 -right-2 h-5 min-w-[20px] px-1",
                      "flex items-center justify-center",
                      "bg-error text-error-foreground text-xs font-medium",
                      "rounded-full border-2 border-card"
                    )}
                  >
                    {item.badge}
                  </Badge>
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium transition-all duration-200",
                  isActive && "font-semibold"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Spacer component to add padding at bottom of content
 * when using MobileBottomNav
 */
export function MobileBottomNavSpacer() {
  return <div className="h-16 lg:hidden" aria-hidden="true" />;
}

/**
 * Hook to check if mobile bottom nav should be visible
 */
export function useMobileBottomNav() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
}
