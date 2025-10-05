import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Building2, 
  Menu,
  X,
  LayoutDashboard,
  Zap,
  FileText,
  Shield,
  CheckSquare,
  File,
  Calendar,
  Settings,
  Users,
  UserCircle,
  LogOut,
  ChevronDown,
  Briefcase,
  Building,
  Workflow,
  TrendingUp,
  BarChart3
} from 'lucide-react';

interface NavigationProps {
  userRole?: 'client' | 'admin' | 'ops' | 'agent' | null;
  userName?: string;
  onLogout?: () => void;
}

export const SharedNavigation = ({ userRole, userName, onLogout }: NavigationProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();

  // Portal navigation based on role
  const portalLinks = {
    client: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/client-portal' },
      { label: 'My Services', icon: Briefcase, href: '/service-requests' },
      { label: 'Tasks', icon: CheckSquare, href: '/tasks' },
      { label: 'Documents', icon: File, href: '/documents' },
      { label: 'Compliance', icon: Calendar, href: '/compliance-dashboard' },
      { label: 'Payments', icon: TrendingUp, href: '/financials' },
      { label: 'Referrals', icon: Users, href: '/referrals' },
    ],
    admin: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
      { label: 'Services', icon: Settings, href: '/admin-config' },
      { label: 'Workflows', icon: Workflow, href: '/autocomply' },
      { label: 'Analytics', icon: TrendingUp, href: '/analytics' },
      { label: 'Users', icon: Users, href: '/admin' },
      { label: 'Integrations', icon: Building, href: '/admin' },
    ],
    ops: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/operations' },
      { label: 'Tasks', icon: CheckSquare, href: '/tasks' },
      { label: 'Service Requests', icon: Briefcase, href: '/service-requests' },
      { label: 'Team', icon: Users, href: '/operations' },
      { label: 'QC', icon: Shield, href: '/qc' },
      { label: 'Documents', icon: File, href: '/documents' },
    ],
    agent: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/agent' },
      { label: 'Leads', icon: Users, href: '/leads' },
      { label: 'Commissions', icon: TrendingUp, href: '/agent' },
      { label: 'Performance', icon: BarChart3, href: '/agent' },
    ],
  };

  const aiProducts = [
    { name: 'AutoComply', icon: Zap, href: '/autocomply', color: 'text-purple-600' },
    { name: 'TaxTracker', icon: FileText, href: '/taxtracker', color: 'text-green-600' },
    { name: 'DigiScore', icon: Shield, href: '/digiscore', color: 'text-blue-600' },
  ];

  const currentLinks = userRole ? portalLinks[userRole] : [];

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="border-b bg-white/95 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" onClick={handleNavClick}>
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
              <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              <div className="flex flex-col">
                <span className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">DigiComply</span>
                <span className="text-xs text-gray-500 hidden sm:block">AI-Powered Compliance Platform</span>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-6">
            {/* AI Products Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <Zap className="h-4 w-4" />
                  AI Products
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>DigiComply AI Suite</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {aiProducts.map((product) => (
                  <Link key={product.href} href={product.href}>
                    <DropdownMenuItem className="cursor-pointer">
                      <product.icon className={`h-4 w-4 mr-2 ${product.color}`} />
                      <span>{product.name}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">Live</Badge>
                    </DropdownMenuItem>
                  </Link>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Portal Navigation (if logged in) */}
            {userRole && currentLinks.length > 0 && (
              <>
                {currentLinks.slice(0, 4).map((link) => (
                  <Link key={link.href} href={link.href}>
                    <Button 
                      variant={location === link.href ? "default" : "ghost"} 
                      size="sm"
                      className="gap-2"
                    >
                      <link.icon className="h-4 w-4" />
                      {link.label}
                    </Button>
                  </Link>
                ))}
                {currentLinks.length > 4 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-2">
                        More
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {currentLinks.slice(4).map((link) => (
                        <Link key={link.href} href={link.href}>
                          <DropdownMenuItem className="cursor-pointer">
                            <link.icon className="h-4 w-4 mr-2" />
                            {link.label}
                          </DropdownMenuItem>
                        </Link>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </>
            )}

            {/* Public Navigation (if not logged in) */}
            {!userRole && (
              <>
                <a href="#services" className="text-gray-600 hover:text-blue-600 transition-colors cursor-pointer">
                  Services
                </a>
                <a href="#pricing" className="text-gray-600 hover:text-blue-600 transition-colors cursor-pointer">
                  Pricing
                </a>
                <a href="#how-it-works" className="text-gray-600 hover:text-blue-600 transition-colors cursor-pointer">
                  How It Works
                </a>
              </>
            )}

            {/* User Menu / Auth Buttons */}
            {userRole ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <UserCircle className="h-4 w-4" />
                    {userName || 'Account'}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {/* Portal Switcher */}
                  <DropdownMenuLabel className="text-xs text-gray-500">Switch Portal</DropdownMenuLabel>
                  {userRole !== 'client' && (
                    <Link href="/client-portal">
                      <DropdownMenuItem className="cursor-pointer">
                        <Building className="h-4 w-4 mr-2" />
                        Client Portal
                      </DropdownMenuItem>
                    </Link>
                  )}
                  {userRole !== 'admin' && (
                    <Link href="/admin">
                      <DropdownMenuItem className="cursor-pointer">
                        <Settings className="h-4 w-4 mr-2" />
                        Admin Panel
                      </DropdownMenuItem>
                    </Link>
                  )}
                  {userRole !== 'ops' && (
                    <Link href="/operations">
                      <DropdownMenuItem className="cursor-pointer">
                        <Workflow className="h-4 w-4 mr-2" />
                        Operations
                      </DropdownMenuItem>
                    </Link>
                  )}
                  {userRole !== 'agent' && (
                    <Link href="/agent">
                      <DropdownMenuItem className="cursor-pointer">
                        <Users className="h-4 w-4 mr-2" />
                        Agent Portal
                      </DropdownMenuItem>
                    </Link>
                  )}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="cursor-pointer text-red-600"
                    onClick={onLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">Login</Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    Start Free Trial
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t bg-white">
            <nav className="flex flex-col gap-2">
              {/* AI Products */}
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                AI Products
              </div>
              {aiProducts.map((product) => (
                <Link key={product.href} href={product.href}>
                  <div 
                    className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded cursor-pointer"
                    onClick={handleNavClick}
                  >
                    <product.icon className={`h-4 w-4 ${product.color}`} />
                    {product.name}
                    <Badge variant="secondary" className="ml-auto text-xs">Live</Badge>
                  </div>
                </Link>
              ))}

              {/* Portal Links (if logged in) */}
              {userRole && currentLinks.length > 0 && (
                <>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase mt-2">
                    Navigation
                  </div>
                  {currentLinks.map((link) => (
                    <Link key={link.href} href={link.href}>
                      <div 
                        className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded cursor-pointer"
                        onClick={handleNavClick}
                      >
                        <link.icon className="h-4 w-4" />
                        {link.label}
                      </div>
                    </Link>
                  ))}
                </>
              )}

              {/* Public Links (if not logged in) */}
              {!userRole && (
                <>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase mt-2">
                    Learn More
                  </div>
                  <a 
                    href="#services"
                    className="block px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded" 
                    onClick={(e) => {
                      e.preventDefault();
                      setMobileMenuOpen(false);
                      document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Our Services
                  </a>
                  <a 
                    href="#pricing"
                    className="block px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded" 
                    onClick={(e) => {
                      e.preventDefault();
                      setMobileMenuOpen(false);
                      document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Pricing
                  </a>
                  <a 
                    href="#how-it-works"
                    className="block px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded" 
                    onClick={(e) => {
                      e.preventDefault();
                      setMobileMenuOpen(false);
                      document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    How It Works
                  </a>
                </>
              )}

              {/* Auth Buttons / User Menu */}
              <div className="px-3 pt-4 border-t mt-2">
                {userRole ? (
                  <>
                    <div className="mb-3 px-3 py-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                        <UserCircle className="h-4 w-4" />
                        {userName || 'My Account'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 capitalize">{userRole} Portal</div>
                    </div>
                    <Link href="/settings">
                      <Button variant="outline" size="sm" className="w-full mb-2" onClick={handleNavClick}>
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => {
                        onLogout?.();
                        handleNavClick();
                      }}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/login">
                      <Button variant="outline" size="sm" className="w-full mb-2" onClick={handleNavClick}>
                        Login
                      </Button>
                    </Link>
                    <Link href="/register">
                      <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleNavClick}>
                        Start Free Trial
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
