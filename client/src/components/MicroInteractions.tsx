/**
 * Micro-interactions and Animations
 * Premium UI polish through subtle, purposeful animations
 *
 * Design Philosophy:
 * - Animations serve function, not decoration
 * - Feedback should be immediate and clear
 * - Motion guides attention, doesn't distract
 */

import { useState, useEffect, useRef, ReactNode, CSSProperties } from 'react';
import { cn } from '@/lib/utils';

// ============================================
// 1. Fade Transitions
// ============================================

interface FadeProps {
  show: boolean;
  children: ReactNode;
  duration?: number;
  delay?: number;
  className?: string;
}

export function FadeIn({ show, children, duration = 200, delay = 0, className }: FadeProps) {
  const [shouldRender, setShouldRender] = useState(show);

  useEffect(() => {
    if (show) setShouldRender(true);
  }, [show]);

  const handleAnimationEnd = () => {
    if (!show) setShouldRender(false);
  };

  if (!shouldRender) return null;

  return (
    <div
      className={cn(
        "transition-opacity",
        show ? "opacity-100" : "opacity-0",
        className
      )}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`
      }}
      onTransitionEnd={handleAnimationEnd}
    >
      {children}
    </div>
  );
}

export function FadeInUp({ show, children, duration = 300, delay = 0, className }: FadeProps) {
  const [shouldRender, setShouldRender] = useState(show);

  useEffect(() => {
    if (show) setShouldRender(true);
  }, [show]);

  const handleAnimationEnd = () => {
    if (!show) setShouldRender(false);
  };

  if (!shouldRender) return null;

  return (
    <div
      className={cn(
        "transition-all",
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        className
      )}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`
      }}
      onTransitionEnd={handleAnimationEnd}
    >
      {children}
    </div>
  );
}

// ============================================
// 2. Staggered List Animation
// ============================================

interface StaggeredListProps {
  children: ReactNode[];
  staggerDelay?: number;
  initialDelay?: number;
  className?: string;
}

export function StaggeredList({
  children,
  staggerDelay = 50,
  initialDelay = 0,
  className
}: StaggeredListProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {children.map((child, index) => (
        <div
          key={index}
          className="animate-in fade-in slide-in-from-bottom-2"
          style={{
            animationDelay: `${initialDelay + index * staggerDelay}ms`,
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
// 3. Scale on Interaction
// ============================================

interface ScaleOnHoverProps {
  children: ReactNode;
  scale?: number;
  className?: string;
}

export function ScaleOnHover({ children, scale = 1.02, className }: ScaleOnHoverProps) {
  return (
    <div
      className={cn(
        "transition-transform duration-200 ease-out hover:scale-[var(--hover-scale)]",
        className
      )}
      style={{ '--hover-scale': scale } as CSSProperties}
    >
      {children}
    </div>
  );
}

interface ScaleOnTapProps {
  children: ReactNode;
  scale?: number;
  className?: string;
  onClick?: () => void;
}

export function ScaleOnTap({ children, scale = 0.98, className, onClick }: ScaleOnTapProps) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <div
      className={cn(
        "transition-transform duration-100 ease-out cursor-pointer select-none",
        className
      )}
      style={{ transform: isPressed ? `scale(${scale})` : 'scale(1)' }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ============================================
// 4. Skeleton Loading States
// ============================================

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circle' | 'rect' | 'card';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className, variant = 'text', width, height }: SkeletonProps) {
  const baseClasses = "animate-pulse bg-muted";

  const variantClasses = {
    text: "h-4 rounded",
    circle: "rounded-full aspect-square",
    rect: "rounded-lg",
    card: "rounded-xl"
  };

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      style={{ width, height }}
    />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("p-4 border rounded-xl space-y-3", className)}>
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" className="h-10 w-10" />
        <div className="flex-1 space-y-2">
          <Skeleton className="w-3/4" />
          <Skeleton className="w-1/2" />
        </div>
      </div>
      <Skeleton variant="rect" className="h-24" />
      <div className="flex gap-2">
        <Skeleton className="w-20" />
        <Skeleton className="w-20" />
      </div>
    </div>
  );
}

// ============================================
// 5. Number Counter Animation
// ============================================

interface CounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function AnimatedCounter({
  value,
  duration = 1000,
  decimals = 0,
  prefix = '',
  suffix = '',
  className
}: CounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const startTime = useRef<number | null>(null);
  const startValue = useRef(0);

  useEffect(() => {
    startValue.current = displayValue;
    startTime.current = null;

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue.current + (value - startValue.current) * eased;

      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return (
    <span className={className}>
      {prefix}{displayValue.toFixed(decimals)}{suffix}
    </span>
  );
}

// ============================================
// 6. Progress Animation
// ============================================

interface AnimatedProgressProps {
  value: number;
  max?: number;
  duration?: number;
  className?: string;
  barClassName?: string;
  showLabel?: boolean;
}

export function AnimatedProgress({
  value,
  max = 100,
  duration = 800,
  className,
  barClassName,
  showLabel = false
}: AnimatedProgressProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const percentage = Math.min((value / max) * 100, 100);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayValue(percentage);
    }, 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div className={cn("space-y-1", className)}>
      {showLabel && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <AnimatedCounter value={displayValue} suffix="%" />
        </div>
      )}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full bg-primary rounded-full transition-all ease-out",
            barClassName
          )}
          style={{
            width: `${displayValue}%`,
            transitionDuration: `${duration}ms`
          }}
        />
      </div>
    </div>
  );
}

// ============================================
// 7. Pulse and Attention Indicators
// ============================================

export function PulseIndicator({
  color = 'bg-primary',
  size = 'md',
  className
}: {
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4'
  };

  return (
    <span className={cn("relative flex", sizeClasses[size], className)}>
      <span className={cn(
        "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
        color
      )} />
      <span className={cn(
        "relative inline-flex rounded-full h-full w-full",
        color
      )} />
    </span>
  );
}

export function AttentionBadge({
  children,
  animate = true,
  className
}: {
  children: ReactNode;
  animate?: boolean;
  className?: string;
}) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
      "bg-red-100 text-red-700",
      animate && "animate-pulse",
      className
    )}>
      {children}
    </span>
  );
}

