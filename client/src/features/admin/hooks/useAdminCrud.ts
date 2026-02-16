import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface UseAdminCrudOptions<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  /** Base endpoint for the resource (e.g., '/api/admin/users') */
  endpoint: string;
  /** Query key for caching */
  queryKey: string[];
  /** Resource name for toast messages */
  resourceName: string;
  /** Transform response data if needed */
  transformResponse?: (data: unknown) => T[];
  /** Enable auto-refetch */
  refetchOnWindowFocus?: boolean;
}

export function useAdminCrud<T extends { id: number | string }, TCreate = Partial<T>, TUpdate = Partial<T>>({
  endpoint,
  queryKey,
  resourceName,
  transformResponse,
  refetchOnWindowFocus = false,
}: UseAdminCrudOptions<T, TCreate, TUpdate>) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all items
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await apiRequest('GET', endpoint);
      if (transformResponse) {
        return transformResponse(response);
      }
      return (response?.data || response || []) as T[];
    },
    refetchOnWindowFocus,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: TCreate) => {
      return apiRequest('POST', endpoint, data);
    },
    onSuccess: () => {
      toast({
        title: `${resourceName} created`,
        description: `The ${resourceName.toLowerCase()} has been created successfully.`,
      });
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || `Failed to create ${resourceName.toLowerCase()}.`,
        variant: 'destructive',
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number | string; data: TUpdate }) => {
      return apiRequest('PATCH', `${endpoint}/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: `${resourceName} updated`,
        description: `The ${resourceName.toLowerCase()} has been updated successfully.`,
      });
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || `Failed to update ${resourceName.toLowerCase()}.`,
        variant: 'destructive',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number | string) => {
      return apiRequest('DELETE', `${endpoint}/${id}`);
    },
    onSuccess: () => {
      toast({
        title: `${resourceName} deleted`,
        description: `The ${resourceName.toLowerCase()} has been deleted successfully.`,
      });
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || `Failed to delete ${resourceName.toLowerCase()}.`,
        variant: 'destructive',
      });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: (number | string)[]) => {
      return apiRequest('POST', `${endpoint}/bulk-delete`, { ids });
    },
    onSuccess: (_, ids) => {
      toast({
        title: `${ids.length} ${resourceName}(s) deleted`,
        description: `The selected items have been deleted successfully.`,
      });
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || `Failed to delete selected items.`,
        variant: 'destructive',
      });
    },
  });

  return {
    // Query
    data: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,

    // Mutations
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    bulkDelete: bulkDeleteMutation.mutateAsync,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isBulkDeleting: bulkDeleteMutation.isPending,
    isMutating:
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending ||
      bulkDeleteMutation.isPending,
  };
}
