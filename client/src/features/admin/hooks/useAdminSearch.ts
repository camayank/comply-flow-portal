import { useState, useMemo, useCallback } from 'react';

interface UseAdminSearchOptions<T> {
  /** Items to search/filter */
  data: T[];
  /** Keys to search in (supports nested keys with dot notation) */
  searchKeys: (keyof T | string)[];
  /** Initial filter values */
  initialFilters?: Record<string, string>;
}

interface UseAdminSearchReturn<T> {
  /** Filtered results */
  filteredData: T[];
  /** Current search query */
  searchQuery: string;
  /** Update search query */
  setSearchQuery: (query: string) => void;
  /** Current filter values */
  filters: Record<string, string>;
  /** Update a single filter */
  setFilter: (key: string, value: string) => void;
  /** Update multiple filters at once */
  setFilters: (filters: Record<string, string>) => void;
  /** Clear all filters and search */
  clearAll: () => void;
  /** Check if any filters are active */
  hasActiveFilters: boolean;
  /** Total count before filtering */
  totalCount: number;
  /** Filtered count */
  filteredCount: number;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc, part) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj as unknown);
}

export function useAdminSearch<T extends Record<string, unknown>>({
  data,
  searchKeys,
  initialFilters = {},
}: UseAdminSearchOptions<T>): UseAdminSearchReturn<T> {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFiltersState] = useState<Record<string, string>>(initialFilters);

  const setFilter = useCallback((key: string, value: string) => {
    setFiltersState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setFilters = useCallback((newFilters: Record<string, string>) => {
    setFiltersState(newFilters);
  }, []);

  const clearAll = useCallback(() => {
    setSearchQuery('');
    setFiltersState({});
  }, []);

  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) =>
        searchKeys.some((key) => {
          const value = getNestedValue(item, key as string);
          if (value == null) return false;
          return String(value).toLowerCase().includes(query);
        })
      );
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '') {
        result = result.filter((item) => {
          const itemValue = getNestedValue(item, key);
          if (itemValue == null) return false;
          return String(itemValue).toLowerCase() === value.toLowerCase();
        });
      }
    });

    return result;
  }, [data, searchQuery, filters, searchKeys]);

  const hasActiveFilters = useMemo(() => {
    return (
      searchQuery.trim() !== '' ||
      Object.values(filters).some((v) => v && v !== 'all' && v !== '')
    );
  }, [searchQuery, filters]);

  return {
    filteredData,
    searchQuery,
    setSearchQuery,
    filters,
    setFilter,
    setFilters,
    clearAll,
    hasActiveFilters,
    totalCount: data.length,
    filteredCount: filteredData.length,
  };
}
