/**
 * Support AI Agent
 *
 * AI-powered customer support:
 * - First-line response automation
 * - Ticket classification & routing
 * - Sentiment analysis
 * - Response generation
 * - Knowledge base search
 */

import { aiGateway } from './ai-gateway';

interface SupportTicket {
  id: number;
  subject: string;
  description: string;
  category?: string;
  priority?: string;
  status: string;
  clientId: number;
  clientName?: string;
  clientTier?: 'premium' | 'standard' | 'basic';
  previousTickets?: number;
  createdAt: Date;
}

interface TicketClassification {
  category: string;
  subCategory?: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  sentiment: 'positive' | 'neutral' | 'negative' | 'frustrated';
  urgencyScore: number;
  requiredExpertise: string[];
  suggestedAssignee?: string;
  estimatedResolutionTime: string;
  autoResolvable: boolean;
}

interface SupportResponse {
  response: string;
  confidence: number;
  tone: string;
  followUpQuestions?: string[];
  escalationRecommended: boolean;
  escalationReason?: string;
  relatedArticles?: string[];
  actionsTaken?: string[];
}

interface SentimentAnalysis {
  overallSentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number; // -1 to 1
  emotions: Array<{ emotion: string; intensity: number }>;
  keyPhrases: string[];
  churnRisk: number;
  satisfactionPrediction: number;
  recommendations: string[];
}

/**
 * Support AI Agent
 */
class SupportAIAgent {

  // Knowledge base categories
  private knowledgeCategories = [
    'Account & Billing',
    'GST Compliance',
    'Income Tax',
    'Company Law/ROC',
    'Document Upload',
    'Service Requests',
    'Technical Issues',
    'General Inquiry'
  ];

