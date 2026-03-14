import { pipelineOrchestrator } from './pipeline-orchestrator';
import { registerSalesHandlers } from './handlers/sales-handler';
import { registerExecutionHandlers } from './handlers/execution-handler';
import { registerFinanceHandlers } from './handlers/finance-handler';
import { registerComplianceHandlers } from './handlers/compliance-handler';

export function registerAllHandlers(): void {
  registerSalesHandlers(pipelineOrchestrator);
  registerExecutionHandlers(pipelineOrchestrator);
  registerFinanceHandlers(pipelineOrchestrator);
  registerComplianceHandlers(pipelineOrchestrator);
}
