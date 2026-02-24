# Visual Workflow Step Editor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a drag-and-drop workflow step editor for managing blueprint workflow steps in the Admin Portal.

**Architecture:** Standalone component using @dnd-kit for sortable list, embedded in existing Blueprints.tsx. Custom hook for API mutations, compact cards with edit dialog.

**Tech Stack:** React, @dnd-kit/core, @dnd-kit/sortable, @tanstack/react-query, shadcn/ui components

---

## Task 1: Create Types and Hook

**Files:**
- Create: `client/src/features/admin/components/WorkflowStepEditor/types.ts`
- Create: `client/src/features/admin/components/WorkflowStepEditor/useWorkflowSteps.ts`

**Step 1: Create types file**

```typescript
// client/src/features/admin/components/WorkflowStepEditor/types.ts

export interface WorkflowStep {
  id: string;
  blueprintId: string;
  stepCode: string;
  stepName: string;
  stepType: string;
  description: string | null;
  defaultAssigneeRole: string | null;
  slaHours: number | null;
  isMilestone: boolean | null;
  sortOrder: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowStepFormData {
  stepCode: string;
  stepName: string;
  stepType: string;
  description: string;
  slaHours: number;
  defaultAssigneeRole: string;
  isMilestone: boolean;
}

export const STEP_TYPES = [
  { value: 'DATA_COLLECTION', label: 'Data Collection' },
  { value: 'DOCUMENT_UPLOAD', label: 'Document Upload' },
  { value: 'VERIFICATION', label: 'Verification' },
  { value: 'GOVERNMENT_FILING', label: 'Government Filing' },
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'APPROVAL', label: 'Approval' },
  { value: 'QC_REVIEW', label: 'QC Review' },
  { value: 'CLIENT_ACTION', label: 'Client Action' },
  { value: 'DELIVERY', label: 'Delivery' },
] as const;

export const ROLES = [
  { value: 'ops_executive', label: 'Operations Executive' },
  { value: 'ops_lead', label: 'Operations Lead' },
  { value: 'qc_reviewer', label: 'QC Reviewer' },
  { value: 'admin', label: 'Admin' },
  { value: 'client', label: 'Client' },
] as const;

export const DEFAULT_FORM_DATA: WorkflowStepFormData = {
  stepCode: '',
  stepName: '',
  stepType: 'DATA_COLLECTION',
  description: '',
  slaHours: 8,
  defaultAssigneeRole: 'ops_executive',
  isMilestone: false,
};
```

**Step 2: Create custom hook for API operations**

```typescript
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
        `/api/enterprise/blueprints/${blueprintId}/workflow-steps`,
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
        `/api/enterprise/blueprints/${blueprintId}/workflow-steps`,
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
        `/api/enterprise/blueprints/${blueprintId}/workflow-steps/${stepId}`,
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
        `/api/enterprise/blueprints/${blueprintId}/workflow-steps/${stepId}`,
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
```

**Step 3: Commit**

```bash
git add client/src/features/admin/components/WorkflowStepEditor/
git commit -m "feat(workflow-editor): add types and useWorkflowSteps hook"
```

---

## Task 2: Create StepCard Component

**Files:**
- Create: `client/src/features/admin/components/WorkflowStepEditor/StepCard.tsx`

**Step 1: Create the draggable card component**

```typescript
// client/src/features/admin/components/WorkflowStepEditor/StepCard.tsx

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MoreVertical, Edit2, Trash2, Star } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { WorkflowStep } from './types';

interface StepCardProps {
  step: WorkflowStep;
  index: number;
  onEdit: (step: WorkflowStep) => void;
  onDelete: (stepId: string) => void;
}

const STEP_TYPE_COLORS: Record<string, string> = {
  DATA_COLLECTION: 'bg-blue-100 text-blue-800',
  DOCUMENT_UPLOAD: 'bg-purple-100 text-purple-800',
  VERIFICATION: 'bg-yellow-100 text-yellow-800',
  GOVERNMENT_FILING: 'bg-green-100 text-green-800',
  PAYMENT: 'bg-emerald-100 text-emerald-800',
  APPROVAL: 'bg-orange-100 text-orange-800',
  QC_REVIEW: 'bg-red-100 text-red-800',
  CLIENT_ACTION: 'bg-pink-100 text-pink-800',
  DELIVERY: 'bg-cyan-100 text-cyan-800',
};

export function StepCard({ step, index, onEdit, onDelete }: StepCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDelete = () => {
    if (confirm(`Delete step "${step.stepName}"?`)) {
      onDelete(step.id);
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`p-3 mb-2 ${isDragging ? 'shadow-lg ring-2 ring-primary' : 'hover:shadow-md'} transition-shadow`}
    >
      <div className="flex items-center gap-3">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Step Number & Name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              {index + 1}.
            </span>
            <span className="font-medium truncate">{step.stepName}</span>
            {step.isMilestone && (
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            {step.slaHours && <span>SLA: {step.slaHours}h</span>}
            {step.slaHours && step.defaultAssigneeRole && <span>•</span>}
            {step.defaultAssigneeRole && (
              <span>{step.defaultAssigneeRole.replace('_', ' ')}</span>
            )}
          </div>
        </div>

        {/* Step Type Badge */}
        <Badge
          variant="secondary"
          className={`text-xs ${STEP_TYPE_COLORS[step.stepType] || 'bg-gray-100'}`}
        >
          {step.stepType.replace(/_/g, ' ')}
        </Badge>

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(step)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add client/src/features/admin/components/WorkflowStepEditor/StepCard.tsx
git commit -m "feat(workflow-editor): add draggable StepCard component"
```

