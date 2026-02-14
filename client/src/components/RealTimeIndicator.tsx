/**
 * Real-time Connection Indicator
 * Shows WebSocket connection status and live update activity
 */

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Wifi, WifiOff, RefreshCw, Activity, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRealTimeUpdates, ConnectionState } from '@/hooks/useRealTimeUpdates';

interface RealTimeIndicatorProps {
  variant?: 'badge' | 'icon' | 'full';
  showLastUpdate?: boolean;
  className?: string;
}

const getStatusConfig = (state: ConnectionState) => {
  switch (state) {
    case 'connected':
      return {
        icon: Wifi,
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-500',
        label: 'Live',
        description: 'Real-time updates active'
      };
    case 'connecting':
      return {
        icon: RefreshCw,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500',
        label: 'Connecting',
        description: 'Establishing connection...'
      };
    case 'reconnecting':
      return {
        icon: RefreshCw,
        color: 'text-amber-500',
        bgColor: 'bg-amber-500',
        label: 'Reconnecting',
        description: 'Connection lost, retrying...'
      };
    case 'disconnected':
      return {
        icon: WifiOff,
        color: 'text-gray-400',
        bgColor: 'bg-gray-400',
        label: 'Offline',
        description: 'Real-time updates paused'
      };
  }
};

export function RealTimeIndicator({
  variant = 'badge',
  showLastUpdate = false,
  className
}: RealTimeIndicatorProps) {
  const { connectionState, lastEvent, requestSync, isConnecting } = useRealTimeUpdates();
  const [pulse, setPulse] = useState(false);

  const config = getStatusConfig(connectionState);
  const Icon = config.icon;

  // Pulse animation when new event received
  useEffect(() => {
    if (lastEvent) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [lastEvent]);

  const formatLastUpdate = () => {
    if (!lastEvent?.timestamp) return 'Never';
    const date = new Date(lastEvent.timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return date.toLocaleTimeString();
  };

  if (variant === 'icon') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("relative h-8 w-8", className)}
            onClick={() => requestSync()}
            disabled={isConnecting}
          >
            <Icon className={cn(
              "h-4 w-4 transition-colors",
              config.color,
              isConnecting && "animate-spin"
            )} />
            {connectionState === 'connected' && (
              <span className={cn(
                "absolute top-1 right-1 h-2 w-2 rounded-full",
                config.bgColor,
                pulse && "animate-ping"
              )} />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{config.label}</p>
          <p className="text-xs text-muted-foreground">{config.description}</p>
          {showLastUpdate && lastEvent && (
            <p className="text-xs text-muted-foreground mt-1">
              Last update: {formatLastUpdate()}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  if (variant === 'full') {
    return (
      <div className={cn(
        "flex items-center gap-3 p-3 rounded-lg border",
        connectionState === 'connected' ? "border-emerald-200 bg-emerald-50" :
        connectionState === 'reconnecting' ? "border-amber-200 bg-amber-50" :
        "border-gray-200 bg-gray-50",
        className
      )}>
        <div className="relative">
          <Icon className={cn(
            "h-5 w-5",
            config.color,
            isConnecting && "animate-spin"
          )} />
          {connectionState === 'connected' && (
            <span className={cn(
              "absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white",
              config.bgColor,
              pulse && "animate-pulse"
            )} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{config.label}</span>
            {connectionState === 'connected' && (
              <Activity className={cn(
                "h-3 w-3 text-emerald-500",
                pulse && "animate-pulse"
              )} />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {showLastUpdate && lastEvent ? `Updated ${formatLastUpdate()}` : config.description}
          </p>
        </div>
        {connectionState === 'disconnected' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.reload()}
            className="shrink-0"
          >
            Reconnect
          </Button>
        )}
      </div>
    );
  }

  // Badge variant (default)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            "gap-1.5 cursor-default",
            connectionState === 'connected' && "border-emerald-300 text-emerald-700 bg-emerald-50",
            connectionState === 'reconnecting' && "border-amber-300 text-amber-700 bg-amber-50",
            connectionState === 'connecting' && "border-blue-300 text-blue-700 bg-blue-50",
            connectionState === 'disconnected' && "border-gray-300 text-gray-500",
            className
          )}
        >
          <Circle className={cn(
            "h-2 w-2 fill-current",
            pulse && "animate-pulse"
          )} />
          <span className="text-xs">{config.label}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>{config.description}</p>
        {showLastUpdate && lastEvent && (
          <p className="text-xs text-muted-foreground mt-1">
            Last update: {formatLastUpdate()}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export default RealTimeIndicator;
