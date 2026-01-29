/**
 * AI Services Index
 *
 * Central export for all AI agents and gateway
 */

// AI Gateway - Multi-provider interface
export { aiGateway, type AIResponse, type AIMessage, type AICompletionOptions, type EmbeddingResponse } from './ai-gateway';

// Specialized AI Agents
export { complianceAIAgent } from './compliance-ai-agent';
export { salesAIAgent } from './sales-ai-agent';
export { documentAIAgent } from './document-ai-agent';
export { supportAIAgent } from './support-ai-agent';

// Default export for convenience
export default {
  gateway: require('./ai-gateway').aiGateway,
  compliance: require('./compliance-ai-agent').complianceAIAgent,
  sales: require('./sales-ai-agent').salesAIAgent,
  document: require('./document-ai-agent').documentAIAgent,
  support: require('./support-ai-agent').supportAIAgent
};
