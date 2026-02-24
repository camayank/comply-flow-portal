// client/src/features/admin/components/WorkflowStepEditor/useWorkflowSteps.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { WorkflowStep, WorkflowStepFormData } from './types';

export function useWorkflowSteps(blueprintId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = ['workflow-steps', blueprintId];

  // Fetch steps
  const { data, isLoading, error } = useQuery<WorkflowStep[]>({
    queryKey,
    queryFn: async () => {
      const response = await fetch(
        `/api/v2/enterprise/blueprints/${blueprintId}/workflow-steps`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to fetch workflow steps');
      const json = await response.json();
      return json.steps || json || [];
    },
    enabled: !!blueprintId,
  });

  // Create step
  const createMutation = useMutation({
    mutationFn: async (formData: WorkflowStepFormData) => {
      const response = await fetch(
        `/api/v2/enterprise/blueprints/${blueprintId}/workflow-steps`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(formData),
        }
      );
      if (!response.ok) throw new Error('Failed to create step');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Step Created', description: 'Workflow step added successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update step
  const updateMutation = useMutation({
    mutationFn: async ({ stepId, data }: { stepId: string; data: Partial<WorkflowStepFormData> }) => {
      const response = await fetch(
        `/api/v2/enterprise/blueprints/${blueprintId}/workflow-steps/${stepId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) throw new Error('Failed to update step');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Step Updated', description: 'Workflow step updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Delete step
  const deleteMutation = useMutation({
    mutationFn: async (stepId: string) => {
      const response = await fetch(
        `/api/v2/enterprise/blueprints/${blueprintId}/workflow-steps/${stepId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Failed to delete step');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Step Deleted', description: 'Workflow step removed.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Reorder steps
  const reorderMutation = useMutation({
    mutationFn: async (stepIds: string[]) => {
      const response = await fetch(
        `/api/enterprise/blueprints/${blueprintId}/workflow-steps/reorder`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ stepIds }),
        }
      );
      if (!response.ok) throw new Error('Failed to reorder steps');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      queryClient.invalidateQueries({ queryKey }); // Revert optimistic update
    },
  });

  return {
    steps: data || [],
    isLoading,
    error,
    createStep: createMutation.mutate,
    updateStep: updateMutation.mutate,
    deleteStep: deleteMutation.mutate,
    reorderSteps: reorderMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