---

## Task 3: Create StepDialog Component

**Files:**
- Create: `client/src/features/admin/components/WorkflowStepEditor/StepDialog.tsx`

**Step 1: Create the edit dialog component**

```typescript
// client/src/features/admin/components/WorkflowStepEditor/StepDialog.tsx

import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw } from 'lucide-react';
import type { WorkflowStep, WorkflowStepFormData } from './types';
import { STEP_TYPES, ROLES, DEFAULT_FORM_DATA } from './types';

interface StepDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: WorkflowStep | null;
  formData: WorkflowStepFormData;
  setFormData: React.Dispatch<React.SetStateAction<WorkflowStepFormData>>;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function StepDialog({
  open,
  onOpenChange,
  step,
  formData,
  setFormData,
  onSubmit,
  isSubmitting,
}: StepDialogProps) {
  const isEditing = !!step;

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData(DEFAULT_FORM_DATA);
    }
  }, [open, setFormData]);

  // Populate form when editing
  useEffect(() => {
    if (step) {
      setFormData({
        stepCode: step.stepCode,
        stepName: step.stepName,
        stepType: step.stepType,
        description: step.description || '',
        slaHours: step.slaHours || 8,
        defaultAssigneeRole: step.defaultAssigneeRole || 'ops_executive',
        isMilestone: step.isMilestone || false,
      });
    }
  }, [step, setFormData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Workflow Step' : 'Add Workflow Step'}
            </DialogTitle>
            <DialogDescription>
              Define a step in the service delivery workflow
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Step Code */}
            <div className="grid gap-2">
              <Label htmlFor="stepCode">Step Code *</Label>
              <Input
                id="stepCode"
                placeholder="e.g., DATA_ENTRY"
                value={formData.stepCode}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    stepCode: e.target.value.toUpperCase().replace(/\s+/g, '_'),
                  }))
                }
                disabled={isEditing}
              />
            </div>

            {/* Step Name */}
            <div className="grid gap-2">
              <Label htmlFor="stepName">Step Name *</Label>
              <Input
                id="stepName"
                placeholder="e.g., Data Entry"
                value={formData.stepName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, stepName: e.target.value }))
                }
              />
            </div>

            {/* Step Type */}
            <div className="grid gap-2">
              <Label htmlFor="stepType">Step Type *</Label>
              <Select
                value={formData.stepType}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, stepType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select step type" />
                </SelectTrigger>
                <SelectContent>
                  {STEP_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what happens in this step..."
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* SLA Hours */}
              <div className="grid gap-2">
                <Label htmlFor="slaHours">SLA (Hours)</Label>
                <Input
                  id="slaHours"
                  type="number"
                  min="1"
                  value={formData.slaHours}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      slaHours: parseInt(e.target.value) || 8,
                    }))
                  }
                />
              </div>

              {/* Assigned Role */}
              <div className="grid gap-2">
                <Label htmlFor="role">Assigned Role</Label>
                <Select
                  value={formData.defaultAssigneeRole}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, defaultAssigneeRole: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Is Milestone */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="isMilestone"
                checked={formData.isMilestone}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    isMilestone: checked === true,
                  }))
                }
              />
              <Label htmlFor="isMilestone">Mark as milestone</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.stepCode || !formData.stepName}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                'Save Changes'
              ) : (
                'Add Step'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Commit**

```bash
git add client/src/features/admin/components/WorkflowStepEditor/StepDialog.tsx
git commit -m "feat(workflow-editor): add StepDialog form component"
```

---

## Task 4: Create Main WorkflowStepEditor Component

**Files:**
- Create: `client/src/features/admin/components/WorkflowStepEditor/index.tsx`

**Step 1: Create the main editor component with DnD context**

```typescript
// client/src/features/admin/components/WorkflowStepEditor/index.tsx

import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, RefreshCw, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StepCard } from './StepCard';
import { StepDialog } from './StepDialog';
import { useWorkflowSteps } from './useWorkflowSteps';
import type { WorkflowStep, WorkflowStepFormData } from './types';
import { DEFAULT_FORM_DATA } from './types';

interface WorkflowStepEditorProps {
  blueprintId: string;
}

