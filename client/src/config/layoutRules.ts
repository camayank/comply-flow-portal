import { LayoutType } from '@/layouts/types';

export const LAYOUT_RULES: Record<Exclude<LayoutType, 'dashboard'>, string[]> = {
  public: [
    '/',
    '/landing',
    '/login',
    '/signin',
    '/register',
    '/client-registration',
    '/signup',
    '/platform-demo',
    '/design-system',
    '/pricing',
    '/features',
    '/about',
    '/contact',
    '/privacy',
    '/terms',
    '/compliance-scorecard',
    '/10k',
  ],
  minimal: [
    '/onboarding-flow',
    '/smart-start',
    '/whatsapp-onboarding',
    '/payment-gateway',
    '/esign-agreements',
    '/confirmation',
    '/select-role',
    '/role-selection',
  ],
  print: [
    '/executive-summary',
    '/compliance-report',
    '/investor-summary',
  ],
};

export function getLayoutForRoute(path: string): LayoutType {
  // Check public routes
  if (LAYOUT_RULES.public.some(route => path === route || path.startsWith(route + '/'))) {
    return 'public';
  }

  // Check minimal routes
  if (LAYOUT_RULES.minimal.some(route => path === route || path.startsWith(route + '/'))) {
    return 'minimal';
  }

  // Check print routes
  if (LAYOUT_RULES.print.some(route => path === route || path.startsWith(route + '/'))) {
    return 'print';
  }

  // Check for delivery routes (minimal)
  if (path.startsWith('/delivery/')) {
    return 'minimal';
  }

  // Check for invoice/receipt routes (print)
  if (path.startsWith('/invoice/') || path.startsWith('/receipt/')) {
    return 'print';
  }

  // Default to dashboard for all authenticated routes
  return 'dashboard';
}

export function isPublicRoute(path: string): boolean {
  return getLayoutForRoute(path) === 'public';
}
