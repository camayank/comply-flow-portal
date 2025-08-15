// Enhanced Workflow Dependency Validation System
// Implements DAG validation, global updates, and execution management

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  assigneeRole: string;
  estimatedHours: number;
  dependencies: string[]; // Step IDs that must complete first
  isClientTask: boolean;
  requiredDocuments: string[];
  checklist: string[];
  autoAdvanceRules?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  executionLevels: Record<string, number>;
  maxDepth: number;
}

export interface WorkflowChangePreview {
  stepId: string;
  stepName: string;
  changeType: 'modified' | 'added' | 'removed';
  affectedSteps: string[];
  impactAnalysis: string;
}

// Directed Acyclic Graph (DAG) Validator
export class WorkflowValidator {
  
  // Main validation method using DAG algorithms
  static validateWorkflow(steps: WorkflowStep[]): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      executionLevels: {},
      maxDepth: 0
    };

    // Step 1: Validate step references
    const stepMap = new Map<string, WorkflowStep>();
    steps.forEach(step => stepMap.set(step.id, step));

    // Check all dependencies exist
    for (const step of steps) {
      for (const depId of step.dependencies) {
        if (!stepMap.has(depId)) {
          result.errors.push(`Step "${step.name}" references non-existent dependency: ${depId}`);
          result.isValid = false;
        }
      }
    }

    if (!result.isValid) return result;

    // Step 2: Detect circular dependencies using DFS
    const cycleCheck = this.detectCircularDependencies(steps, stepMap);
    if (cycleCheck.hasCycle) {
      result.errors.push(`Circular dependency detected: ${cycleCheck.cyclePath.join(' → ')}`);
      result.isValid = false;
      return result;
    }

    // Step 3: Calculate execution levels using topological sort
    result.executionLevels = this.calculateExecutionLevels(steps, stepMap);
    result.maxDepth = Math.max(...Object.values(result.executionLevels));

    // Step 4: Generate warnings for potential issues
    result.warnings = this.generateWorkflowWarnings(steps, result.executionLevels);

    return result;
  }

  // Detect circular dependencies using Depth-First Search
  private static detectCircularDependencies(
    steps: WorkflowStep[], 
    stepMap: Map<string, WorkflowStep>
  ): { hasCycle: boolean; cyclePath: string[] } {
    
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const currentPath: string[] = [];

    const dfsVisit = (stepId: string): boolean => {
      if (recursionStack.has(stepId)) {
        // Found cycle - capture the path
        const cycleStart = currentPath.indexOf(stepId);
        return true;
      }

      if (visited.has(stepId)) {
        return false;
      }

      visited.add(stepId);
      recursionStack.add(stepId);
      currentPath.push(stepId);

      const step = stepMap.get(stepId);
      if (step) {
        for (const depId of step.dependencies) {
          if (dfsVisit(depId)) {
            return true;
          }
        }
      }

      recursionStack.delete(stepId);
      currentPath.pop();
      return false;
    };

    // Check each unvisited node
    for (const step of steps) {
      if (!visited.has(step.id)) {
        if (dfsVisit(step.id)) {
          return { hasCycle: true, cyclePath: [...currentPath] };
        }
      }
    }

    return { hasCycle: false, cyclePath: [] };
  }

  // Calculate execution levels using modified Kahn's algorithm
  private static calculateExecutionLevels(
    steps: WorkflowStep[], 
    stepMap: Map<string, WorkflowStep>
  ): Record<string, number> {
    
    const levels: Record<string, number> = {};
    const inDegree: Record<string, number> = {};
    
    // Initialize in-degrees
    steps.forEach(step => {
      inDegree[step.id] = 0;
      levels[step.id] = 0;
    });

    // Calculate in-degrees (number of dependencies)
    steps.forEach(step => {
      step.dependencies.forEach(depId => {
        inDegree[depId] = (inDegree[depId] || 0) + 1;
      });
    });

    // Find all steps with no dependencies (level 0)
    const queue: string[] = [];
    steps.forEach(step => {
      if (step.dependencies.length === 0) {
        levels[step.id] = 0;
        queue.push(step.id);
      }
    });

    // Process queue and assign levels
    while (queue.length > 0) {
      const currentStepId = queue.shift()!;
      const currentLevel = levels[currentStepId];

      // Find steps that depend on this one
      steps.forEach(step => {
        if (step.dependencies.includes(currentStepId)) {
          levels[step.id] = Math.max(levels[step.id], currentLevel + 1);
          
          // Check if all dependencies are processed
          const allDepsProcessed = step.dependencies.every(depId => levels[depId] !== undefined);
          if (allDepsProcessed && !queue.includes(step.id)) {
            queue.push(step.id);
          }
        }
      });
    }

    return levels;
  }

  // Generate warnings for potential workflow issues
  private static generateWorkflowWarnings(
    steps: WorkflowStep[], 
    executionLevels: Record<string, number>
  ): string[] {
    
    const warnings: string[] = [];

    // Check for very deep dependency chains
    const maxLevel = Math.max(...Object.values(executionLevels));
    if (maxLevel > 8) {
      warnings.push(`Workflow has ${maxLevel + 1} dependency levels - consider simplifying for better management`);
    }

    // Check for orphaned steps
    const dependents = new Map<string, string[]>();
    steps.forEach(step => {
      step.dependencies.forEach(depId => {
        if (!dependents.has(depId)) dependents.set(depId, []);
        dependents.get(depId)!.push(step.id);
      });
    });

    steps.forEach(step => {
      const hasNoDependencies = step.dependencies.length === 0;
      const hasNoDependents = !dependents.has(step.id) || dependents.get(step.id)!.length === 0;
      
      if (hasNoDependencies && hasNoDependents) {
        warnings.push(`Step "${step.name}" appears to be isolated - no dependencies or dependents`);
      }
    });

    // Check for client task chains
    const clientSteps = steps.filter(s => s.isClientTask);
    clientSteps.forEach(step => {
      const hasClientDependency = step.dependencies.some(depId => {
        const depStep = steps.find(s => s.id === depId);
        return depStep?.isClientTask;
      });
      if (hasClientDependency) {
        warnings.push(`Client task "${step.name}" depends on another client task - may cause delays`);
      }
    });

    // Check for long estimated durations
    steps.forEach(step => {
      if (step.estimatedHours > 72) {
        warnings.push(`Step "${step.name}" has very long estimated duration (${step.estimatedHours}h) - consider breaking down`);
      }
    });

    return warnings;
  }

  // Get steps that can be executed given completed dependencies
  static getExecutableSteps(steps: WorkflowStep[], completedStepIds: string[]): WorkflowStep[] {
    const completed = new Set(completedStepIds);
    
    return steps.filter(step => {
      // All dependencies must be completed
      const allDepsComplete = step.dependencies.every(depId => completed.has(depId));
      // Step itself must not be completed
      const stepNotCompleted = !completed.has(step.id);
      
      return allDepsComplete && stepNotCompleted;
    });
  }

  // Preview changes before applying global workflow updates
  static previewWorkflowChanges(
    originalSteps: WorkflowStep[],
    updatedSteps: WorkflowStep[]
  ): WorkflowChangePreview[] {
    
    const previews: WorkflowChangePreview[] = [];
    const originalMap = new Map(originalSteps.map(s => [s.id, s]));
    const updatedMap = new Map(updatedSteps.map(s => [s.id, s]));

    // Check for modifications
    updatedSteps.forEach(updatedStep => {
      const originalStep = originalMap.get(updatedStep.id);
      
      if (!originalStep) {
        // New step
        previews.push({
          stepId: updatedStep.id,
          stepName: updatedStep.name,
          changeType: 'added',
          affectedSteps: updatedStep.dependencies,
          impactAnalysis: `New step "${updatedStep.name}" will be added after dependencies: ${updatedStep.dependencies.join(', ') || 'none'}`
        });
      } else {
        // Check for modifications
        const changes = this.compareSteps(originalStep, updatedStep);
        if (changes.length > 0) {
          const affectedSteps = this.findAffectedSteps(updatedStep.id, updatedSteps);
          previews.push({
            stepId: updatedStep.id,
            stepName: updatedStep.name,
            changeType: 'modified',
            affectedSteps,
            impactAnalysis: `Modified: ${changes.join(', ')}. Affects ${affectedSteps.length} dependent steps.`
          });
        }
      }
    });

    // Check for removed steps
    originalSteps.forEach(originalStep => {
      if (!updatedMap.has(originalStep.id)) {
        const affectedSteps = this.findAffectedSteps(originalStep.id, originalSteps);
        previews.push({
          stepId: originalStep.id,
          stepName: originalStep.name,
          changeType: 'removed',
          affectedSteps,
          impactAnalysis: `Step "${originalStep.name}" will be removed. ${affectedSteps.length} steps depend on it and need updates.`
        });
      }
    });

    return previews;
  }

  // Compare two workflow steps to identify changes
  private static compareSteps(original: WorkflowStep, updated: WorkflowStep): string[] {
    const changes: string[] = [];

    if (original.name !== updated.name) {
      changes.push(`name changed from "${original.name}" to "${updated.name}"`);
    }
    if (original.estimatedHours !== updated.estimatedHours) {
      changes.push(`duration changed from ${original.estimatedHours}h to ${updated.estimatedHours}h`);
    }
    if (JSON.stringify(original.dependencies.sort()) !== JSON.stringify(updated.dependencies.sort())) {
      changes.push('dependencies updated');
    }
    if (JSON.stringify(original.checklist) !== JSON.stringify(updated.checklist)) {
      changes.push('checklist updated');
    }
    if (original.assigneeRole !== updated.assigneeRole) {
      changes.push(`assignee role changed from ${original.assigneeRole} to ${updated.assigneeRole}`);
    }

    return changes;
  }

  // Find steps that depend on a given step
  private static findAffectedSteps(stepId: string, allSteps: WorkflowStep[]): string[] {
    return allSteps
      .filter(step => step.dependencies.includes(stepId))
      .map(step => step.id);
  }

  // Generate workflow execution plan
  static generateExecutionPlan(steps: WorkflowStep[]): { 
    levels: Array<{ level: number; steps: WorkflowStep[]; estimatedHours: number }>;
    totalEstimatedHours: number;
    criticalPath: string[];
  } {
    
    const validation = this.validateWorkflow(steps);
    if (!validation.isValid) {
      throw new Error(`Invalid workflow: ${validation.errors.join(', ')}`);
    }

    const levels: Array<{ level: number; steps: WorkflowStep[]; estimatedHours: number }> = [];
    const stepMap = new Map(steps.map(s => [s.id, s]));
    
    // Group steps by execution level
    for (let level = 0; level <= validation.maxDepth; level++) {
      const levelSteps = steps.filter(step => validation.executionLevels[step.id] === level);
      const levelHours = Math.max(...levelSteps.map(s => s.estimatedHours), 0);
      
      levels.push({
        level,
        steps: levelSteps,
        estimatedHours: levelHours // Parallel execution, so max duration in level
      });
    }

    const totalEstimatedHours = levels.reduce((sum, level) => sum + level.estimatedHours, 0);
    
    // Calculate critical path (longest dependency chain)
    const criticalPath = this.calculateCriticalPath(steps, stepMap, validation.executionLevels);

    return {
      levels,
      totalEstimatedHours,
      criticalPath
    };
  }

  // Calculate the critical path through the workflow
  private static calculateCriticalPath(
    steps: WorkflowStep[],
    stepMap: Map<string, WorkflowStep>,
    executionLevels: Record<string, number>
  ): string[] {
    
    // Find the step with the highest level (end of critical path)
    const maxLevel = Math.max(...Object.values(executionLevels));
    const endSteps = steps.filter(step => executionLevels[step.id] === maxLevel);
    
    // For simplicity, take the first end step and trace back
    if (endSteps.length === 0) return [];
    
    const criticalPath: string[] = [];
    let currentStep = endSteps[0];
    
    while (currentStep) {
      criticalPath.unshift(currentStep.id);
      
      // Find the dependency with the highest level (most critical)
      const dependencies = currentStep.dependencies
        .map(depId => stepMap.get(depId)!)
        .filter(dep => dep);
      
      if (dependencies.length === 0) break;
      
      currentStep = dependencies.reduce((max, dep) => 
        executionLevels[dep.id] > executionLevels[max.id] ? dep : max
      );
    }

    return criticalPath;
  }
}