// ============================================
// 8. Shake Animation for Errors
// ============================================

export function ShakeOnError({
  error,
  children,
  className
}: {
  error: boolean;
  children: ReactNode;
  className?: string;
}) {
  const [shouldShake, setShouldShake] = useState(false);

  useEffect(() => {
    if (error) {
      setShouldShake(true);
      const timer = setTimeout(() => setShouldShake(false), 500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className={cn(
      shouldShake && "animate-shake",
      className
    )}>
      {children}
    </div>
  );
}

// ============================================
// 9. Slide Transitions
// ============================================

interface SlideProps {
  show: boolean;
  children: ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down';
  duration?: number;
  className?: string;
}

export function Slide({
  show,
  children,
  direction = 'right',
  duration = 300,
  className
}: SlideProps) {
  const [shouldRender, setShouldRender] = useState(show);

  useEffect(() => {
    if (show) setShouldRender(true);
  }, [show]);

  const handleTransitionEnd = () => {
    if (!show) setShouldRender(false);
  };

  if (!shouldRender) return null;

  const transforms = {
    left: show ? 'translateX(0)' : 'translateX(-100%)',
    right: show ? 'translateX(0)' : 'translateX(100%)',
    up: show ? 'translateY(0)' : 'translateY(-100%)',
    down: show ? 'translateY(0)' : 'translateY(100%)'
  };

  return (
    <div
      className={cn("transition-all", className)}
      style={{
        transform: transforms[direction],
        opacity: show ? 1 : 0,
        transitionDuration: `${duration}ms`
      }}
      onTransitionEnd={handleTransitionEnd}
    >
      {children}
    </div>
  );
}

// ============================================
// 10. Success Checkmark Animation
// ============================================

export function SuccessCheckmark({
  show,
  size = 'md',
  className
}: {
  show: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  const strokeWidth = size === 'sm' ? 3 : size === 'md' ? 2.5 : 2;

  if (!show) return null;

  return (
    <div className={cn(
      "flex items-center justify-center rounded-full bg-emerald-100",
      sizeClasses[size],
      className
    )}>
      <svg
        className={cn(
          "text-emerald-600",
          size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-6 w-6' : 'h-8 w-8'
        )}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={strokeWidth}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 13l4 4L19 7"
          className="animate-draw-check"
          style={{
            strokeDasharray: 24,
            strokeDashoffset: 24,
            animation: 'draw-check 0.3s ease-out 0.2s forwards'
          }}
        />
      </svg>
    </div>
  );
}

// ============================================
// 11. Loading Spinner Variants
// ============================================

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <svg
      className={cn("animate-spin text-primary", sizeClasses[size], className)}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export function DotsLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex gap-1", className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-2 w-2 rounded-full bg-primary animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

// ============================================
// CSS Keyframes (inject once)
// ============================================

const animationStyles = `
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
}

@keyframes draw-check {
  to {
    stroke-dashoffset: 0;
  }
}

.animate-shake {
  animation: shake 0.5s ease-in-out;
}

.animate-draw-check {
  animation: draw-check 0.3s ease-out 0.2s forwards;
}

/* Tailwind CSS animate-in compatible animations */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-in-from-bottom-2 {
  from { transform: translateY(0.5rem); }
  to { transform: translateY(0); }
}

@keyframes slide-in-from-top-2 {
  from { transform: translateY(-0.5rem); }
  to { transform: translateY(0); }
}

.animate-in {
  animation-duration: 0.3s;
  animation-timing-function: ease-out;
  animation-fill-mode: both;
}

.fade-in {
  animation-name: fade-in;
}

.slide-in-from-bottom-2 {
  animation-name: slide-in-from-bottom-2;
}

.slide-in-from-top-2 {
  animation-name: slide-in-from-top-2;
}
`;

// Inject styles once
if (typeof document !== 'undefined') {
  const styleId = 'micro-interactions-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = animationStyles;
    document.head.appendChild(style);
  }
}

// ============================================
// Export all components
// ============================================

export default {
  FadeIn,
  FadeInUp,
  StaggeredList,
  ScaleOnHover,
  ScaleOnTap,
  Skeleton,
  SkeletonCard,
  AnimatedCounter,
  AnimatedProgress,
  PulseIndicator,
  AttentionBadge,
  ShakeOnError,
  Slide,
  SuccessCheckmark,
  Spinner,
  DotsLoader
};
