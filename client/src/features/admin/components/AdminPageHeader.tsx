import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { LucideIcon, Plus, RefreshCw } from 'lucide-react';

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  onAdd?: () => void;
  addLabel?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function AdminPageHeader({
  title,
  description,
  icon: Icon,
  actions,
  onAdd,
  addLabel = 'Add New',
  onRefresh,
  isRefreshing = false,
}: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        )}
        {onAdd && (
          <Button onClick={onAdd} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {addLabel}
          </Button>
        )}
        {actions}
      </div>
    </div>
  );
}
