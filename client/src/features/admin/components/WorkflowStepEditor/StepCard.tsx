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
  DOCUMENT_COLLECTION: 'bg-purple-100 text-purple-800',
  VERIFICATION: 'bg-yellow-100 text-yellow-800',
  GOVERNMENT_FILING: 'bg-green-100 text-green-800',
  FILING: 'bg-green-100 text-green-800',
  PAYMENT: 'bg-emerald-100 text-emerald-800',
  APPROVAL: 'bg-orange-100 text-orange-800',
  QC_REVIEW: 'bg-red-100 text-red-800',
  REVIEW: 'bg-red-100 text-red-800',
  CLIENT_ACTION: 'bg-pink-100 text-pink-800',
  DELIVERY: 'bg-cyan-100 text-cyan-800',
  TASK: 'bg-gray-100 text-gray-800',
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
              <span>{step.defaultAssigneeRole.replace(/_/g, ' ')}</span>
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
