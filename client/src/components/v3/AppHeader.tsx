import * as React from "react";
import { cn } from "@/lib/utils";
import { Bell, Search, Menu, User, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppHeaderProps {
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  notificationCount?: number;
  onMenuClick?: () => void;
  onLogout?: () => void;
  showMobileMenu?: boolean;
  className?: string;
}

export function AppHeader({
  user,
  notificationCount = 0,
  onMenuClick,
  onLogout,
  showMobileMenu = false,
  className,
}: AppHeaderProps) {
  return (
    <header
      className={cn(
        "h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between sticky top-0 z-40",
        className
      )}
    >
      <div className="flex items-center gap-4">
        {showMobileMenu && onMenuClick && (
          <button
            onClick={onMenuClick}
            className="p-2 rounded-md hover:bg-slate-100 lg:hidden"
          >
            <Menu className="h-5 w-5 text-slate-600" />
          </button>
        )}
        <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-md px-3 py-2 w-64">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-400 w-full"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className="relative p-2 rounded-md hover:bg-slate-100">
          <Bell className="h-5 w-5 text-slate-600" />
          {notificationCount > 0 && (
            <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </button>
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-100">
                <div className="h-8 w-8 bg-slate-900 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="hidden md:block text-sm font-medium text-slate-700">
                  {user.name}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="h-4 w-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-red-600">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