// Workflow Execution Engine
export class WorkflowExecutor {
  
  // Simulate workflow execution progress
  static simulateExecution(steps: WorkflowStep[], completionRate: number = 0): {
    completed: string[];
    inProgress: string[];
    pending: string[];
    blocked: string[];
    nextActions: WorkflowStep[];
  } {
    
    const totalSteps = steps.length;
    const completedCount = Math.floor(totalSteps * completionRate);
    
    // Sort steps by execution level for realistic completion simulation
    const validation = WorkflowValidator.validateWorkflow(steps);
    const sortedSteps = steps.sort((a, b) => validation.executionLevels[a.id] - validation.executionLevels[b.id]);
    
    const completed = sortedSteps.slice(0, completedCount).map(s => s.id);
    const inProgress = completedCount < totalSteps ? [sortedSteps[completedCount].id] : [];
    const nextActions = WorkflowValidator.getExecutableSteps(steps, completed);
    
    const pending = steps
      .filter(step => !completed.includes(step.id) && !inProgress.includes(step.id))
      .filter(step => nextActions.some(na => na.id === step.id))
      .map(s => s.id);
    
    const blocked = steps
      .filter(step => !completed.includes(step.id) && !inProgress.includes(step.id) && !pending.includes(step.id))
      .map(s => s.id);

    return {
      completed,
      inProgress,
      pending,
      blocked,
      nextActions
    };
  }

  // Get workflow progress statistics
  static getProgressStats(steps: WorkflowStep[], completedStepIds: string[]): {
    totalSteps: number;
    completedSteps: number;
    completionPercentage: number;
    remainingHours: number;
    estimatedCompletionDate: Date;
  } {
    
    const completed = new Set(completedStepIds);
    const remainingSteps = steps.filter(step => !completed.has(step.id));
    const remainingHours = remainingSteps.reduce((sum, step) => sum + step.estimatedHours, 0);
    
    return {
      totalSteps: steps.length,
      completedSteps: completedStepIds.length,
      completionPercentage: (completedStepIds.length / steps.length) * 100,
      remainingHours,
      estimatedCompletionDate: new Date(Date.now() + remainingHours * 60 * 60 * 1000)
    };
  }
}

// Export main classes
export { WorkflowValidator as DependencyEngine };