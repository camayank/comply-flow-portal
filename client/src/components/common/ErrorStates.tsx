/**
 * Standardized Error States
 * Consistent error display components for different scenarios
 */

import { AlertCircle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface ErrorMessageProps {
  /**
   * Error title
   */
  title?: string;
  
  /**
   * Error message
   */
  message: string;
  
  /**
   * Retry callback
   */
  onRetry?: () => void;
  
  /**
   * Additional actions
   */
  actions?: React.ReactNode;
  
  /**
   * Additional className
   */
  className?: string;
}

/**
 * Inline error alert (for form errors, section errors)
 */
export function ErrorAlert({ 
  title = 'Error',
  message, 
  onRetry,
  actions,
  className 
}: ErrorMessageProps) {
  return (
    <Alert variant="destructive" className={cn('my-4', className)}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">{message}</p>
        <div className="flex gap-2">
          {onRetry && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRetry}
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              Try Again
            </Button>
          )}
          {actions}
        </div>
      </AlertDescription>
    </Alert>
  );
}

interface ErrorPageProps {
  /**
   * Error title
   */
  title?: string;
  
  /**
   * Error message
   */
  message?: string;
  
  /**
   * Error code (like 404, 500)
   */
  code?: string | number;
  
  /**
   * Retry callback
   */
  onRetry?: () => void;
  
  /**
   * Go back callback
   */
  onGoBack?: () => void;
  
  /**
   * Go home callback
   */
  onGoHome?: () => void;
  
  /**
   * Additional className
   */
  className?: string;
}

/**
 * Full page error state (for page-level errors)
 */
export function ErrorPage({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  code,
  onRetry,
  onGoBack,
  onGoHome,
  className,
}: ErrorPageProps) {
  return (
    <div className={cn(
      'min-h-screen flex items-center justify-center px-4',
      className
    )}>
      <div className="text-center max-w-md">
        {code && (
          <div className="text-6xl font-bold text-muted-foreground mb-4">
            {code}
          </div>
        )}
        
        <div className="mb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {title}
          </h1>
          <p className="text-muted-foreground">
            {message}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onRetry && (
            <Button onClick={onRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
          {onGoBack && (
            <Button variant="outline" onClick={onGoBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          )}
          {onGoHome && (
            <Button variant="outline" onClick={onGoHome}>
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Section error state (for failed section/widget within a page)
 */
export function ErrorSection({
  title = 'Failed to load',
  message,
  onRetry,
  className,
}: ErrorMessageProps) {
  return (
    <div className={cn(
      'rounded-lg border border-destructive/50 bg-destructive/5 p-6 text-center',
      className
    )}>
      <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-3 w-3 mr-2" />
          Retry
        </Button>
      )}
    </div>
  );
}

interface NetworkErrorProps {
  onRetry?: () => void;
  className?: string;
}

/**
 * Network error state (for connection issues)
 */
export function NetworkError({ onRetry, className }: NetworkErrorProps) {
  return (
    <ErrorSection
      title="Connection Error"
      message="Unable to connect to the server. Please check your internet connection."
      onRetry={onRetry}
      className={className}
    />
  );
}

interface NotFoundErrorProps {
  resourceName?: string;
  onGoBack?: () => void;
  className?: string;
}

/**
 * Not found error (for missing resources)
 */
export function NotFoundError({ 
  resourceName = 'Page',
  onGoBack,
  className 
}: NotFoundErrorProps) {
  return (
    <ErrorPage
      code="404"
      title={`${resourceName} Not Found`}
      message={`The ${resourceName.toLowerCase()} you're looking for doesn't exist or has been moved.`}
      onGoBack={onGoBack}
      onGoHome={() => window.location.href = '/'}
      className={className}
    />
  );
}

interface UnauthorizedErrorProps {
  onLogin?: () => void;
  className?: string;
}

/**
 * Unauthorized error (for permission issues)
 */
export function UnauthorizedError({ onLogin, className }: UnauthorizedErrorProps) {
  return (
    <ErrorPage
      code="403"
      title="Access Denied"
      message="You don't have permission to access this resource."
      onGoBack={() => window.history.back()}
      onGoHome={() => window.location.href = '/'}
      className={className}
    />
  );
}
