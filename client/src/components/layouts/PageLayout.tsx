/**
 * Standard Page Layout Component
 * Provides consistent page structure across the application
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useLocation } from 'wouter';

interface PageLayoutProps {
  /**
   * Page title (shown in header)
   */
  title: string;
  
  /**
   * Optional subtitle or description
   */
  subtitle?: string;
  
  /**
   * Page content
   */
  children: ReactNode;
  
  /**
   * Optional actions for the header (buttons, etc.)
   */
  actions?: ReactNode;
  
  /**
   * Show back button
   */
  showBack?: boolean;
  
  /**
   * Custom back action (defaults to history.back())
   */
  onBack?: () => void;
  
  /**
   * Show refresh button
   */
  showRefresh?: boolean;
  
  /**
   * Custom refresh action
   */
  onRefresh?: () => void;
  
  /**
   * Loading state for refresh button
   */
  isRefreshing?: boolean;
  
  /**
   * Max width constraint (defaults to 7xl)
   */
  maxWidth?: 'full' | '7xl' | '6xl' | '5xl' | '4xl' | '3xl' | '2xl';
  
  /**
   * Additional className for the container
   */
  className?: string;
  
  /**
   * Additional className for the header
   */
  headerClassName?: string;
}

export function PageLayout({
  title,
  subtitle,
  children,
  actions,
  showBack,
  onBack,
  showRefresh,
  onRefresh,
  isRefreshing,
  maxWidth = '7xl',
  className,
  headerClassName,
}: PageLayoutProps) {
  const [, navigate] = useLocation();
  
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };
  
  const maxWidthClasses = {
    full: 'max-w-full',
    '7xl': 'max-w-7xl',
    '6xl': 'max-w-6xl',
    '5xl': 'max-w-5xl',
    '4xl': 'max-w-4xl',
    '3xl': 'max-w-3xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div className={cn('min-h-screen bg-background', className)}>
      {/* Page Header */}
      <div className={cn(
        'border-b bg-card sticky top-0 z-10',
        headerClassName
      )}>
        <div className={cn('mx-auto px-4 sm:px-6 lg:px-8 py-4', maxWidthClasses[maxWidth])}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {showBack && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold text-foreground truncate">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-1 text-sm text-muted-foreground truncate">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 ml-4">
              {showRefresh && onRefresh && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  aria-label="Refresh"
                >
                  <RefreshCw className={cn(
                    'h-4 w-4',
                    isRefreshing && 'animate-spin'
                  )} />
                </Button>
              )}
              {actions}
            </div>
          </div>
        </div>
      </div>
      
      {/* Page Content */}
      <div className={cn('mx-auto px-4 sm:px-6 lg:px-8 py-6', maxWidthClasses[maxWidth])}>
        {children}
      </div>
    </div>
  );
}

/**
 * Section component for consistent spacing within pages
 */
interface PageSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export function PageSection({ 
  title, 
  description, 
  children, 
  className,
  actions 
}: PageSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {(title || description || actions) && (
        <div className="flex items-center justify-between">
          <div>
            {title && (
              <h2 className="text-lg font-semibold text-foreground">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {actions && <div>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
