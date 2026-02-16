/**
 * ProgressCard - Reusable component for showing completion progress
 * US-standard: Clean, visual, actionable
 */

import React from 'react';
import { CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';

interface ProgressCardProps {
  title: string;
  current: number;
  total: number;
  unit?: string;
  color?: 'green' | 'blue' | 'purple' | 'red' | 'yellow';
  showTrend?: boolean;
  trend?: number; // percentage change
  actionLabel?: string;
  onAction?: () => void;
}

const COLOR_CLASSES = {
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    progress: 'bg-green-500',
    button: 'bg-green-600 hover:bg-green-700'
  },
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    progress: 'bg-blue-500',
    button: 'bg-blue-600 hover:bg-blue-700'
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    progress: 'bg-purple-500',
    button: 'bg-purple-600 hover:bg-purple-700'
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    progress: 'bg-red-500',
    button: 'bg-red-600 hover:bg-red-700'
  },
  yellow: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    progress: 'bg-yellow-500',
    button: 'bg-yellow-600 hover:bg-yellow-700'
  }
};

export default function ProgressCard({
  title,
  current,
  total,
  unit = 'items',
  color = 'blue',
  showTrend = false,
  trend,
  actionLabel,
  onAction
}: ProgressCardProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const colors = COLOR_CLASSES[color];
  const isComplete = current === total && total > 0;

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-lg p-6 transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${colors.text}`}>
              {current}/{total}
            </span>
            <span className="text-sm text-gray-500">{unit}</span>
          </div>
        </div>
        {isComplete && (
          <CheckCircle2 className="h-6 w-6 text-green-500" />
        )}
        {!isComplete && showTrend && trend !== undefined && (
          <div className={`flex items-center gap-1 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp className={`h-4 w-4 ${trend < 0 ? 'rotate-180' : ''}`} />
            <span className="text-xs font-semibold">{Math.abs(trend)}%</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600">Progress</span>
          <span className={`text-sm font-bold ${colors.text}`}>{percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`${colors.progress} h-2 rounded-full transition-all duration-500 ease-out`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Action Button */}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className={`w-full ${colors.button} text-white px-4 py-2 rounded-lg transition font-medium text-sm`}
        >
          {actionLabel}
        </button>
      )}

      {/* Status Indicator */}
      {!isComplete && current === 0 && (
        <div className="flex items-center gap-2 mt-3 text-xs text-gray-600">
          <AlertTriangle className="h-3 w-3" />
          <span>Not started yet</span>
        </div>
      )}
    </div>
  );
}
