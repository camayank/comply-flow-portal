
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, Menu } from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Onboarding' },
    { path: '/services', label: 'Services' },
    { path: '/documents', label: 'Documents' },
    { path: '/tracker', label: 'Tracker' },
    { path: '/confirmation', label: 'Complete' }
  ];

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-xl font-bold text-gray-900">DigiComply</span>
          </div>

          {/* Navigation Items */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item, index) => (
              <Button
                key={item.path}
                variant={location.pathname === item.path ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate(item.path)}
                className="text-sm"
              >
                <span className="mr-2 text-xs bg-gray-200 text-gray-700 rounded-full w-5 h-5 flex items-center justify-center">
                  {index + 1}
                </span>
                {item.label}
              </Button>
            ))}
          </div>

          {/* Mobile menu button */}
          <Button variant="ghost" size="sm" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
