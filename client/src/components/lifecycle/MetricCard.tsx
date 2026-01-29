/**
 * MetricCard - Display key metrics with visual appeal
 * Carta/Stripe-inspired design
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';
  trend?: {
    value: number;
    direction: 'up' | 'down';
    label?: string;
  };
  onClick?: () => void;
}

const COLOR_CLASSES = {
  blue: 'bg-blue-50 border-blue-200 text-blue-700',
  green: 'bg-green-50 border-green-200 text-green-700',
  red: 'bg-red-50 border-red-200 text-red-700',
  yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  purple: 'bg-purple-50 border-purple-200 text-purple-700',
  gray: 'bg-gray-50 border-gray-200 text-gray-700'
};

const ICON_COLOR_CLASSES = {
  blue: 'text-blue-600',
  green: 'text-green-600',
  red: 'text-red-600',
  yellow: 'text-yellow-600',
  purple: 'text-purple-600',
  gray: 'text-gray-600'
};

export default function MetricCard({
  label,
  value,
  subtext,
  icon: Icon,
  color = 'gray',
  trend,
  onClick
}: MetricCardProps) {
  const colorClass = COLOR_CLASSES[color];
  const iconColorClass = ICON_COLOR_CLASSES[color];

  return (
    <div
      onClick={onClick}
      className={`${colorClass} border-2 rounded-lg p-6 transition-all ${
        onClick ? 'cursor-pointer hover:shadow-lg hover:scale-105' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="text-sm font-medium text-gray-600">{label}</div>
        {Icon && (
          <div className={`p-2 bg-white rounded-lg ${iconColorClass}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="mb-2">
        <div className="text-3xl font-bold text-gray-900">{value}</div>
      </div>

      {subtext && (
        <div className="text-sm text-gray-600 mb-2">{subtext}</div>
      )}

      {trend && (
        <div className={`flex items-center gap-1 text-sm font-medium ${
          trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
        }`}>
          <span>{trend.direction === 'up' ? '↑' : '↓'}</span>
          <span>{trend.value}%</span>
          {trend.label && <span className="text-gray-500 ml-1">{trend.label}</span>}
        </div>
      )}
    </div>
  );
}
