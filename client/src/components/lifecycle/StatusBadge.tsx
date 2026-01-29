/**
 * StatusBadge - Consistent status indicators across platform
 * Following Stripe's design system
 */

import React from 'react';
import { CheckCircle2, Clock, XCircle, AlertTriangle, Circle } from 'lucide-react';

type StatusType = 
  | 'completed' | 'verified' | 'approved'
  | 'pending' | 'in_progress' | 'processing'
  | 'missing' | 'rejected' | 'failed'
  | 'warning' | 'expiring'
  | 'neutral';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const STATUS_CONFIG = {
  completed: {
    icon: CheckCircle2,
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-300',
    label: 'Completed'
  },
  verified: {
    icon: CheckCircle2,
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-300',
    label: 'Verified'
  },
  approved: {
    icon: CheckCircle2,
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-300',
    label: 'Approved'
  },
  pending: {
    icon: Clock,
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    border: 'border-yellow-300',
    label: 'Pending'
  },
  in_progress: {
    icon: Clock,
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-300',
    label: 'In Progress'
  },
  processing: {
    icon: Clock,
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-300',
    label: 'Processing'
  },
  missing: {
    icon: XCircle,
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
    label: 'Missing'
  },
  rejected: {
    icon: XCircle,
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
    label: 'Rejected'
  },
  failed: {
    icon: XCircle,
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
    label: 'Failed'
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    border: 'border-orange-300',
    label: 'Warning'
  },
  expiring: {
    icon: AlertTriangle,
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    border: 'border-orange-300',
    label: 'Expiring Soon'
  },
  neutral: {
    icon: Circle,
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-300',
    label: 'Neutral'
  }
};

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-2 text-base'
};

const ICON_SIZE_CLASSES = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5'
};

export default function StatusBadge({
  status,
  label,
  size = 'md',
  showIcon = true
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const displayLabel = label || config.label;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${config.bg} ${config.text} ${config.border} ${SIZE_CLASSES[size]}`}
    >
      {showIcon && <Icon className={ICON_SIZE_CLASSES[size]} />}
      <span>{displayLabel}</span>
    </span>
  );
}
