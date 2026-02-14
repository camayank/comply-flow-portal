import { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: ReactNode;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  badge?: ReactNode;
  backLink?: { label: string; href: string };
  className?: string;
  compact?: boolean;
}

// Route to breadcrumb mapping
const routeBreadcrumbMap: Record<string, { label: string; parent?: string }> = {
  '/': { label: 'Home' },
  '/dashboard': { label: 'Dashboard' },
  '/portal-v2': { label: 'Client Portal' },
  '/executive-summary': { label: 'Executive Summary', parent: '/portal-v2' },
  '/compliance-calendar': { label: 'Compliance Calendar', parent: '/portal-v2' },
  '/vault': { label: 'Document Vault', parent: '/portal-v2' },
  '/my-services': { label: 'My Services', parent: '/portal-v2' },
  '/messages': { label: 'Messages', parent: '/portal-v2' },
  '/notifications': { label: 'Notifications' },
  '/founder': { label: 'Founder Dashboard' },
  '/compliance-state': { label: 'Compliance State', parent: '/founder' },

  // Operations routes
  '/operations': { label: 'Operations' },
  '/ops': { label: 'Operations' },
  '/work-queue': { label: 'Work Queue', parent: '/operations' },
  '/document-review': { label: 'Document Review', parent: '/operations' },
  '/escalations': { label: 'Escalations', parent: '/operations' },

  // Admin routes
  '/admin': { label: 'Admin' },
  '/admin/blueprints': { label: 'Blueprints', parent: '/admin' },
  '/admin/clients': { label: 'Clients', parent: '/admin' },
  '/admin/users': { label: 'Users', parent: '/admin' },
  '/admin/webhooks': { label: 'Webhooks', parent: '/admin' },
  '/admin/api-keys': { label: 'API Keys', parent: '/admin' },
  '/admin/access-reviews': { label: 'Access Reviews', parent: '/admin' },
  '/config': { label: 'Configuration', parent: '/admin' },
  '/bulk-upload': { label: 'Bulk Upload', parent: '/admin' },

  // Sales routes
  '/sales': { label: 'Sales' },
  '/leads': { label: 'Lead Management', parent: '/sales' },
  '/lead-pipeline': { label: 'Pipeline', parent: '/sales' },
  '/proposals': { label: 'Proposals', parent: '/sales' },
  '/pre-sales': { label: 'Pre-Sales', parent: '/sales' },

  // Agent routes
  '/agent': { label: 'Agent Portal' },
  '/agent/dashboard': { label: 'Dashboard', parent: '/agent' },
  '/agent/leads': { label: 'Leads', parent: '/agent' },
  '/agent/commissions': { label: 'Commissions', parent: '/agent' },
  '/agent/performance': { label: 'Performance', parent: '/agent' },

  // QC routes
  '/qc': { label: 'Quality Control' },
  '/qc/queue': { label: 'QC Queue', parent: '/qc' },
  '/qc-delivery-handoff': { label: 'Delivery Handoff', parent: '/qc' },
  '/quality-metrics': { label: 'Quality Metrics', parent: '/qc' },

  // Compliance routes
  '/compliance-dashboard': { label: 'Compliance Dashboard' },
  '/compliance-management': { label: 'Compliance Management' },
  '/compliance/audit-log': { label: 'Audit Log', parent: '/compliance-management' },
  '/compliance/data-requests': { label: 'Data Requests', parent: '/compliance-management' },

  // Customer Success routes
  '/customer-success/playbooks': { label: 'Playbooks' },
  '/customer-success/renewals': { label: 'Renewal Pipeline' },

  // Analytics
  '/analytics': { label: 'Analytics' },
  '/executive-dashboard': { label: 'Executive Dashboard', parent: '/analytics' },
  '/business-intelligence': { label: 'Business Intelligence', parent: '/analytics' },
  '/financial-management': { label: 'Financial Management', parent: '/analytics' },

  // Support
  '/support': { label: 'Support' },
  '/tickets': { label: 'Tickets', parent: '/support' },
  '/customer-service': { label: 'Customer Service', parent: '/support' },
};

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = [{ label: 'Home', href: '/', icon: <Home className="h-4 w-4" /> }];

  const routeInfo = routeBreadcrumbMap[pathname];
  if (!routeInfo) {
    // Generate from pathname if not in map
    const segments = pathname.split('/').filter(Boolean);
    let currentPath = '';

    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === segments.length - 1;
      const label = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      crumbs.push({
        label,
        href: isLast ? undefined : currentPath
      });
    });

    return crumbs;
  }

  // Build breadcrumb chain from parent references
  const chain: { label: string; href: string }[] = [];
  let current: string | undefined = pathname;

  while (current && routeBreadcrumbMap[current]) {
    const info = routeBreadcrumbMap[current];
    chain.unshift({ label: info.label, href: current });
    current = info.parent;
  }

  chain.forEach((item, index) => {
    const isLast = index === chain.length - 1;
    crumbs.push({
      label: item.label,
      href: isLast ? undefined : item.href
    });
  });

  return crumbs;
}

export function Breadcrumbs({
  items,
  className,
  autoGenerate = false
}: {
  items?: BreadcrumbItem[];
  className?: string;
  autoGenerate?: boolean;
}) {
  const [location] = useLocation();

  const breadcrumbs = items || (autoGenerate ? generateBreadcrumbs(location) : []);

  if (breadcrumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center text-sm", className)}>
      <ol className="flex items-center flex-wrap gap-1">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground/50 shrink-0" />
              )}
              {crumb.href && !isLast ? (
                <Link
                  href={crumb.href}
                  className={cn(
                    "flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                  )}
                >
                  {crumb.icon}
                  <span>{crumb.label}</span>
                </Link>
              ) : (
                <span
                  className={cn(
                    "flex items-center gap-1.5",
                    isLast ? "text-foreground font-medium" : "text-muted-foreground"
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {crumb.icon}
                  <span>{crumb.label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  badge,
  backLink,
  className,
  compact = false
}: PageHeaderProps) {
  const [location] = useLocation();
  const autoBreadcrumbs = breadcrumbs || generateBreadcrumbs(location);

  return (
    <header
      className={cn(
        "border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        compact ? "py-3" : "py-4 md:py-6",
        className
      )}
    >
      <div className="container max-w-7xl mx-auto px-4 md:px-6">
        {/* Breadcrumbs */}
        {autoBreadcrumbs.length > 1 && (
          <Breadcrumbs items={autoBreadcrumbs} className="mb-2" />
        )}

        {/* Back link (alternative to breadcrumbs for modal-like pages) */}
        {backLink && (
          <Link
            href={backLink.href}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            {backLink.label}
          </Link>
        )}

        {/* Title Row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className={cn(
                "font-bold tracking-tight truncate",
                compact ? "text-xl" : "text-2xl md:text-3xl"
              )}>
                {title}
              </h1>
              {badge}
            </div>
            {description && (
              <p className={cn(
                "text-muted-foreground mt-1 line-clamp-2",
                compact ? "text-sm" : "text-sm md:text-base"
              )}>
                {description}
              </p>
            )}
          </div>

          {/* Actions */}
          {actions && (
            <div className="flex items-center gap-2 shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// Convenience component for pages that just need auto-generated breadcrumbs
export function AutoBreadcrumbs({ className }: { className?: string }) {
  return <Breadcrumbs autoGenerate className={className} />;
}

export default PageHeader;
