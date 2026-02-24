# Visual Workflow Step Editor Design

**Date:** 2026-02-24
**Status:** Approved
**Author:** Claude Code

## Overview

A visual drag-and-drop workflow step editor for managing blueprint workflow steps in the Admin Portal. Replaces the existing table-based workflow management in Blueprints.tsx with an intuitive card-based interface.

## Requirements

- **Layout:** Vertical drag-and-drop list using @dnd-kit
- **Cards:** Compact display showing key info, click to open full edit dialog
- **Fields:** Core fields only (name, type, description, SLA, role, milestone)
- **Integration:** Embed in existing Blueprints.tsx "Workflow" tab

## Component Architecture

```
client/src/features/admin/components/WorkflowStepEditor/
├── index.tsx              # Main container - fetches data, handles DnD context
├── StepCard.tsx           # Draggable card showing step summary
├── StepDialog.tsx         # Form dialog for add/edit step
├── useWorkflowSteps.ts    # Custom hook for CRUD + reorder mutations
└── types.ts               # WorkflowStep interface
```

### Data Flow

```
WorkflowStepEditor (props: blueprintId)
    │
    ├── useWorkflowSteps(blueprintId)
    │       ├── steps[]
    │       ├── createStep()
    │       ├── updateStep()
    │       ├── deleteStep()
    │       └── reorderSteps()
    │
    ├── DndContext + SortableContext
    │       └── StepCard[] (draggable)
    │               └── onClick → opens StepDialog
    │
    └── StepDialog (add/edit form)
```

## UI Design

### StepCard Layout

```
┌─────────────────────────────────────────────────────────────┐
│ ⋮⋮  1. Document Collection          [DOCUMENT_UPLOAD]  ⋯  │
│     SLA: 8 hours • Role: ops_executive      ⭐ Milestone   │
└─────────────────────────────────────────────────────────────┘
```

- Left: Drag handle (GripVertical icon)
- Center: Step number, name, type badge
- Right: Dropdown menu (Edit, Delete)
- Bottom row: SLA, role, milestone indicator

### Visual States

| State | Appearance |
|-------|------------|
| Default | White card with subtle border |
| Dragging | Elevated shadow, slight opacity |
| Drop target | Dashed border highlight |

### StepDialog Fields

| Field | Input Type | Required | Default |
|-------|------------|----------|---------|
| Step Code | Text (auto-uppercase) | Yes | - |
| Step Name | Text | Yes | - |
| Step Type | Select dropdown | Yes | DATA_COLLECTION |
| Description | Textarea | No | - |
| SLA Hours | Number | No | 8 |
| Assigned Role | Select dropdown | No | ops_executive |
| Is Milestone | Checkbox | No | false |

### Step Types

- DATA_COLLECTION
- DOCUMENT_UPLOAD
- VERIFICATION
- GOVERNMENT_FILING
- PAYMENT
- APPROVAL
- QC_REVIEW
- CLIENT_ACTION
- DELIVERY

### Roles

- ops_executive
- ops_lead
- qc_reviewer
- admin
- client

## API Integration

| Action | Endpoint | Method |
|--------|----------|--------|
| Load steps | `/api/enterprise/blueprints/:id/workflow-steps` | GET |
| Add step | `/api/enterprise/blueprints/:id/workflow-steps` | POST |
| Update step | `/api/enterprise/blueprints/:id/workflow-steps/:stepId` | PUT |
| Delete step | `/api/enterprise/blueprints/:id/workflow-steps/:stepId` | DELETE |
| Reorder | `/api/enterprise/blueprints/:id/workflow-steps/reorder` | POST |

### Reorder Payload

```json
{
  "stepIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```

## Integration with Blueprints.tsx

Replace current workflow table in "Workflow" tab:

```tsx
<TabsContent value="workflow">
  {workflowBlueprintId ? (
    <WorkflowStepEditor blueprintId={workflowBlueprintId} />
  ) : (
    <EmptyState message="Select a blueprint to manage workflow steps" />
  )}
</TabsContent>
```

## Error Handling

- Toast notifications for success/failure on all operations
- Optimistic updates for drag-drop reordering (revert on API error)
- Loading skeleton while fetching steps
- Confirmation dialog before delete

## Dependencies

- `@dnd-kit/core` - Already in package.json
- `@dnd-kit/sortable` - Already in package.json
- `@dnd-kit/utilities` - Already in package.json
- shadcn/ui components (Card, Dialog, Button, etc.)

## Out of Scope (Future)

- Dependency configuration (allowedNextSteps, defaultNextStep)
- Entry/exit/skip conditions
- Checklist items per step
- Required documents per step
- Visual flow diagram representation
