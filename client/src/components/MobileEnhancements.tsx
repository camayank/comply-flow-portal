/**
 * Mobile Experience Enhancements
 * Premium mobile-first components for touch devices
 *
 * Features:
 * - Pull to refresh
 * - Swipeable cards
 * - Touch-optimized buttons
 * - Mobile-friendly modals
 * - Floating action button
 */

import { useState, useRef, useEffect, ReactNode, TouchEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  RefreshCw,
  Plus,
  ChevronUp,
  X,
  Menu,
  ArrowLeft
} from 'lucide-react';
import { Link, useLocation } from 'wouter';

// ============================================
// 1. Pull to Refresh Container
// ============================================

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
  threshold?: number;
}

export function PullToRefresh({
  onRefresh,
  children,
  className,
  threshold = 80
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (startY.current === 0 || isRefreshing) return;
    if (containerRef.current && containerRef.current.scrollTop > 0) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0) {
      // Add resistance
      const distance = Math.min(diff * 0.5, threshold * 1.5);
      setPullDistance(distance);
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    startY.current = 0;
    setPullDistance(0);
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className={cn(
          "absolute left-1/2 -translate-x-1/2 z-10 transition-all duration-200",
          pullDistance > 0 ? "opacity-100" : "opacity-0"
        )}
        style={{ top: Math.max(0, pullDistance - 40) }}
      >
        <div className={cn(
          "bg-primary text-primary-foreground rounded-full p-2",
          isRefreshing && "animate-spin"
        )}>
          <RefreshCw className="h-5 w-5" />
        </div>
      </div>

      {/* Content with transform */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pullDistance === 0 ? 'transform 0.2s' : 'none'
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ============================================
// 2. Swipeable Card
// ============================================

interface SwipeableCardProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: ReactNode;
  rightAction?: ReactNode;
  className?: string;
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  className
}: SwipeableCardProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const threshold = 100;

  const handleTouchStart = (e: TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isSwiping) return;
    const diff = e.touches[0].clientX - startX.current;
    // Limit swipe distance
    const limited = Math.max(-150, Math.min(150, diff));
    setOffsetX(limited);
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (offsetX > threshold && onSwipeRight) {
      onSwipeRight();
    } else if (offsetX < -threshold && onSwipeLeft) {
      onSwipeLeft();
    }
    setOffsetX(0);
  };

  return (
    <div className={cn("relative overflow-hidden rounded-lg", className)}>
      {/* Background actions */}
      <div className="absolute inset-0 flex items-center justify-between px-4">
        <div className={cn(
          "transition-opacity",
          offsetX > 20 ? "opacity-100" : "opacity-0"
        )}>
          {rightAction}
        </div>
        <div className={cn(
          "transition-opacity",
          offsetX < -20 ? "opacity-100" : "opacity-0"
        )}>
          {leftAction}
        </div>
      </div>

      {/* Card content */}
      <div
        className="relative bg-background"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

// ============================================
// 3. Floating Action Button
// ============================================

interface FloatingActionButtonProps {
  icon?: ReactNode;
  onClick?: () => void;
  href?: string;
  label?: string;
  expanded?: boolean;
  className?: string;
}

export function FloatingActionButton({
  icon = <Plus className="h-6 w-6" />,
  onClick,
  href,
  label,
  expanded = false,
  className
}: FloatingActionButtonProps) {
  const button = (
    <Button
      size="lg"
      className={cn(
        "fixed bottom-20 right-4 z-40 rounded-full shadow-lg",
        "h-14 transition-all duration-200",
        expanded ? "w-auto px-6 gap-2" : "w-14 p-0",
        "lg:bottom-6",
        className
      )}
      onClick={onClick}
    >
      {icon}
      {expanded && label && <span>{label}</span>}
    </Button>
  );

  if (href) {
    return <Link href={href}>{button}</Link>;
  }

  return button;
}

// ============================================
// 4. Mobile Header
// ============================================

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backHref?: string;
  actions?: ReactNode;
  className?: string;
}

export function MobileHeader({
  title,
  subtitle,
  showBack = false,
  backHref,
  actions,
  className
}: MobileHeaderProps) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    if (backHref) {
      setLocation(backHref);
    } else {
      window.history.back();
    }
  };

  return (
    <header className={cn(
      "sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      "border-b px-4 py-3 lg:hidden",
      className
    )}>
      <div className="flex items-center gap-3">
        {showBack && (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 -ml-2"
            onClick={handleBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

// ============================================
// 5. Bottom Sheet Action Menu
// ============================================

interface ActionSheetItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'default' | 'destructive';
}

interface ActionSheetProps {
  trigger: ReactNode;
  title?: string;
  items: ActionSheetItem[];
}

export function ActionSheet({ trigger, title, items }: ActionSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger}
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-xl">
        {title && (
          <SheetHeader className="pb-4">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
        )}
        <div className="space-y-1 pb-safe">
          {items.map((item, idx) => (
            <Button
              key={idx}
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 h-12",
                item.variant === 'destructive' && "text-destructive hover:text-destructive"
              )}
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
            >
              {item.icon}
              {item.label}
            </Button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================
// 6. Touch Ripple Button
// ============================================

interface TouchButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  disabled?: boolean;
}

export function TouchButton({
  children,
  onClick,
  className,
  variant = 'default',
  size = 'default',
  disabled
}: TouchButtonProps) {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

  const handleTouchStart = (e: TouchEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;
    const id = Date.now();

    setRipples(prev => [...prev, { x, y, id }]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 600);
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={cn("relative overflow-hidden", className)}
      onClick={onClick}
      onTouchStart={handleTouchStart}
      disabled={disabled}
    >
      {children}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white/30 animate-ripple pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            transform: 'translate(-50%, -50%)'
          }}
        />
      ))}
    </Button>
  );
}

// ============================================
// 7. Scroll to Top Button
// ============================================

export function ScrollToTopButton({ className }: { className?: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Button
      variant="secondary"
      size="icon"
      className={cn(
        "fixed bottom-20 right-4 z-40 rounded-full shadow-lg transition-all duration-200",
        "lg:bottom-6",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none",
        className
      )}
      onClick={scrollToTop}
    >
      <ChevronUp className="h-5 w-5" />
    </Button>
  );
}

// ============================================
// 8. Safe Area Wrapper
// ============================================

export function SafeAreaView({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      "min-h-screen",
      "pt-safe pb-safe pl-safe pr-safe",
      className
    )}>
      {children}
    </div>
  );
}

// Add CSS for ripple animation
const rippleStyles = `
@keyframes ripple {
  0% {
    width: 0;
    height: 0;
    opacity: 0.5;
  }
  100% {
    width: 200px;
    height: 200px;
    opacity: 0;
  }
}

.animate-ripple {
  animation: ripple 0.6s linear;
}

.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.pt-safe {
  padding-top: env(safe-area-inset-top, 0);
}

.pl-safe {
  padding-left: env(safe-area-inset-left, 0);
}

.pr-safe {
  padding-right: env(safe-area-inset-right, 0);
}

.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0);
}
`;

// Inject styles once
if (typeof document !== 'undefined') {
  const styleId = 'mobile-enhancements-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = rippleStyles;
    document.head.appendChild(style);
  }
}

export default {
  PullToRefresh,
  SwipeableCard,
  FloatingActionButton,
  MobileHeader,
  ActionSheet,
  TouchButton,
  ScrollToTopButton,
  SafeAreaView
};
