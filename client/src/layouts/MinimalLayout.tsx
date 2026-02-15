import { MinimalLayoutProps } from './types';
import { MinimalHeader } from '@/components/headers/MinimalHeader';

export function MinimalLayout({
  children,
  showHeader = true,
  showBackButton = false,
  onBack,
}: MinimalLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-primary focus:text-primary-foreground focus:rounded-br-lg"
      >
        Skip to main content
      </a>

      {showHeader && (
        <MinimalHeader
          showBackButton={showBackButton}
          onBack={onBack}
        />
      )}

      <main
        id="main-content"
        className="max-w-2xl mx-auto py-8 px-4 sm:py-12 sm:px-6"
      >
        {children}
      </main>

      {/* NO Footer - focus mode */}
    </div>
  );
}
