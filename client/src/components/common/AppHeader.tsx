/**
 * Standard App Header Component
 * Consistent header across all authenticated pages
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, Search, Menu, User, Settings, LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link } from 'wouter';

interface AppHeaderProps {
  /**
   * Page title (shown in mobile)
   */
  title?: string;
  
  /**
   * Show search button
   */
  showSearch?: boolean;
  
  /**
   * Search click handler
   */
  onSearchClick?: () => void;
  
  /**
   * Notification count
   */
  notificationCount?: number;
  
  /**
   * Notifications click handler
   */
  onNotificationsClick?: () => void;
  
  /**
   * Menu button click (for opening mobile sidebar)
   */
  onMenuClick?: () => void;
  
  /**
   * User information
   */
  user?: {
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  };
  
  /**
   * Profile link
   */
  profileHref?: string;
  
  /**
   * Settings link
   */
  settingsHref?: string;
  
  /**
   * Logout handler
   */
  onLogout?: () => void;
  
  /**
   * Additional actions in header
   */
  actions?: React.ReactNode;
  
  /**
   * Additional className
   */
  className?: string;
}

export function AppHeader({
  title,
  showSearch,
  onSearchClick,
  notificationCount = 0,
  onNotificationsClick,
  onMenuClick,
  user,
  profileHref = '/profile',
  settingsHref = '/settings',
  onLogout,
  actions,
  className,
}: AppHeaderProps) {
  return (
    <header 
      className={cn(
        'sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60',
        className
      )}
    >
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          {onMenuClick && (
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={onMenuClick}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          
          {title && (
            <h1 className="text-lg font-semibold text-foreground lg:hidden">
              {title}
            </h1>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Search */}
          {showSearch && onSearchClick && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onSearchClick}
              aria-label="Search"
              className="hidden sm:flex"
            >
              <Search className="h-5 w-5" />
            </Button>
          )}

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={onNotificationsClick}
            aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount} unread)` : ''}`}
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {notificationCount > 9 ? '9+' : notificationCount}
              </Badge>
            )}
          </Button>

          {/* Custom Actions */}
          {actions}

          {/* User Menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="hidden sm:flex gap-2 px-2"
                  aria-label="User menu"
                >
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                    {user.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt={user.name}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-4 w-4 text-primary-foreground" />
                    )}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.role || user.email}</p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground font-normal">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={profileHref}>
                    <a className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </a>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={settingsHref}>
                    <a className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </a>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {onLogout && (
                  <DropdownMenuItem onClick={onLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