  /**
   * Classify and prioritize support ticket
   */
  async classifyTicket(ticket: SupportTicket): Promise<TicketClassification> {
    const systemPrompt = `You are a support ticket classifier for DigiComply, an Indian compliance automation platform.

Categories:
- Account & Billing: Login issues, payments, subscriptions, invoices
- GST Compliance: GSTR filing, GST queries, GST notices
- Income Tax: ITR, TDS, advance tax, tax notices
- Company Law/ROC: MCA filings, ROC compliance, annual returns
- Document Upload: Upload issues, document verification
- Service Requests: Service status, delivery queries
- Technical Issues: App bugs, performance, integration
- General Inquiry: Product info, pricing, features

Priority Factors:
- Client tier (premium > standard > basic)
- Deadline proximity
- Revenue impact
- Compliance risk
- Sentiment intensity

Auto-resolvable: FAQ-type questions, status checks, simple how-tos`;

    const userMessage = `Classify this support ticket:

Subject: ${ticket.subject}
Description: ${ticket.description}
Client Tier: ${ticket.clientTier || 'standard'}
Previous Tickets: ${ticket.previousTickets || 0}

Provide classification in JSON:
{
  "category": "string",
  "subCategory": "string",
  "priority": "CRITICAL|HIGH|MEDIUM|LOW",
  "sentiment": "positive|neutral|negative|frustrated",
  "urgencyScore": 0-100,
  "requiredExpertise": ["skills needed"],
  "suggestedAssignee": "team/role",
  "estimatedResolutionTime": "time estimate",
  "autoResolvable": true/false
}`;

    const response = await aiGateway.complete(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      { provider: 'anthropic', temperature: 0.2 }
    );

    const defaultClassification: TicketClassification = {
      category: 'General Inquiry',
      priority: 'MEDIUM',
      sentiment: 'neutral',
      urgencyScore: 50,
      requiredExpertise: ['General Support'],
      estimatedResolutionTime: '24 hours',
      autoResolvable: false
    };

    if (!response.success || !response.content) {
      return defaultClassification;
    }

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return { ...defaultClassification, ...JSON.parse(jsonMatch[0]) };
      }
    } catch (e) {
      console.error('[Support AI] Failed to parse classification:', e);
    }

    return defaultClassification;
  }

  /**
   * Generate automated response
   */
  async generateResponse(
    ticket: SupportTicket,
    context?: {
      previousResponses?: string[];
      clientHistory?: string;
      relevantKnowledge?: string;
    }
  ): Promise<SupportResponse> {
    const systemPrompt = `You are DigiComply's AI support assistant. Generate helpful, professional responses to customer queries.

Guidelines:
1. Be empathetic and professional
2. Provide accurate compliance information
3. Include specific steps when applicable
4. Offer to escalate complex issues
5. Use client's name when available
6. Keep responses concise but complete

Product Knowledge:
- 96 compliance services across GST, Tax, ROC, etc.
- WhatsApp and email notifications
- Document vault with DigiLocker integration
- Compliance calendar and reminders
- Funding readiness score

Never make up information about:
- Specific deadlines (direct to compliance calendar)
- Pricing (direct to sales)
- Legal advice (recommend CA/CS consultation)`;

    const userMessage = `Generate a response for:

Ticket Subject: ${ticket.subject}
Ticket Description: ${ticket.description}
Client Name: ${ticket.clientName || 'Customer'}
Client Tier: ${ticket.clientTier || 'standard'}

${context?.previousResponses ? `Previous Responses:\n${context.previousResponses.join('\n')}` : ''}
${context?.relevantKnowledge ? `Relevant Knowledge:\n${context.relevantKnowledge}` : ''}

Provide response in JSON:
{
  "response": "the response text",
  "confidence": 0.0-1.0,
  "tone": "professional|empathetic|apologetic|informative",
  "followUpQuestions": ["questions to clarify if needed"],
  "escalationRecommended": true/false,
  "escalationReason": "reason if escalation needed",
  "relatedArticles": ["relevant help articles"],
  "actionsTaken": ["any automated actions"]
}`;

    const response = await aiGateway.complete(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      { provider: 'anthropic', temperature: 0.5 }
    );

    const defaultResponse: SupportResponse = {
      response: `Thank you for contacting DigiComply support. We've received your query and will get back to you shortly.`,
      confidence: 0.5,
      tone: 'professional',
      escalationRecommended: true,
      escalationReason: 'Unable to generate confident response'
    };

    if (!response.success || !response.content) {
      return defaultResponse;
    }

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return { ...defaultResponse, ...JSON.parse(jsonMatch[0]) };
      }
    } catch (e) {
      console.error('[Support AI] Failed to parse response:', e);
    }

    return defaultResponse;
  }

  /**
   * Analyze customer sentiment
   */
  async analyzeSentiment(
    text: string,
    context?: { ticketHistory?: string[]; clientTier?: string }
  ): Promise<SentimentAnalysis> {
    const response = await aiGateway.complete(
      [
        {
          role: 'system',
          content: 'You are an expert at analyzing customer sentiment in support conversations. Detect emotions, satisfaction levels, and churn risk.'
        },
        {
          role: 'user',
          content: `Analyze sentiment in this message:

"${text}"

${context?.clientTier ? `Client Tier: ${context.clientTier}` : ''}

Provide analysis in JSON:
{
  "overallSentiment": "positive|neutral|negative",
  "sentimentScore": -1.0 to 1.0,
  "emotions": [{"emotion": "string", "intensity": 0.0-1.0}],
  "keyPhrases": ["notable phrases"],
  "churnRisk": 0.0-1.0,
  "satisfactionPrediction": 0-10,
  "recommendations": ["how to address"]
}`
        }
      ],
      { provider: 'anthropic', temperature: 0.2 }
    );

    const defaultAnalysis: SentimentAnalysis = {
      overallSentiment: 'neutral',
      sentimentScore: 0,
      emotions: [],
      keyPhrases: [],
      churnRisk: 0.3,
      satisfactionPrediction: 5,
      recommendations: []
    };

    if (!response.success || !response.content) {
      return defaultAnalysis;
    }

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return { ...defaultAnalysis, ...JSON.parse(jsonMatch[0]) };
      }
    } catch (e) {
      console.error('[Support AI] Failed to parse sentiment:', e);
    }

    return defaultAnalysis;
  }

  /**
   * Search knowledge base with AI
   */
  async searchKnowledge(
    query: string,
    category?: string
  ): Promise<{
    results: Array<{
      title: string;
      content: string;
      relevance: number;
      category: string;
    }>;
    suggestedQueries?: string[];
    directAnswer?: string;
  }> {
    // In production, this would search actual knowledge base
    // Using AI to simulate intelligent search

    const response = await aiGateway.complete(
      [
        {
          role: 'system',
          content: `You are a knowledge base search assistant for DigiComply. Generate relevant help articles for user queries.

Knowledge Areas:
- Account management (login, profile, settings)
- Billing (payments, invoices, subscriptions)
- GST compliance (returns, registration, amendments)
- Income tax (ITR, TDS, advance tax)
- Company law (MCA filings, ROC compliance)
- Documents (upload, verification, storage)
- Services (request, tracking, delivery)`
        },
        {
          role: 'user',
          content: `User is searching for: "${query}"
${category ? `Category: ${category}` : ''}

Generate relevant knowledge base results in JSON:
{
  "results": [
    {
      "title": "article title",
      "content": "brief content/answer",
      "relevance": 0.0-1.0,
      "category": "category name"
    }
  ],
  "suggestedQueries": ["related searches"],
  "directAnswer": "if query has a direct answer"
}`
        }
      ],
      { provider: 'anthropic', temperature: 0.3 }
    );

    const defaultResults = {
      results: [],
      suggestedQueries: []
    };

    if (!response.success || !response.content) {
      return defaultResults;
    }

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return { ...defaultResults, ...JSON.parse(jsonMatch[0]) };
      }
    } catch (e) {
      console.error('[Support AI] Failed to parse search results:', e);
    }

    return defaultResults;
  }

  /**
   * Generate ticket summary for handoff
   */
  async generateTicketSummary(
    ticket: SupportTicket,
    conversationHistory: Array<{ sender: string; message: string; timestamp: Date }>
  ): Promise<{
    summary: string;
    keyIssues: string[];
    attemptedSolutions: string[];
    customerExpectation: string;
    recommendedAction: string;
    handoffNotes: string;
  }> {
    const conversationText = conversationHistory
      .map(c => `${c.sender}: ${c.message}`)
      .join('\n');

    const response = await aiGateway.complete(
      [
        {
          role: 'system',
          content: 'You are preparing a ticket summary for handoff to another support agent or specialist.'
        },
        {
          role: 'user',
          content: `Summarize this support ticket for handoff:

Subject: ${ticket.subject}
Original Description: ${ticket.description}

Conversation History:
${conversationText.substring(0, 4000)}

Provide summary in JSON:
{
  "summary": "brief ticket summary",
  "keyIssues": ["main issues identified"],
  "attemptedSolutions": ["what's been tried"],
  "customerExpectation": "what customer wants",
  "recommendedAction": "next step recommendation",
  "handoffNotes": "important notes for next agent"
}`
        }
      ],
      { provider: 'anthropic', temperature: 0.2 }
    );

    const defaultSummary = {
      summary: 'Summary unavailable',
      keyIssues: [],
      attemptedSolutions: [],
      customerExpectation: 'Resolution needed',
      recommendedAction: 'Review ticket history',
      handoffNotes: ''
    };

    if (!response.success || !response.content) {
      return defaultSummary;
    }

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return { ...defaultSummary, ...JSON.parse(jsonMatch[0]) };
      }
    } catch (e) {
      console.error('[Support AI] Failed to parse summary:', e);
    }

    return defaultSummary;
  }

  /**
   * Suggest canned responses
   */
  async suggestCannedResponses(
    ticket: SupportTicket
  ): Promise<Array<{
    id: string;
    title: string;
    content: string;
    matchScore: number;
    customizations: string[];
  }>> {
    const response = await aiGateway.complete(
      [
        {
          role: 'system',
          content: 'Suggest appropriate canned responses for the support ticket. Customize for the specific situation.'
        },
        {
          role: 'user',
          content: `Suggest canned responses for:

Subject: ${ticket.subject}
Description: ${ticket.description}

Provide in JSON:
{
  "responses": [
    {
      "id": "unique_id",
      "title": "response title",
      "content": "response template with [PLACEHOLDERS]",
      "matchScore": 0.0-1.0,
      "customizations": ["what to customize"]
    }
  ]
}`
        }
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
        return parsed.responses || [];
      }
    } catch (e) {
      console.error('[Support AI] Failed to parse canned responses:', e);
    }

    return [];
  }

  /**
   * Predict CSAT score
   */
  async predictCSAT(
    conversationHistory: Array<{ sender: string; message: string }>,
    resolutionStatus: string
  ): Promise<{
    predictedScore: number;
    confidence: number;
    factors: Array<{ factor: string; impact: 'positive' | 'negative' }>;
    improvementSuggestions: string[];
  }> {
    const conversationText = conversationHistory
      .map(c => `${c.sender}: ${c.message}`)
      .join('\n');

    const response = await aiGateway.complete(
      [
        {
          role: 'system',
          content: 'You are a customer satisfaction prediction model. Predict CSAT based on conversation quality and resolution.'
        },
        {
          role: 'user',
          content: `Predict CSAT for this interaction:

Resolution Status: ${resolutionStatus}

Conversation:
${conversationText.substring(0, 3000)}

Provide prediction in JSON:
{
  "predictedScore": 1-5,
  "confidence": 0.0-1.0,
  "factors": [{"factor": "string", "impact": "positive|negative"}],
  "improvementSuggestions": ["how to improve"]
}`
        }
      ],
      { provider: 'anthropic', temperature: 0.3 }
    );

    const defaultPrediction = {
      predictedScore: 3,
      confidence: 0.5,
      factors: [],
      improvementSuggestions: []
    };

    if (!response.success || !response.content) {
      return defaultPrediction;
    }

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return { ...defaultPrediction, ...JSON.parse(jsonMatch[0]) };
      }
    } catch (e) {
      console.error('[Support AI] Failed to parse CSAT prediction:', e);
    }

    return defaultPrediction;
  }
}

export const supportAIAgent = new SupportAIAgent();
export default supportAIAgent;
