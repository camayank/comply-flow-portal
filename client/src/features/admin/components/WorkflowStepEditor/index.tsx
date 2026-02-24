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
          {sortedSteps.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({sortedSteps.length} steps)
            </span>
          )}
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
