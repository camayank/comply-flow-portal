import { PublicLayoutProps } from './types';
import { PublicHeader } from '@/components/headers/PublicHeader';
import Footer from '@/components/Footer';

export function PublicLayout({
  children,
  showHeader = true,
  showFooter = true,
}: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-primary focus:text-primary-foreground focus:rounded-br-lg"
      >
        Skip to main content
      </a>

      {showHeader && <PublicHeader />}

      <main id="main-content" className="flex-1">
        {children}
      </main>

      {showFooter && <Footer />}
    </div>
  );
}
