/**
 * useToast - Smart notification hook with toast
 * Provides consistent feedback across platform
 */

import { toast } from 'sonner';

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'promise';

interface ToastOptions {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

interface PromiseToastOptions {
  loading: string;
  success: string | ((data: any) => string);
  error: string | ((error: any) => string);
}

export function useToast() {
  const showToast = (type: ToastType, options: ToastOptions) => {
    const message = options.title || options.description || '';
    const config: any = {
      description: options.description,
      duration: options.duration || 4000
    };

    if (options.action) {
      config.action = {
        label: options.action.label,
        onClick: options.action.onClick
      };
    }

    switch (type) {
      case 'success':
        toast.success(message, config);
        break;
      case 'error':
        toast.error(message, config);
        break;
      case 'warning':
        toast.warning(message, config);
        break;
      case 'info':
        toast.info(message, config);
        break;
    }
  };

  const promiseToast = <T,>(
    promise: Promise<T>,
    options: PromiseToastOptions
  ): Promise<T> => {
    toast.promise(promise, {
      loading: options.loading,
      success: options.success,
      error: options.error
    });
    return promise;
  };

  return {
    success: (options: ToastOptions) => showToast('success', options),
    error: (options: ToastOptions) => showToast('error', options),
    warning: (options: ToastOptions) => showToast('warning', options),
    info: (options: ToastOptions) => showToast('info', options),
    promise: promiseToast
  };
}

// Pre-configured toasts for common actions
export const TOAST_MESSAGES = {
  // Document actions
  documentUploaded: (name: string) => ({
    title: 'Document uploaded!',
    description: `${name} has been uploaded successfully and is being verified.`
  }),
  documentVerified: (name: string) => ({
    title: 'Document verified!',
    description: `${name} has been verified. Your compliance score improved.`
  }),
  documentRejected: (name: string, reason: string) => ({
    title: 'Document rejected',
    description: `${name} was rejected: ${reason}. Please re-upload.`
  }),

  // Service actions
  serviceSubscribed: (name: string) => ({
    title: 'Service subscribed!',
    description: `You're now subscribed to ${name}. Our team will be in touch.`
  }),
  serviceCancelled: (name: string) => ({
    title: 'Service cancelled',
    description: `${name} has been cancelled. Your compliance score may be affected.`
  }),

  // Compliance actions
  checkpointCompleted: (name: string) => ({
    title: 'Checkpoint completed!',
    description: `${name} is now marked as complete. Great work!`
  }),
  deadlineApproaching: (name: string, days: number) => ({
    title: 'Deadline approaching',
    description: `${name} is due in ${days} day${days !== 1 ? 's' : ''}. Take action now.`
  }),
  complianceGreen: () => ({
    title: 'Compliance status: GREEN! 🎉',
    description: 'All checkpoints are up to date. Your business is fully compliant.'
  }),
  complianceRed: () => ({
    title: 'Compliance status: RED',
    description: 'Critical checkpoints are overdue. Immediate action required.'
  }),

  // Funding actions
  fundingScoreImproved: (oldScore: number, newScore: number) => ({
    title: 'Funding score improved!',
    description: `Your score increased from ${oldScore} to ${newScore}. Keep it up!`
  }),
  fundingReady: () => ({
    title: 'Funding ready! 🚀',
    description: 'You\'ve reached 85+ score. You\'re ready to pitch investors.'
  }),

  // General
  saveSuccess: () => ({
    title: 'Changes saved',
    description: 'Your changes have been saved successfully.'
  }),
  saveError: () => ({
    title: 'Save failed',
    description: 'Failed to save changes. Please try again.'
  }),
  networkError: () => ({
    title: 'Connection error',
    description: 'Unable to connect to server. Check your internet connection.'
  })
};
