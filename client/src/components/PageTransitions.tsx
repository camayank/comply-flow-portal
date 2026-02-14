/**
 * Page Transitions
 * Smooth transitions between pages for premium navigation experience
 */

import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';

// ============================================
// 1. Page Wrapper with Fade Transition
// ============================================

interface PageWrapperProps {
  children: ReactNode;
  className?: string;
}

export function PageWrapper({ children, className }: PageWrapperProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={cn(
        "transition-all duration-300 ease-out",
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-2",
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================
// 2. Content Loader with Skeleton
// ============================================

interface ContentLoaderProps {
  isLoading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function ContentLoader({
  isLoading,
  skeleton,
  children,
  delay = 200,
  className
}: ContentLoaderProps) {
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      // Small delay before showing content for smooth transition
      const timer = setTimeout(() => {
        setShowSkeleton(false);
        setShowContent(true);
      }, delay);
      return () => clearTimeout(timer);
    } else {
      setShowSkeleton(true);
      setShowContent(false);
    }
  }, [isLoading, delay]);

  return (
    <div className={cn("relative", className)}>
      {/* Skeleton */}
      <div
        className={cn(
          "transition-opacity duration-200",
          showSkeleton ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"
        )}
      >
        {skeleton}
      </div>

      {/* Content */}
      {showContent && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {children}
        </div>
      )}
    </div>
  );
}

// ============================================
// 3. Section Reveal on Scroll
// ============================================

interface RevealOnScrollProps {
  children: ReactNode;
  threshold?: number;
  className?: string;
}

export function RevealOnScroll({
  children,
  threshold = 0.1,
  className
}: RevealOnScrollProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [ref, setRef] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(ref);
    return () => observer.disconnect();
  }, [ref, threshold]);

  return (
    <div
      ref={setRef}
      className={cn(
        "transition-all duration-500 ease-out",
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-8",
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================
// 4. Route Change Indicator
// ============================================

export function RouteChangeIndicator() {
  const [location] = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setIsNavigating(true);
    setProgress(30);

    const timer1 = setTimeout(() => setProgress(70), 100);
    const timer2 = setTimeout(() => setProgress(100), 200);
    const timer3 = setTimeout(() => {
      setIsNavigating(false);
      setProgress(0);
    }, 400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [location]);

  if (!isNavigating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-primary/20">
      <div
        className="h-full bg-primary transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// ============================================
// 5. Lazy Load Wrapper
// ============================================

interface LazyLoadProps {
  children: ReactNode;
  fallback?: ReactNode;
  delay?: number;
}

export function LazyLoad({ children, fallback, delay = 0 }: LazyLoadProps) {
  const [isReady, setIsReady] = useState(delay === 0);

  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => setIsReady(true), delay);
      return () => clearTimeout(timer);
    }
  }, [delay]);

  if (!isReady) {
    return <>{fallback}</>;
  }

  return (
    <div className="animate-in fade-in duration-300">
      {children}
    </div>
  );
}

// ============================================
// 6. Dashboard Section Loader
// ============================================

interface DashboardSectionProps {
  title?: string;
  isLoading?: boolean;
  children: ReactNode;
  className?: string;
}

export function DashboardSection({
  title,
  isLoading = false,
  children,
  className
}: DashboardSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      {title && (
        <h2 className="text-lg font-semibold">{title}</h2>
      )}
      {isLoading ? (
        <div className="space-y-3">
          <div className="h-32 bg-muted animate-pulse rounded-lg" />
          <div className="h-32 bg-muted animate-pulse rounded-lg" />
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {children}
        </div>
      )}
    </section>
  );
}

// ============================================
// 7. Card Grid with Staggered Animation
// ============================================

interface AnimatedCardGridProps {
  children: ReactNode[];
  columns?: 1 | 2 | 3 | 4;
  staggerDelay?: number;
  className?: string;
}

export function AnimatedCardGrid({
  children,
  columns = 3,
  staggerDelay = 75,
  className
}: AnimatedCardGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {children.map((child, index) => (
        <div
          key={index}
          className="animate-in fade-in slide-in-from-bottom-4"
          style={{
            animationDelay: `${index * staggerDelay}ms`,
            animationFillMode: 'backwards'
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

// ============================================
// 8. Empty State with Animation
// ============================================

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 text-center",
      "animate-in fade-in zoom-in-95 duration-300",
      className
    )}>
      {icon && (
        <div className="mb-4 text-muted-foreground animate-bounce">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  );
}

// ============================================
// CSS for animations
// ============================================

const transitionStyles = `
@keyframes zoom-in-95 {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.zoom-in-95 {
  animation-name: zoom-in-95;
}

@keyframes slide-in-from-bottom-4 {
  from {
    transform: translateY(1rem);
  }
  to {
    transform: translateY(0);
  }
}

.slide-in-from-bottom-4 {
  animation-name: slide-in-from-bottom-4;
}
`;

// Inject styles once
if (typeof document !== 'undefined') {
  const styleId = 'page-transitions-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = transitionStyles;
    document.head.appendChild(style);
  }
}

export default {
  PageWrapper,
  ContentLoader,
  RevealOnScroll,
  RouteChangeIndicator,
  LazyLoad,
  DashboardSection,
  AnimatedCardGrid,
  EmptyState
};
