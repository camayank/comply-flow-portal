import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Menu, 
  X, 
  Building2,
  Shield,
  Star,
  Users,
  Settings,
  Home,
  FileText,
  BarChart3,
  Bell,
  Search,
  Phone,
  Mail,
  ChevronDown
} from 'lucide-react';

interface NavigationItem {
  href: string;
  label: string;
  icon?: any;
  description?: string;
}

interface ActionButton {
  label: string;
  icon?: any;
  variant?: 'default' | 'outline' | 'ghost';
  href?: string;
  onClick?: () => void;
  badge?: string | number;
  hideOnMobile?: boolean;
}

interface ModernHeaderProps {
  // Branding
  brandName: string;
  brandSubtitle?: string;
  brandIcon?: any;
  brandColor?: string;
  
  // Navigation
  navigationItems?: NavigationItem[];
  mobileNavigationItems?: NavigationItem[];
  
  // Actions
  primaryAction?: ActionButton;
  secondaryActions?: ActionButton[];
  
  // Styling
  variant?: 'landing' | 'portal' | 'dashboard';
  transparent?: boolean;
  sticky?: boolean;
  
  // Mobile
  enableMobileMenu?: boolean;
  collapsible?: boolean;
}

const ModernHeader = ({
  brandName,
  brandSubtitle,
  brandIcon: BrandIcon = Building2,
  brandColor = 'text-blue-600',
  navigationItems = [],
  mobileNavigationItems = [],
  primaryAction,
  secondaryActions = [],
  variant = 'landing',
  transparent = false,
  sticky = true,
  enableMobileMenu = true,
  collapsible = true
}: ModernHeaderProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const headerClasses = `
    border-b 
    ${transparent ? 'bg-white/80 backdrop-blur-sm' : 'bg-white'} 
    ${sticky ? 'sticky top-0' : ''} 
    z-50
    transition-all duration-200
  `.trim();

  const containerClasses = variant === 'landing' 
    ? "container mx-auto px-4 sm:px-6 lg:px-8"
    : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8";

  return (
    <header className={headerClasses} data-testid="modern-header">
      <div className={containerClasses}>
        <div className="flex items-center justify-between h-16">
          {/* Brand Section */}
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            {enableMobileMenu && collapsible && (
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-testid="button-mobile-menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            )}
            
            {/* Brand */}
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <BrandIcon className={`h-6 w-6 sm:h-8 sm:w-8 ${brandColor}`} />
              <div className="flex flex-col">
                <span className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  {brandName}
                </span>
                {brandSubtitle && (
                  <span className="text-xs text-gray-500 hidden sm:block">
                    {brandSubtitle}
                  </span>
                )}
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          {navigationItems.length > 0 && (
            <div className="hidden lg:flex items-center gap-6">
              <nav className="flex gap-6">
                {navigationItems.map((item, index) => (
                  <Link 
                    key={index}
                    href={item.href} 
                    className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
                    data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          )}

          {/* Actions Section */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Secondary Actions */}
            {secondaryActions.map((action, index) => {
              const ActionIcon = action.icon;
              const content = (
                <Button
                  key={index}
                  variant={action.variant || 'outline'}
                  size="sm"
                  className={`text-xs px-3 ${action.hideOnMobile ? 'hidden sm:flex' : ''}`}
                  onClick={action.onClick}
                  data-testid={`button-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {ActionIcon && <ActionIcon className="h-4 w-4 mr-1" />}
                  <span className="hidden sm:inline">{action.label}</span>
                  {action.badge && (
                    <Badge className="ml-1 bg-red-500 text-white text-xs px-1 py-0 min-w-[16px] h-4">
                      {action.badge}
                    </Badge>
                  )}
                </Button>
              );

              return action.href ? (
                <Link key={index} href={action.href}>
                  {content}
                </Link>
              ) : content;
            })}

            {/* Primary Action */}
            {primaryAction && (
              primaryAction.href ? (
                <Link href={primaryAction.href}>
                  <Button 
                    size="sm" 
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    data-testid="button-primary-action"
                  >
                    {primaryAction.icon && <primaryAction.icon className="h-4 w-4 mr-2" />}
                    {primaryAction.label}
                  </Button>
                </Link>
              ) : (
                <Button 
                  size="sm" 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  onClick={primaryAction.onClick}
                  data-testid="button-primary-action"
                >
                  {primaryAction.icon && <primaryAction.icon className="h-4 w-4 mr-2" />}
                  {primaryAction.label}
                </Button>
              )
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {enableMobileMenu && mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t bg-white" data-testid="mobile-navigation">
            <nav className="flex flex-col gap-3">
              {(mobileNavigationItems.length > 0 ? mobileNavigationItems : navigationItems).map((item, index) => {
                const ItemIcon = item.icon;
                return (
                  <Link 
                    key={index}
                    href={item.href}
                    className="block px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid={`mobile-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className="flex items-center gap-3">
                      {ItemIcon && <ItemIcon className="h-4 w-4" />}
                      <div>
                        <div className="font-medium">{item.label}</div>
                        {item.description && (
                          <div className="text-sm text-gray-500">{item.description}</div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
              
              {/* Mobile Primary Action */}
              {primaryAction && (
                <div className="px-3 pt-2">
                  {primaryAction.href ? (
                    <Link href={primaryAction.href}>
                      <Button 
                        size="sm" 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => setMobileMenuOpen(false)}
                        data-testid="mobile-primary-action"
                      >
                        {primaryAction.icon && <primaryAction.icon className="h-4 w-4 mr-2" />}
                        {primaryAction.label}
                      </Button>
                    </Link>
                  ) : (
                    <Button 
                      size="sm" 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => {
                        primaryAction.onClick?.();
                        setMobileMenuOpen(false);
                      }}
                      data-testid="mobile-primary-action"
                    >
                      {primaryAction.icon && <primaryAction.icon className="h-4 w-4 mr-2" />}
                      {primaryAction.label}
                    </Button>
                  )}
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

// Preset configurations for different contexts
export const HeaderPresets = {
  landing: {
    variant: 'landing' as const,
    transparent: true,
    navigationItems: [
      { href: '/portal', label: 'Client Portal' },
      { href: '/operations', label: 'Operations' },
      { href: '/admin', label: 'Admin' },
      { href: '/agent', label: 'Partners' }
    ],
    primaryAction: {
      href: '/portal',
      label: 'Get Started'
    }
  },
  
  digiComplyLanding: {
    variant: 'landing' as const,
    transparent: true,
    brandName: 'DigiComply®',
    brandSubtitle: 'Part of LegalSuvidha.com Group',
    navigationItems: [
      { href: '/service-selection', label: 'Services' },
      { href: '/package-selection', label: 'Pricing' },
      { href: '/platform-showcase', label: 'Demo' }
    ],
    primaryAction: {
      href: '/onboarding',
      label: 'Get Started'
    }
  },
  
  portal: {
    variant: 'portal' as const,
    brandIcon: Users,
    brandColor: 'text-blue-600',
    secondaryActions: [
      { 
        label: 'Alerts', 
        icon: Bell, 
        variant: 'outline' as const, 
        badge: 3 
      }
    ]
  },
  
  admin: {
    variant: 'dashboard' as const,
    brandIcon: Shield,
    brandColor: 'text-blue-600',
    brandName: 'Admin Control',
    brandSubtitle: 'Platform configuration',
    secondaryActions: [
      { 
        label: 'Search', 
        icon: Search, 
        variant: 'outline' as const,
        hideOnMobile: true
      },
      { 
        label: 'Settings', 
        icon: Settings, 
        variant: 'outline' as const 
      }
    ]
  },
  
  operations: {
    variant: 'dashboard' as const,
    brandIcon: BarChart3,
    brandColor: 'text-purple-600',
    brandName: 'Operations',
    brandSubtitle: 'Team workflow orchestration',
    secondaryActions: [
      { 
        label: 'Call', 
        icon: Phone, 
        variant: 'outline' as const 
      },
      { 
        label: 'Email', 
        icon: Mail, 
        variant: 'outline' as const 
      }
    ]
  },
  
  agent: {
    variant: 'dashboard' as const,
    brandIcon: Star,
    brandColor: 'text-orange-600',
    brandName: 'Partner Portal',
    brandSubtitle: 'Agent network management',
    secondaryActions: [
      { 
        label: 'Call', 
        icon: Phone, 
        variant: 'outline' as const 
      },
      { 
        label: 'Email', 
        icon: Mail, 
        variant: 'outline' as const 
      }
    ]
  }
};

export default ModernHeader;