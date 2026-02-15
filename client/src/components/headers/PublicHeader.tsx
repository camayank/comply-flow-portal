import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface PublicHeaderProps {
  className?: string;
}

export function PublicHeader({ className }: PublicHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className={cn("sticky top-0 z-50 bg-white border-b border-border", className)}>
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/">
            <a className="flex items-center gap-2">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">DC</span>
              </div>
              <span className="text-xl font-bold text-foreground">DigiComply</span>
            </a>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/features">
              <a className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
            </Link>
            <Link href="/pricing">
              <a className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
            </Link>
            <Link href="/about">
              <a className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                About
              </a>
            </Link>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Login
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-md hover:bg-accent"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-4">
              <Link href="/features">
                <a className="text-sm font-medium text-muted-foreground hover:text-foreground">
                  Features
                </a>
              </Link>
              <Link href="/pricing">
                <a className="text-sm font-medium text-muted-foreground hover:text-foreground">
                  Pricing
                </a>
              </Link>
              <Link href="/about">
                <a className="text-sm font-medium text-muted-foreground hover:text-foreground">
                  About
                </a>
              </Link>
              <div className="flex gap-3 pt-4 border-t border-border">
                <Link href="/login">
                  <Button variant="outline" size="sm" className="flex-1">
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="flex-1">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
