import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MinimalHeaderProps {
  showBackButton?: boolean;
  onBack?: () => void;
  className?: string;
}

export function MinimalHeader({
  showBackButton = false,
  onBack,
  className,
}: MinimalHeaderProps) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  return (
    <header className={cn("bg-white border-b border-border", className)}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Back button or spacer */}
          <div className="w-10">
            {showBackButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Logo */}
          <Link href="/">
            <a className="flex items-center gap-2">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">DC</span>
              </div>
              <span className="text-xl font-bold text-foreground">DigiComply</span>
            </a>
          </Link>

          {/* Spacer for symmetry */}
          <div className="w-10" />
        </div>
      </div>
    </header>
  );
}
