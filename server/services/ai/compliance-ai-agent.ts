/**
 * Compliance AI Agent
 *
 * AI-powered compliance intelligence:
 * - Predict compliance failures
 * - Generate compliance recommendations
 * - Answer compliance questions
 * - Analyze regulatory changes
 */

import { aiGateway, AIMessage } from './ai-gateway';

interface ComplianceContext {
  entityId: number;
  entityType: string;
  industry?: string;
  state?: string;
  currentCompliances: Array<{
    type: string;
    status: string;
    dueDate?: Date;
    lastFiledDate?: Date;
  }>;
  historicalData?: {
    missedDeadlines: number;
    penaltiesPaid: number;
    avgFilingDelay: number;
  };
}

interface CompliancePrediction {
  requirement: string;
  failureProbability: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskFactors: string[];
  preventiveActions: string[];
  confidenceScore: number;
  daysUntilDue?: number;
}

interface ComplianceRecommendation {
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  title: string;
  description: string;
  actionItems: string[];
  estimatedImpact: string;
  deadline?: Date;
}

interface ComplianceAnswer {
  answer: string;
  confidence: number;
  sources: string[];
  relatedTopics: string[];
  actionRequired?: boolean;
  disclaimer?: string;
}

/**
 * Compliance AI Agent
 */
class ComplianceAIAgent {

  /**
   * Predict compliance failures for an entity
   */
  async predictComplianceFailures(
    context: ComplianceContext,
    lookAheadDays: number = 90
  ): Promise<CompliancePrediction[]> {
    const systemPrompt = `You are an expert Indian compliance analyst. Analyze the provided entity data and predict potential compliance failures.

Consider these compliance domains:
- GST (GSTR-1, GSTR-3B, Annual Return)
- Income Tax (Advance Tax, TDS, ITR)
- MCA/ROC (AOC-4, MGT-7, Annual Filings)
- PF/ESI (Monthly contributions, returns)
- Professional Tax
- State-specific compliances

For each prediction, provide:
1. Specific compliance requirement
2. Failure probability (0-1)
3. Risk factors (specific to this entity)
4. Preventive actions
5. Confidence score

Base predictions on:
- Historical filing patterns
- Entity type requirements
- Industry-specific regulations
- Seasonal patterns
- Current pending items`;

    const userMessage = `Analyze compliance risk for the following entity:

Entity Type: ${context.entityType}
Industry: ${context.industry || 'Not specified'}
State: ${context.state || 'Not specified'}

Current Compliance Status:
${JSON.stringify(context.currentCompliances, null, 2)}

Historical Data:
- Missed Deadlines (last 12 months): ${context.historicalData?.missedDeadlines || 0}
- Penalties Paid: ₹${context.historicalData?.penaltiesPaid || 0}
- Avg Filing Delay: ${context.historicalData?.avgFilingDelay || 0} days

Look-ahead Period: ${lookAheadDays} days

Provide predictions in JSON format:
{
  "predictions": [
    {
      "requirement": "string",
      "failureProbability": 0.0-1.0,
      "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
      "riskFactors": ["string"],
      "preventiveActions": ["string"],
      "confidenceScore": 0.0-1.0,
      "daysUntilDue": number
    }
  ]
}`;

    const response = await aiGateway.complete(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      { provider: 'anthropic', temperature: 0.3 }
    );

    if (!response.success || !response.content) {
      return [];
    }

    try {
      // Extract JSON from response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.predictions || [];
      }
    } catch (e) {
      console.error('[Compliance AI] Failed to parse predictions:', e);
    }

