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
