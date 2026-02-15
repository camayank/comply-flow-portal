import { createContext, useContext, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { getLayoutForRoute, isPublicRoute } from '@/config/layoutRules';
import { LayoutType } from './types';

interface LayoutContextValue {
  layoutType: LayoutType;
  isPublic: boolean;
  isAuthenticated: boolean;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

interface UnifiedLayoutProviderProps {
  children: ReactNode;
  isAuthenticated?: boolean;
}

export function UnifiedLayoutProvider({
  children,
  isAuthenticated = false,
}: UnifiedLayoutProviderProps) {
  const [location] = useLocation();
  const layoutType = getLayoutForRoute(location);
  const isPublic = isPublicRoute(location);

  return (
    <LayoutContext.Provider
      value={{
        layoutType,
        isPublic,
        isAuthenticated,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout(): LayoutContextValue {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within UnifiedLayoutProvider');
  }
  return context;
}