export function WorkflowStepEditor({ blueprintId }: WorkflowStepEditorProps) {
  const {
    steps,
    isLoading,
    createStep,
    updateStep,
    deleteStep,
    reorderSteps,
    isCreating,
    isUpdating,
  } = useWorkflowSteps(blueprintId);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [formData, setFormData] = useState<WorkflowStepFormData>(DEFAULT_FORM_DATA);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sort steps by sortOrder
  const sortedSteps = [...steps].sort(
    (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = sortedSteps.findIndex((s) => s.id === active.id);
        const newIndex = sortedSteps.findIndex((s) => s.id === over.id);
        const newOrder = arrayMove(sortedSteps, oldIndex, newIndex);
        reorderSteps(newOrder.map((s) => s.id));
      }
    },
    [sortedSteps, reorderSteps]
  );

  // Handle add step
  const handleAddStep = () => {
    setEditingStep(null);
    setFormData(DEFAULT_FORM_DATA);
    setIsDialogOpen(true);
  };

  // Handle edit step
  const handleEditStep = (step: WorkflowStep) => {
    setEditingStep(step);
    setIsDialogOpen(true);
  };

  // Handle submit
  const handleSubmit = () => {
    if (editingStep) {
      updateStep({ stepId: editingStep.id, data: formData });
    } else {
      createStep(formData);
    }
    setIsDialogOpen(false);
    setEditingStep(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>Loading workflow steps...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Workflow className="h-5 w-5" />
          Workflow Steps
        </CardTitle>
        <Button onClick={handleAddStep} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Step
        </Button>
      </CardHeader>

      <CardContent>
        {sortedSteps.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Workflow className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="mb-4">No workflow steps defined</p>
            <Button variant="outline" onClick={handleAddStep}>
              <Plus className="h-4 w-4 mr-2" />
              Add first step
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedSteps.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {sortedSteps.map((step, index) => (
                  <StepCard
                    key={step.id}
                    step={step}
                    index={index}
                    onEdit={handleEditStep}
                    onDelete={deleteStep}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>

      <StepDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        step={editingStep}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        isSubmitting={isCreating || isUpdating}
      />
    </Card>
  );
}

export { WorkflowStepEditor };
export type { WorkflowStepEditorProps };
```

**Step 2: Commit**

```bash
git add client/src/features/admin/components/WorkflowStepEditor/index.tsx
git commit -m "feat(workflow-editor): add main WorkflowStepEditor with drag-drop"
```

---

## Task 5: Integrate with Blueprints.tsx

**Files:**
- Modify: `client/src/features/admin/pages/Blueprints.tsx`

**Step 1: Add import for WorkflowStepEditor**

At the top of the file, add the import:

```typescript
import { WorkflowStepEditor } from '../components/WorkflowStepEditor';
```

**Step 2: Replace the workflow steps table section**

Find the `<TabsContent value="workflow">` section (around line 1500-1630) and replace the inner content with:

```typescript
<TabsContent value="workflow" className="space-y-4">
  {!workflowBlueprintId ? (
    <div className="text-center py-8 text-muted-foreground">
      <Workflow className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>Select a blueprint from the list to manage its workflow steps</p>
    </div>
  ) : (
    <WorkflowStepEditor blueprintId={workflowBlueprintId} />
  )}
</TabsContent>
```

**Step 3: Remove old workflow step code (optional cleanup)**

The following can be removed as they're now handled by WorkflowStepEditor:
- `isWorkflowStepDialogOpen` state
- `editingWorkflowStep` state
- `workflowStepForm` state
- `workflowStepsData` query (if not used elsewhere)
- `createWorkflowStepMutation`
- `updateWorkflowStepMutation`
- `deleteWorkflowStepMutation`
- `resetWorkflowStepForm` function
- `handleEditWorkflowStep` function
- `handleSubmitWorkflowStep` function
- The old `<Dialog>` for workflow steps

**Step 4: Commit**

```bash
git add client/src/features/admin/pages/Blueprints.tsx
git commit -m "feat(workflow-editor): integrate WorkflowStepEditor into Blueprints page"
```

---

## Task 6: Test the Integration

**Step 1: Start the dev server**

```bash
npm run dev
```

**Step 2: Manual testing checklist**

1. Navigate to Admin Portal → Blueprints
2. Select a blueprint from the list
3. Click on "Workflow" tab
4. Verify the WorkflowStepEditor loads with existing steps
5. Test drag-and-drop reordering
6. Test adding a new step
7. Test editing an existing step
8. Test deleting a step
9. Verify toast notifications appear

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(workflow-editor): complete visual workflow step editor

- Drag-and-drop reordering with @dnd-kit
- Compact cards with type badges and SLA info
- Full edit dialog for step configuration
- Integrated into Blueprints.tsx Workflow tab"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Types and Hook | `types.ts`, `useWorkflowSteps.ts` |
| 2 | StepCard | `StepCard.tsx` |
| 3 | StepDialog | `StepDialog.tsx` |
| 4 | Main Editor | `index.tsx` |
| 5 | Integration | `Blueprints.tsx` |
| 6 | Testing | Manual verification |
