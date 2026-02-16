/**
 * ActionButton - Consistent CTA buttons across platform
 * Following US SaaS best practices
 */

import React from 'react';
import { LucideIcon, ArrowRight, ExternalLink } from 'lucide-react';

interface ActionButtonProps {
  label: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  showArrow?: boolean;
  external?: boolean;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

const VARIANT_CLASSES = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 border-indigo-600',
  secondary: 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300',
  danger: 'bg-red-600 text-white hover:bg-red-700 border-red-600',
  success: 'bg-green-600 text-white hover:bg-green-700 border-green-600',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 border-transparent'
};

const SIZE_CLASSES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg'
};

const ICON_SIZE_CLASSES = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6'
};

export default function ActionButton({
  label,
  onClick,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  showArrow = false,
  external = false,
  disabled = false,
  loading = false,
  fullWidth = false
}: ActionButtonProps) {
  const variantClass = VARIANT_CLASSES[variant];
  const sizeClass = SIZE_CLASSES[size];
  const iconSizeClass = ICON_SIZE_CLASSES[size];

  const EndIcon = external ? ExternalLink : showArrow ? ArrowRight : null;

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${variantClass}
        ${sizeClass}
        ${fullWidth ? 'w-full' : ''}
        inline-flex items-center justify-center gap-2
        font-medium rounded-lg border-2 transition-all
        disabled:opacity-50 disabled:cursor-not-allowed
        hover:shadow-md active:scale-95
      `}
    >
      {loading && (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
      )}

      {!loading && Icon && iconPosition === 'left' && (
        <Icon className={iconSizeClass} />
      )}

      <span>{label}</span>

      {!loading && Icon && iconPosition === 'right' && (
        <Icon className={iconSizeClass} />
      )}

      {!loading && EndIcon && (
        <EndIcon className={iconSizeClass} />
      )}
    </button>
  );
}
