import { PrintLayoutProps } from './types';

export function PrintLayout({ children }: PrintLayoutProps) {
  return (
    <div className="min-h-screen bg-white print:bg-white">
      <main className="max-w-4xl mx-auto py-8 px-4 print:py-0 print:px-0 print:max-w-none">
        {children}
      </main>
    </div>
  );
}
