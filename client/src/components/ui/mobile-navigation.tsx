import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Menu, X, Home, User, Bell } from 'lucide-react';

// Standardized Mobile Navigation Components
interface MobileNavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  badge?: number;
  onClick?: () => void;
}

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  leftIcon?: React.ReactNode;
  rightActions?: React.ReactNode;
  notifications?: number;
  onMenuToggle?: () => void;
  className?: string;
}

export function MobileHeader({ 
  title, 
  subtitle, 
  leftIcon, 
  rightActions, 
  notifications = 0,
  onMenuToggle,
  className 
}: MobileHeaderProps) {
  return (
    <header className={cn(
      "sticky top-0 z-50 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800",
      className
    )}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden p-2"
            onClick={onMenuToggle}
            data-testid="button-mobile-menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            {leftIcon && <div className="text-blue-600">{leftIcon}</div>}
            <div>
              <h1 className="font-bold text-lg text-gray-900 dark:text-white">{title}</h1>
              {subtitle && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs px-3" data-testid="button-notifications-mobile">
            <Bell className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Alerts</span>
            {notifications > 0 && (
              <Badge className="ml-1 bg-red-500 text-white text-xs px-1 py-0 min-w-[16px] h-4">
                {notifications}
              </Badge>
            )}
          </Button>
          {rightActions}
        </div>
      </div>
    </header>
  );
}

interface MobileNavigationMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: MobileNavItem[];
  className?: string;
}

export function MobileNavigationMenu({ 
  isOpen, 
  onClose, 
  items, 
  className 
}: MobileNavigationMenuProps) {
  if (!isOpen) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-40">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50" 
        onClick={onClose}
      />
      
      {/* Slide-out menu */}
      <div className={cn(
        "fixed left-0 top-0 h-full w-80 max-w-[80vw] bg-white dark:bg-gray-900 shadow-xl transform transition-transform duration-200 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full",
        className
      )}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-lg text-gray-900 dark:text-white">Menu</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2"
            data-testid="button-close-mobile-menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <ScrollArea className="flex-1 p-4">
          <nav className="space-y-2">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  item.onClick?.();
                  onClose();
                }}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-colors",
                  item.active 
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300" 
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
                data-testid={`nav-item-${item.id}`}
              >
                {item.icon && <div className="h-4 w-4">{item.icon}</div>}
                <span className="flex-1">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[18px] h-4">
                    {item.badge}
                  </Badge>
                )}
              </button>
            ))}
          </nav>
        </ScrollArea>
      </div>
    </div>
  );
}

interface MobileTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
    badge?: number;
  }>;
  className?: string;
}

export function MobileTabs({ 
  activeTab, 
  onTabChange, 
  tabs, 
  className 
}: MobileTabsProps) {
  return (
    <div className={cn("bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800", className)}>
      <ScrollArea className="w-full">
        <div className="flex px-4 py-2 gap-1 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
              data-testid={`tab-${tab.id}`}
            >
              {tab.icon && <div className="h-4 w-4">{tab.icon}</div>}
              <span>{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <Badge className="bg-red-500 text-white text-xs px-1 py-0 min-w-[16px] h-3">
                  {tab.badge}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface MobileCardProps {
  title: string;
  subtitle?: string;
  value?: string | number;
  status?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function MobileCard({ 
  title, 
  subtitle, 
  value, 
  status, 
  icon, 
  actions, 
  onClick,
  className,
  children
}: MobileCardProps) {
  const getStatusColor = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || '';
    if (['completed', 'approved', 'active', 'success'].includes(normalizedStatus)) {
      return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-300';
    }
    if (['in_progress', 'processing', 'pending'].includes(normalizedStatus)) {
      return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300';
    }
    if (['warning', 'due_soon', 'attention'].includes(normalizedStatus)) {
      return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-300';
    }
    if (['failed', 'rejected', 'error', 'overdue'].includes(normalizedStatus)) {
      return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-300';
    }
    return 'text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-300';
  };

  return (
    <div 
      className={cn(
        "bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm",
        onClick && "cursor-pointer hover:shadow-md transition-shadow",
        className
      )}
      onClick={onClick}
      data-testid={`card-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {icon && (
            <div className="mt-1 text-blue-600 flex-shrink-0">
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 dark:text-white truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                {subtitle}
              </p>
            )}
            {value && (
              <div className="text-lg font-semibold text-gray-900 dark:text-white mt-2">
                {value}
              </div>
            )}
            {status && (
              <Badge 
                className={cn(
                  "text-xs font-medium mt-2 capitalize",
                  getStatusColor(status)
                )}
              >
                {status.replace(/_/g, ' ')}
              </Badge>
            )}
            {children && (
              <div className="mt-3">
                {children}
              </div>
            )}
          </div>
        </div>
        {actions && (
          <div className="ml-3 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

interface MobileLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileLayout({ children, className }: MobileLayoutProps) {
  return (
    <div className={cn("min-h-screen bg-gray-50 dark:bg-gray-900/50", className)}>
      {children}
    </div>
  );
}

interface MobileContentProps {
  children: React.ReactNode;
  padding?: boolean;
  className?: string;
}

export function MobileContent({ children, padding = true, className }: MobileContentProps) {
  return (
    <main className={cn(
      "flex-1 space-y-4",
      padding && "px-4 py-4",
      className
    )}>
      {children}
    </main>
  );
}