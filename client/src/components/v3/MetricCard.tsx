import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
  };
  icon?: LucideIcon;
  accentColor?: "blue" | "green" | "orange" | "red" | "purple" | "teal";
  className?: string;
}

const accentColors = {
  blue: "border-l-blue-600",
  green: "border-l-emerald-600",
  orange: "border-l-orange-500",
  red: "border-l-red-600",
  purple: "border-l-purple-600",
  teal: "border-l-teal-600",
};

const trendColors = {
  up: "text-emerald-600",
  down: "text-red-600",
  neutral: "text-slate-500",
};

export function MetricCard({
  label,
  value,
  trend,
  icon: Icon,
  accentColor = "blue",
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-slate-200 shadow-sm p-5",
        "border-l-4",
        accentColors[accentColor],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          {trend && (
            <p className={cn("text-sm", trendColors[trend.direction])}>
              {trend.direction === "up" && "↑ "}
              {trend.direction === "down" && "↓ "}
              {trend.value}
            </p>
          )}
        </div>
        {Icon && (
          <div className="p-2 bg-slate-100 rounded-lg">
            <Icon className="h-5 w-5 text-slate-600" />
          </div>
        )}
      </div>
    </div>
  );
}
