/**
 * Sales AI Agent
 *
 * AI-powered sales intelligence:
 * - Lead scoring and qualification
 * - Conversion probability prediction
 * - Personalized pitch generation
 * - Upsell opportunity detection
 */

import { aiGateway } from './ai-gateway';

interface LeadProfile {
  id: number;
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  entityType?: string;
  industry?: string;
  estimatedRevenue?: number;
  employeeCount?: number;
  city?: string;
  state?: string;
  source?: string;
  currentStage: string;
  interactions: Array<{
    type: string;
    date: Date;
    notes?: string;
    outcome?: string;
  }>;
  requirements?: string[];
  budget?: number;
  timeline?: string;
}

interface LeadScore {
  overallScore: number;
  conversionProbability: number;
  confidence: number;
  scoreBreakdown: {
    companyFit: number;
    engagement: number;
    budget: number;
    timing: number;
    intent: number;
  };
  insights: string[];
  nextBestActions: string[];
  idealServices: string[];
  riskFactors: string[];
}

interface SalesPitch {
  openingHook: string;
  valuePropositon: string;
  painPoints: string[];
  solutions: string[];
  proofPoints: string[];
  objectionHandlers: Record<string, string>;
  closingStatement: string;
  recommendedServices: Array<{
    service: string;
    relevance: string;
    price?: string;
  }>;
}

interface UpsellOpportunity {
  service: string;
  relevance: number;
  reasoning: string;
  trigger: string;
  bestTiming: string;
  estimatedValue: number;
  pitchApproach: string;
}

/**
 * Sales AI Agent
 */
class SalesAIAgent {