    return [];
  }

  /**
   * Generate personalized compliance recommendations
   */
  async generateRecommendations(
    context: ComplianceContext,
    focus?: 'cost_reduction' | 'risk_mitigation' | 'process_improvement'
  ): Promise<ComplianceRecommendation[]> {
    const systemPrompt = `You are a compliance optimization expert for Indian businesses. Generate actionable recommendations to improve compliance posture.

Focus areas:
1. Cost Reduction - Avoid penalties, optimize timing
2. Risk Mitigation - Reduce exposure, improve controls
3. Process Improvement - Automate, streamline workflows

Recommendations should be:
- Specific and actionable
- Prioritized by impact
- Tailored to entity type
- Consider resource constraints`;

    const userMessage = `Generate compliance recommendations for:

Entity Type: ${context.entityType}
Industry: ${context.industry || 'General'}

Current Status:
${JSON.stringify(context.currentCompliances.slice(0, 10), null, 2)}

Historical Performance:
- Missed Deadlines: ${context.historicalData?.missedDeadlines || 0}
- Penalties: ₹${context.historicalData?.penaltiesPaid || 0}

Focus: ${focus || 'all'}

Provide recommendations in JSON format:
{
  "recommendations": [
    {
      "priority": "URGENT|HIGH|MEDIUM|LOW",
      "category": "string",
      "title": "string",
      "description": "string",
      "actionItems": ["string"],
      "estimatedImpact": "string"
    }
  ]
}`;

    const response = await aiGateway.complete(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      { provider: 'anthropic', temperature: 0.4 }
    );

    if (!response.success || !response.content) {
      return [];
    }

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.recommendations || [];
      }
    } catch (e) {
      console.error('[Compliance AI] Failed to parse recommendations:', e);
    }

    return [];
  }

  /**
   * Answer compliance questions using RAG
   */
  async answerQuestion(
    question: string,
    context?: {
      entityType?: string;
      industry?: string;
      relevantDocs?: string[];
    }
  ): Promise<ComplianceAnswer> {
    const systemPrompt = `You are DigiComply's AI compliance assistant for Indian businesses. Answer compliance questions accurately and helpfully.

Guidelines:
1. Be precise about deadlines, penalties, and requirements
2. Cite relevant sections/rules when applicable
3. Clarify when professional advice is needed
4. Consider entity type in your response
5. Mention recent changes if relevant

Compliance domains you cover:
- Company Law (Companies Act 2013)
- GST (CGST, SGST, IGST)
- Income Tax
- Labor Laws (PF, ESI, PT)
- SEBI regulations
- RBI regulations
- State-specific laws`;

    const contextInfo = context ? `
Context:
- Entity Type: ${context.entityType || 'Not specified'}
- Industry: ${context.industry || 'General'}
${context.relevantDocs ? `- Relevant Documents: ${context.relevantDocs.join(', ')}` : ''}
` : '';

    const userMessage = `${contextInfo}

Question: ${question}

Provide your answer in JSON format:
{
  "answer": "string (detailed answer)",
  "confidence": 0.0-1.0,
  "sources": ["relevant acts/rules/notifications"],
  "relatedTopics": ["related compliance areas"],
  "actionRequired": true/false,
  "disclaimer": "string (if professional advice needed)"
}`;

    const response = await aiGateway.complete(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      { provider: 'anthropic', temperature: 0.2 }
    );

    if (!response.success || !response.content) {
      return {
        answer: 'Unable to process your question at this time. Please try again.',
        confidence: 0,
        sources: [],
        relatedTopics: []
      };
    }

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Return plain text answer if JSON parsing fails
      return {
        answer: response.content,
        confidence: 0.7,
        sources: [],
        relatedTopics: []
      };
    }

    return {
      answer: response.content,
      confidence: 0.7,
      sources: [],
      relatedTopics: []
    };
  }

  /**
   * Analyze regulatory changes using Perplexity
   */
  async analyzeRegulatoryChanges(
    domain: string,
    lookbackDays: number = 30
  ): Promise<{
    updates: Array<{
      date: string;
      title: string;
      summary: string;
      impact: 'HIGH' | 'MEDIUM' | 'LOW';
      affectedEntities: string[];
      actionRequired: string[];
      source: string;
    }>;
    citations: string[];
  }> {
    const query = `Latest regulatory changes and updates in Indian ${domain} compliance in the last ${lookbackDays} days. Include:
- New notifications
- Deadline extensions
- Rate changes
- Procedural updates
- Penalty revisions

Focus on practical implications for businesses.`;

    const response = await aiGateway.complete(
      [{ role: 'user', content: query }],
      { provider: 'perplexity' }
    );

    if (!response.success || !response.content) {
      return { updates: [], citations: [] };
    }

    // Parse the response with Claude for structured output
    const structuredResponse = await aiGateway.complete(
      [
        {
          role: 'system',
          content: 'Extract regulatory updates from the provided text and format as JSON.'
        },
        {
          role: 'user',
          content: `Extract updates from this text and format as JSON:

${response.content}

Format:
{
  "updates": [
    {
      "date": "YYYY-MM-DD",
      "title": "string",
      "summary": "string",
      "impact": "HIGH|MEDIUM|LOW",
      "affectedEntities": ["entity types"],
      "actionRequired": ["actions"],
      "source": "notification/circular number"
    }
  ]
}`
        }
      ],
      { provider: 'anthropic', temperature: 0.1 }
    );

    try {
      const jsonMatch = structuredResponse.content?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          updates: parsed.updates || [],
          citations: response.metadata?.citations || []
        };
      }
    } catch (e) {
      console.error('[Compliance AI] Failed to parse regulatory updates:', e);
    }

    return { updates: [], citations: response.metadata?.citations || [] };
  }

  /**
   * Generate compliance calendar for an entity
   */
  async generateComplianceCalendar(
    context: ComplianceContext,
    months: number = 3
  ): Promise<Array<{
    date: Date;
    requirement: string;
    category: string;
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    estimatedEffort: string;
    prerequisites: string[];
    penalty: string;
  }>> {
    const systemPrompt = `You are an expert in Indian compliance calendars. Generate a comprehensive compliance calendar based on entity type and applicable regulations.

Include:
- GST filings (GSTR-1, GSTR-3B, Annual)
- Income Tax (Advance Tax, TDS, ITR)
- MCA/ROC filings
- PF/ESI contributions
- Professional Tax
- Industry-specific requirements`;

    const userMessage = `Generate a ${months}-month compliance calendar for:

Entity Type: ${context.entityType}
Industry: ${context.industry || 'General'}
State: ${context.state || 'Maharashtra'}

Starting from today's date.

Format as JSON:
{
  "calendar": [
    {
      "date": "YYYY-MM-DD",
      "requirement": "string",
      "category": "GST|Income Tax|MCA|Labor|Other",
      "priority": "CRITICAL|HIGH|MEDIUM|LOW",
      "estimatedEffort": "string",
      "prerequisites": ["string"],
      "penalty": "string"
    }
  ]
}`;

    const response = await aiGateway.complete(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      { provider: 'anthropic', temperature: 0.2 }
    );

    if (!response.success || !response.content) {
      return [];
    }

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return (parsed.calendar || []).map((item: any) => ({
          ...item,
          date: new Date(item.date)
        }));
      }
    } catch (e) {
      console.error('[Compliance AI] Failed to parse calendar:', e);
    }

    return [];
  }

  /**
   * Summarize compliance document
   */
  async summarizeDocument(
    documentText: string,
    documentType: string
  ): Promise<{
    summary: string;
    keyPoints: string[];
    deadlines: Array<{ item: string; date: string }>;
    actionItems: string[];
    riskAreas: string[];
  }> {
    const response = await aiGateway.complete(
      [
        {
          role: 'system',
          content: `You are a compliance document analyst. Summarize the ${documentType} and extract key information.`
        },
        {
          role: 'user',
          content: `Analyze this ${documentType}:

${documentText.substring(0, 10000)}

Provide analysis in JSON format:
{
  "summary": "2-3 sentence summary",
  "keyPoints": ["important points"],
  "deadlines": [{"item": "string", "date": "string"}],
  "actionItems": ["required actions"],
  "riskAreas": ["potential compliance risks"]
}`
        }
      ],
      { provider: 'anthropic', temperature: 0.2 }
    );

    if (!response.success || !response.content) {
      return {
        summary: 'Unable to analyze document',
        keyPoints: [],
        deadlines: [],
        actionItems: [],
        riskAreas: []
      };
    }

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('[Compliance AI] Failed to parse document summary:', e);
    }

    return {
      summary: response.content,
      keyPoints: [],
      deadlines: [],
      actionItems: [],
      riskAreas: []
    };
  }
}

export const complianceAIAgent = new ComplianceAIAgent();
export default complianceAIAgent;
