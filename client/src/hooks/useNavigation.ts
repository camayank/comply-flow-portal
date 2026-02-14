/**
 * Navigation Hook
 * Centralized navigation utilities with canonical route support
 */

import { useLocation } from 'wouter';
import { useCallback } from 'react';
import { ROUTES, ROUTE_ALIASES, getCanonicalRoute, ROUTE_GROUPS, type RouteGroup } from '@/config/routes';

/**
 * Custom navigation hook with route utilities
 */
export function useNavigation() {
  const [location, setLocation] = useLocation();

  /**
   * Navigate to a route (uses canonical route if available)
   */
  const navigate = useCallback((path: string, options?: { replace?: boolean }) => {
    const canonical = getCanonicalRoute(path);
    if (options?.replace) {
      window.history.replaceState(null, '', canonical);
    }
    setLocation(canonical);
  }, [setLocation]);

  /**
   * Navigate to a predefined route
   */
  const navigateTo = useCallback((routeKey: keyof typeof ROUTES, ...args: any[]) => {
    const route = ROUTES[routeKey];
    const path = typeof route === 'function' ? route(...args) : route;
    setLocation(path);
  }, [setLocation]);

  /**
   * Go back to previous page or fallback
   */
  const goBack = useCallback((fallback?: string) => {
    if (window.history.length > 1) {
      window.history.back();
    } else if (fallback) {
      setLocation(fallback);
    }
  }, [setLocation]);

  /**
   * Get the current canonical path
   */
  const currentPath = getCanonicalRoute(location);

  /**
   * Check if current path matches a route
   */
  const isCurrentRoute = useCallback((path: string) => {
    const canonical = getCanonicalRoute(path);
    return currentPath === canonical || currentPath.startsWith(canonical + '/');
  }, [currentPath]);

  /**
   * Get navigation items for a role group
   */
  const getNavItems = useCallback((group: RouteGroup) => {
    return ROUTE_GROUPS[group];
  }, []);

  return {
    location,
    currentPath,
    navigate,
    navigateTo,
    goBack,
    isCurrentRoute,
    getNavItems,
    routes: ROUTES,
  };
}

/**
 * Hook to get current route metadata
 */
export function useCurrentRoute() {
  const [location] = useLocation();
  const canonical = getCanonicalRoute(location);

  // Check if it's an alias
  const isAlias = location !== canonical && ROUTE_ALIASES[location] !== undefined;

  // Get the route segments
  const segments = canonical.split('/').filter(Boolean);

  return {
    path: location,
    canonical,
    isAlias,
    segments,
  };
}

/**
 * Preload a route component
 */
export function preloadRoute(path: string) {
  // This is a placeholder - actual implementation would depend on
  // how your code splitting is set up
  console.log(`Preloading route: ${path}`);
}

export default useNavigation;