  /**
   * Score and qualify a lead
   */
  async scoreLead(lead: LeadProfile): Promise<LeadScore> {
    const systemPrompt = `You are an expert sales analyst for a B2B compliance services company in India. Score and qualify leads based on their profile and engagement.

Scoring Criteria (0-100 each):
1. Company Fit - Entity type, industry, size match with ideal customer
2. Engagement - Interaction frequency, quality, responsiveness
3. Budget - Alignment with service pricing
4. Timing - Urgency and decision timeline
5. Intent - Signals of buying intent

Ideal Customer Profile:
- Pvt Ltd, LLP companies with 10-500 employees
- Industries: Tech, Manufacturing, Services, Healthcare
- Revenue: ₹1Cr - ₹100Cr
- Pain: Manual compliance, missed deadlines, penalties`;

    const userMessage = `Score this lead:

Company: ${lead.companyName}
Entity Type: ${lead.entityType || 'Unknown'}
Industry: ${lead.industry || 'Unknown'}
Estimated Revenue: ${lead.estimatedRevenue ? `₹${lead.estimatedRevenue}` : 'Unknown'}
Employees: ${lead.employeeCount || 'Unknown'}
Location: ${lead.city || ''}, ${lead.state || ''}
Source: ${lead.source || 'Unknown'}
Current Stage: ${lead.currentStage}

Interactions:
${lead.interactions.slice(-10).map(i =>
  `- ${i.type} on ${new Date(i.date).toLocaleDateString()}: ${i.notes || 'No notes'} (${i.outcome || 'No outcome'})`
).join('\n')}

Requirements: ${lead.requirements?.join(', ') || 'Not specified'}
Budget: ${lead.budget ? `₹${lead.budget}` : 'Not specified'}
Timeline: ${lead.timeline || 'Not specified'}

Provide scoring in JSON format:
{
  "overallScore": 0-100,
  "conversionProbability": 0.0-1.0,
  "confidence": 0.0-1.0,
  "scoreBreakdown": {
    "companyFit": 0-100,
    "engagement": 0-100,
    "budget": 0-100,
    "timing": 0-100,
    "intent": 0-100
  },
  "insights": ["key observations"],
  "nextBestActions": ["recommended actions"],
  "idealServices": ["matching services"],
  "riskFactors": ["potential deal risks"]
}`;

    const response = await aiGateway.complete(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      { provider: 'anthropic', temperature: 0.3 }
    );

    const defaultScore: LeadScore = {
      overallScore: 50,
      conversionProbability: 0.3,
      confidence: 0.5,
      scoreBreakdown: { companyFit: 50, engagement: 50, budget: 50, timing: 50, intent: 50 },
      insights: ['Unable to fully analyze lead'],
      nextBestActions: ['Schedule discovery call'],
      idealServices: [],
      riskFactors: []
    };

    if (!response.success || !response.content) {
      return defaultScore;
    }

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return { ...defaultScore, ...JSON.parse(jsonMatch[0]) };
      }
    } catch (e) {
      console.error('[Sales AI] Failed to parse lead score:', e);
    }

    return defaultScore;
  }

  /**
   * Generate personalized sales pitch
   */
  async generatePitch(lead: LeadProfile, context?: {
    competitorMentioned?: string;
    specificPainPoint?: string;
    meetingType?: 'discovery' | 'demo' | 'proposal' | 'closing';
  }): Promise<SalesPitch> {
    const systemPrompt = `You are an expert B2B sales consultant for DigiComply, an AI-powered compliance automation platform in India. Generate compelling, personalized sales pitches.

DigiComply Services:
- Company Registration (Pvt Ltd, LLP, OPC)
- GST Registration & Returns
- Income Tax Filing & TDS
- ROC/MCA Compliance
- Trademark & IP Registration
- Accounting & Bookkeeping
- Legal Documentation
- HR & Payroll Compliance

Key Value Propositions:
- 90% reduction in compliance penalties
- AI-powered deadline tracking
- Single dashboard for all compliances
- Expert CA/CS support
- WhatsApp integration
- Funding readiness score`;

    const userMessage = `Generate a sales pitch for:

Company: ${lead.companyName}
Industry: ${lead.industry || 'General'}
Entity Type: ${lead.entityType || 'Pvt Ltd'}
Size: ${lead.employeeCount || 'SMB'} employees

Meeting Type: ${context?.meetingType || 'discovery'}
${context?.specificPainPoint ? `Pain Point: ${context.specificPainPoint}` : ''}
${context?.competitorMentioned ? `Competitor Mentioned: ${context.competitorMentioned}` : ''}

Provide pitch in JSON format:
{
  "openingHook": "attention-grabbing opener",
  "valuePropositon": "core value statement",
  "painPoints": ["identified pain points"],
  "solutions": ["how DigiComply solves each"],
  "proofPoints": ["relevant case studies/stats"],
  "objectionHandlers": {
    "price": "response to price objection",
    "timing": "response to timing objection",
    "competitor": "response to competitor comparison"
  },
  "closingStatement": "call to action",
  "recommendedServices": [
    {"service": "name", "relevance": "why relevant", "price": "estimate"}
  ]
}`;

    const response = await aiGateway.complete(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      { provider: 'anthropic', temperature: 0.6 }
    );

    const defaultPitch: SalesPitch = {
      openingHook: `I noticed ${lead.companyName} is in the ${lead.industry || 'growing'} space...`,
      valuePropositon: 'DigiComply helps businesses stay 100% compliant with zero effort.',
      painPoints: ['Manual compliance tracking', 'Missed deadlines', 'Penalty exposure'],
      solutions: ['Automated reminders', 'AI-powered tracking', 'Expert support'],
      proofPoints: ['500+ companies trust us', '90% reduction in penalties'],
      objectionHandlers: {},
      closingStatement: 'Shall we schedule a demo to show how this works for your business?',
      recommendedServices: []
    };

    if (!response.success || !response.content) {
      return defaultPitch;
    }

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return { ...defaultPitch, ...JSON.parse(jsonMatch[0]) };
      }
    } catch (e) {
      console.error('[Sales AI] Failed to parse pitch:', e);
    }

    return defaultPitch;
  }

  /**
   * Identify upsell opportunities for existing client
   */
  async identifyUpsellOpportunities(
    clientProfile: {
      entityId: number;
      entityType: string;
      industry?: string;
      currentServices: string[];
      revenue?: number;
      employeeCount?: number;
      complianceScore?: number;
      recentEvents?: string[];
    }
  ): Promise<UpsellOpportunity[]> {
    const systemPrompt = `You are a customer success manager identifying upsell opportunities for a compliance services company.

Service Catalog:
- Company Secretary Services (₹25,000/year)
- Advanced GST Package (₹15,000/year)
- Tax Planning & Advisory (₹30,000/year)
- Legal Documentation Pack (₹20,000/year)
- HR & Payroll Compliance (₹18,000/year)
- Trademark Registration (₹15,000)
- ISO Certification (₹50,000)
- Startup India Registration (₹5,000)
- MSME Registration (₹2,000)
- Import-Export Code (₹5,000)

Upsell triggers:
- Business growth (new employees, revenue increase)
- Compliance gaps
- Industry requirements
- Funding preparation
- Expansion plans`;

    const userMessage = `Identify upsell opportunities for:

Entity Type: ${clientProfile.entityType}
Industry: ${clientProfile.industry || 'General'}
Revenue: ${clientProfile.revenue ? `₹${clientProfile.revenue}` : 'Unknown'}
Employees: ${clientProfile.employeeCount || 'Unknown'}
Compliance Score: ${clientProfile.complianceScore || 'Unknown'}

Current Services:
${clientProfile.currentServices.map(s => `- ${s}`).join('\n')}

Recent Events:
${clientProfile.recentEvents?.map(e => `- ${e}`).join('\n') || 'None'}

Provide opportunities in JSON format:
{
  "opportunities": [
    {
      "service": "string",
      "relevance": 0.0-1.0,
      "reasoning": "why relevant now",
      "trigger": "what triggered this recommendation",
      "bestTiming": "when to pitch",
      "estimatedValue": number,
      "pitchApproach": "how to position"
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
        return parsed.opportunities || [];
      }
    } catch (e) {
      console.error('[Sales AI] Failed to parse upsell opportunities:', e);
    }

    return [];
  }

  /**
   * Generate follow-up email
   */
  async generateFollowUpEmail(
    lead: LeadProfile,
    context: {
      previousInteraction: string;
      objective: 'schedule_call' | 'send_proposal' | 'close_deal' | 're_engage';
      tone?: 'formal' | 'friendly' | 'urgent';
    }
  ): Promise<{
    subject: string;
    body: string;
    callToAction: string;
    followUpTiming: string;
  }> {
    const response = await aiGateway.complete(
      [
        {
          role: 'system',
          content: `You are a sales professional writing follow-up emails. Be concise, professional, and value-focused.`
        },
        {
          role: 'user',
          content: `Write a follow-up email for:

Contact: ${lead.contactName || 'there'}
Company: ${lead.companyName}
Previous: ${context.previousInteraction}
Objective: ${context.objective}
Tone: ${context.tone || 'friendly'}

Format as JSON:
{
  "subject": "email subject",
  "body": "email body (use line breaks)",
  "callToAction": "specific next step",
  "followUpTiming": "when to follow up if no response"
}`
        }
      ],
      { provider: 'anthropic', temperature: 0.6 }
    );

    const defaultEmail = {
      subject: `Following up - ${lead.companyName}`,
      body: `Hi ${lead.contactName || 'there'},\n\nI wanted to follow up on our previous conversation...`,
      callToAction: 'Let me know if you have any questions.',
      followUpTiming: '3 business days'
    };

    if (!response.success || !response.content) {
      return defaultEmail;
    }

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return { ...defaultEmail, ...JSON.parse(jsonMatch[0]) };
      }
    } catch (e) {
      console.error('[Sales AI] Failed to parse email:', e);
    }

    return defaultEmail;
  }

  /**
   * Analyze sales call transcript
   */
  async analyzeCallTranscript(
    transcript: string,
    context?: { leadId: number; callType: string }
  ): Promise<{
    summary: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    buyingSignals: string[];
    objections: string[];
    competitorMentions: string[];
    actionItems: string[];
    nextSteps: string[];
    coachingTips: string[];
  }> {
    const response = await aiGateway.complete(
      [
        {
          role: 'system',
          content: 'You are a sales coach analyzing call transcripts for insights and coaching opportunities.'
        },
        {
          role: 'user',
          content: `Analyze this sales call transcript:

${transcript.substring(0, 8000)}

Provide analysis in JSON format:
{
  "summary": "2-3 sentence summary",
  "sentiment": "positive|neutral|negative",
  "buyingSignals": ["detected buying signals"],
  "objections": ["objections raised"],
  "competitorMentions": ["competitors mentioned"],
  "actionItems": ["committed action items"],
  "nextSteps": ["recommended next steps"],
  "coachingTips": ["improvement suggestions for sales rep"]
}`
        }
      ],
      { provider: 'anthropic', temperature: 0.3 }
    );

    const defaultAnalysis = {
      summary: 'Call analysis unavailable',
      sentiment: 'neutral' as const,
      buyingSignals: [],
      objections: [],
      competitorMentions: [],
      actionItems: [],
      nextSteps: [],
      coachingTips: []
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
      console.error('[Sales AI] Failed to parse call analysis:', e);
    }

    return defaultAnalysis;
  }
}

export const salesAIAgent = new SalesAIAgent();
export default salesAIAgent;
