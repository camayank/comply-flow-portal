/**
 * Enhanced Toast Utilities
 * Provides contextual toast notifications with undo actions
 */

import { toast as baseToast } from "@/hooks/use-toast";

interface ToastOptions {
  title: string;
  description?: string;
  duration?: number;
}

interface UndoableToastOptions extends ToastOptions {
  onUndo: () => void;
  undoLabel?: string;
}

/**
 * Standard success toast
 */
export function showSuccessToast(options: ToastOptions) {
  return baseToast({
    title: options.title,
    description: options.description,
    duration: options.duration || 3000,
    className: "bg-success/10 border-success/20 text-success-foreground",
  });
}

/**
 * Standard error toast
 */
export function showErrorToast(options: ToastOptions) {
  return baseToast({
    title: options.title,
    description: options.description,
    duration: options.duration || 5000,
    variant: "destructive",
  });
}

/**
 * Standard warning toast
 */
export function showWarningToast(options: ToastOptions) {
  return baseToast({
    title: options.title,
    description: options.description,
    duration: options.duration || 4000,
    className: "bg-warning/10 border-warning/20 text-warning-foreground",
  });
}

/**
 * Info toast
 */
export function showInfoToast(options: ToastOptions) {
  return baseToast({
    title: options.title,
    description: options.description,
    duration: options.duration || 3000,
    className: "bg-primary/10 border-primary/20",
  });
}

/**
 * Toast with undo action
 * Perfect for delete operations or reversible actions
 */
export function showUndoableToast(options: UndoableToastOptions) {
  return baseToast({
    title: options.title,
    description: options.description,
    duration: options.duration || 5000,
    action: {
      label: options.undoLabel || "Undo",
      onClick: options.onUndo,
    },
  });
}

/**
 * Loading toast for async operations
 * Returns a function to dismiss the toast
 */
export function showLoadingToast(message: string) {
  const { dismiss } = baseToast({
    title: message,
    duration: Infinity,
    className: "bg-primary/10 border-primary/20",
  });

  return {
    dismiss,
    success: (successMessage: string) => {
      dismiss();
      showSuccessToast({ title: successMessage });
    },
    error: (errorMessage: string) => {
      dismiss();
      showErrorToast({ title: errorMessage });
    },
  };
}

/**
 * Progress toast for long-running operations
 */
export function showProgressToast(title: string) {
  let currentToast: { dismiss: () => void } | null = null;

  return {
    update: (message: string, progress?: number) => {
      if (currentToast) {
        currentToast.dismiss();
      }
      currentToast = baseToast({
        title,
        description: progress !== undefined ? `${message} (${progress}%)` : message,
        duration: Infinity,
        className: "bg-primary/10 border-primary/20",
      });
    },
    complete: (successMessage: string) => {
      if (currentToast) {
        currentToast.dismiss();
      }
      showSuccessToast({ title: successMessage });
    },
    fail: (errorMessage: string) => {
      if (currentToast) {
        currentToast.dismiss();
      }
      showErrorToast({ title: errorMessage });
    },
  };
}

/**
 * Contextual toast messages for common operations
 */
export const ToastMessages = {
  // Entity operations
  entityCreated: (name: string) =>
    showSuccessToast({
      title: "Entity created",
      description: `${name} has been successfully registered`,
    }),

  entityUpdated: (name: string) =>
    showSuccessToast({
      title: "Entity updated",
      description: `${name} has been successfully updated`,
    }),

  entityDeleted: (name: string, onUndo: () => void) =>
    showUndoableToast({
      title: "Entity deleted",
      description: `${name} has been removed`,
      onUndo,
    }),

  // Document operations
  documentUploaded: (filename: string) =>
    showSuccessToast({
      title: "Document uploaded",
      description: `${filename} has been uploaded successfully`,
    }),

  documentDeleted: (filename: string, onUndo: () => void) =>
    showUndoableToast({
      title: "Document deleted",
      description: `${filename} has been removed`,
      onUndo,
    }),

  // Service operations
  serviceRequested: (serviceName: string) =>
    showSuccessToast({
      title: "Service requested",
      description: `Your ${serviceName} request has been submitted`,
    }),

  serviceCompleted: (serviceName: string) =>
    showSuccessToast({
      title: "Service completed",
      description: `${serviceName} has been successfully completed`,
    }),

  // Payment operations
  paymentProcessing: () =>
    showLoadingToast("Processing payment..."),

  paymentSuccess: (amount: string) =>
    showSuccessToast({
      title: "Payment successful",
      description: `Payment of ${amount} has been processed`,
    }),

  paymentFailed: (reason?: string) =>
    showErrorToast({
      title: "Payment failed",
      description: reason || "Please check your payment details and try again",
    }),

  // General operations
  changesSaved: () =>
    showSuccessToast({
      title: "Changes saved",
      description: "Your changes have been saved successfully",
    }),

  operationFailed: (operation: string) =>
    showErrorToast({
      title: `${operation} failed`,
      description: "Please try again or contact support if the problem persists",
    }),

  networkError: () =>
    showErrorToast({
      title: "Network error",
      description: "Please check your internet connection and try again",
    }),

  permissionDenied: () =>
    showErrorToast({
      title: "Permission denied",
      description: "You don't have permission to perform this action",
    }),
};
