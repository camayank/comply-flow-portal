/**
 * Empty State Components
 * Provides consistent empty state experiences across the platform
 */

import { LucideIcon, FileQuestion, Search, Inbox, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /**
   * Icon to display (Lucide icon component)
   */
  icon?: LucideIcon;

  /**
   * Title of the empty state
   */
  title: string;

  /**
   * Description or subtitle
   */
  description?: string;

  /**
   * Primary action button configuration
   */
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
    variant?: "default" | "outline" | "secondary" | "success" | "warning" | "error";
  };

  /**
   * Secondary action button configuration
   */
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };

  /**
   * Visual variant
   */
  variant?: "default" | "search" | "error" | "success";

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * General purpose empty state component
 */
export function EmptyState({
  icon: Icon = FileQuestion,
  title,
  description,
  action,
  secondaryAction,
  variant = "default",
  className,
}: EmptyStateProps) {
  const iconColors = {
    default: "text-muted-foreground",
    search: "text-primary",
    error: "text-error",
    success: "text-success",
  };

  const ActionIcon = action?.icon;
  const SecondaryActionIcon = secondaryAction?.icon;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-4",
        className
      )}
      role="status"
      aria-label={title}
    >
      <div
        className={cn(
          "rounded-full p-4 mb-4 bg-muted/50",
          iconColors[variant]
        )}
      >
        <Icon className="w-12 h-12" aria-hidden="true" />
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>

      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || "default"}
              className="min-w-[140px]"
            >
              {ActionIcon && <ActionIcon className="w-4 h-4 mr-2" />}
              {action.label}
            </Button>
          )}

          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="outline"
              className="min-w-[140px]"
            >
              {SecondaryActionIcon && <SecondaryActionIcon className="w-4 h-4 mr-2" />}
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Empty state for search results
 */
export function EmptySearchResults({
  searchTerm,
  onClearSearch,
  className,
}: {
  searchTerm?: string;
  onClearSearch?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={Search}
      variant="search"
      title="No results found"
      description={
        searchTerm
          ? `We couldn't find any results for "${searchTerm}". Try adjusting your search terms.`
          : "No results match your search criteria. Try adjusting your filters."
      }
      action={
        onClearSearch
          ? {
              label: "Clear search",
              onClick: onClearSearch,
              variant: "outline",
            }
          : undefined
      }
      className={className}
    />
  );
}

/**
 * Empty state for empty inbox/list
 */
export function EmptyList({
  title = "No items yet",
  description = "Get started by creating your first item.",
  actionLabel = "Create new",
  onAction,
  className,
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={Inbox}
      title={title}
      description={description}
      action={
        onAction
          ? {
              label: actionLabel,
              onClick: onAction,
            }
          : undefined
      }
      className={className}
    />
  );
}

/**
 * Empty state for errors
 */
export function EmptyError({
  title = "Something went wrong",
  description = "We encountered an error loading this content. Please try again.",
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={AlertCircle}
      variant="error"
      title={title}
      description={description}
      action={
        onRetry
          ? {
              label: "Try again",
              onClick: onRetry,
              variant: "outline",
            }
          : undefined
      }
      className={className}
    />
  );
}

/**
 * Empty state for successful completion
 */
export function EmptySuccess({
  title = "All done!",
  description = "You've completed everything. Great work!",
  actionLabel,
  onAction,
  className,
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={CheckCircle}
      variant="success"
      title={title}
      description={description}
      action={
        onAction && actionLabel
          ? {
              label: actionLabel,
              onClick: onAction,
            }
          : undefined
      }
      className={className}
    />
  );
}
