import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, Home } from "lucide-react";
import { Link } from "wouter";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageShellProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageShell({
  title,
  subtitle,
  breadcrumbs = [],
  actions,
  children,
  className,
}: PageShellProps) {
  return (
    <div className={cn("min-h-screen bg-slate-50", className)}>
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1 text-sm text-slate-500 mb-2">
            <Link href="/" className="hover:text-slate-700">
              <Home className="h-4 w-4" />
            </Link>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                <ChevronRight className="h-4 w-4" />
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-slate-700">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-slate-900">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            {subtitle && (
              <p className="text-sm text-slate-600 mt-1">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}
