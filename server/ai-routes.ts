/**
 * AI Routes
 *
 * REST API endpoints for AI-powered features
 */

import { Router, Request, Response } from 'express';
import { sessionAuthMiddleware, type AuthenticatedRequest } from './rbac-middleware';
import { aiGateway } from './services/ai/ai-gateway';
import { complianceAIAgent } from './services/ai/compliance-ai-agent';
import { salesAIAgent } from './services/ai/sales-ai-agent';
import { documentAIAgent } from './services/ai/document-ai-agent';
import { supportAIAgent } from './services/ai/support-ai-agent';

const router = Router();

// ============================================================================
// AI GATEWAY ROUTES
// ============================================================================

/**
 * GET /api/ai/status
 * Check AI provider configuration status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = aiGateway.getProviderStatus();

    res.json({
      providers: status,
      configured: Object.values(status).some(v => v),
      recommended: {
        reasoning: 'anthropic',
        search: 'perplexity',
        multimodal: 'gemini',
        embeddings: 'openai'
      }
    });
  } catch (error: any) {
    console.error('[AI Routes] Status error:', error);
    res.status(500).json({ error: 'Failed to get AI status' });
  }
});

/**
 * POST /api/ai/chat
 * General AI chat endpoint
 */
router.post('/chat', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { message, context, provider, taskType } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const messages = [
      { role: 'user' as const, content: message }
    ];

    if (context) {
      messages.unshift({ role: 'system' as const, content: context });
    }

    let response;
    if (taskType) {
      response = await aiGateway.smartComplete(messages, taskType);
    } else {
      response = await aiGateway.complete(messages, { provider });
    }

    res.json(response);
  } catch (error: any) {
    console.error('[AI Routes] Chat error:', error);
    res.status(500).json({ error: 'AI chat failed' });
  }
});

// ============================================================================
// COMPLIANCE AI ROUTES
// ============================================================================

/**
 * POST /api/ai/compliance/predict
 * Predict compliance failures
 */
router.post('/compliance/predict', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { entityId, entityType, industry, state, currentCompliances, historicalData, lookAheadDays } = req.body;

    if (!entityType) {
      return res.status(400).json({ error: 'Entity type is required' });
    }

    const predictions = await complianceAIAgent.predictComplianceFailures(
      {
        entityId,
        entityType,
        industry,
        state,
        currentCompliances: currentCompliances || [],
        historicalData
      },
      lookAheadDays || 90
    );

    res.json({
      predictions,
      generatedAt: new Date().toISOString(),
      entityId
    });
  } catch (error: any) {
    console.error('[AI Routes] Compliance predict error:', error);
    res.status(500).json({ error: 'Failed to generate predictions' });
  }
});

/**
 * POST /api/ai/compliance/recommendations
 * Get personalized compliance recommendations
 */
router.post('/compliance/recommendations', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { entityId, entityType, industry, currentCompliances, historicalData, focus } = req.body;

    const recommendations = await complianceAIAgent.generateRecommendations(
      {
        entityId,
        entityType: entityType || 'PRIVATE_LIMITED',
        industry,
        currentCompliances: currentCompliances || [],
        historicalData
      },
      focus
    );

    res.json({
      recommendations,
      generatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[AI Routes] Recommendations error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

/**
 * POST /api/ai/compliance/ask
 * Ask compliance questions
 */
router.post('/compliance/ask', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { question, entityType, industry, relevantDocs } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const answer = await complianceAIAgent.answerQuestion(
      question,
      { entityType, industry, relevantDocs }
    );

    res.json(answer);
  } catch (error: any) {
    console.error('[AI Routes] Compliance ask error:', error);
    res.status(500).json({ error: 'Failed to answer question' });
  }
});

/**
 * GET /api/ai/compliance/regulatory-updates
 * Get recent regulatory updates
 */
router.get('/compliance/regulatory-updates', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { domain, lookbackDays } = req.query;

    const updates = await complianceAIAgent.analyzeRegulatoryChanges(
      domain as string || 'GST',
      Number(lookbackDays) || 30
    );

    res.json(updates);
  } catch (error: any) {
    console.error('[AI Routes] Regulatory updates error:', error);
    res.status(500).json({ error: 'Failed to fetch regulatory updates' });
  }
});

/**
 * POST /api/ai/compliance/calendar
 * Generate compliance calendar
 */
router.post('/compliance/calendar', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { entityId, entityType, industry, state, currentCompliances, months } = req.body;

    const calendar = await complianceAIAgent.generateComplianceCalendar(
      {
        entityId,
        entityType: entityType || 'PRIVATE_LIMITED',
        industry,
        state,
        currentCompliances: currentCompliances || []
      },
      months || 3
    );

    res.json({
      calendar,
      generatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[AI Routes] Calendar error:', error);
    res.status(500).json({ error: 'Failed to generate calendar' });
  }
});

/**
 * POST /api/ai/compliance/summarize-document
 * Summarize compliance document
 */
router.post('/compliance/summarize-document', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { documentText, documentType } = req.body;

    if (!documentText) {
      return res.status(400).json({ error: 'Document text is required' });
    }

    const summary = await complianceAIAgent.summarizeDocument(
      documentText,
      documentType || 'compliance document'
    );

    res.json(summary);
  } catch (error: any) {
    console.error('[AI Routes] Document summarize error:', error);
    res.status(500).json({ error: 'Failed to summarize document' });
  }
});

// ============================================================================
// SALES AI ROUTES
// ============================================================================

/**
 * POST /api/ai/sales/score-lead
 * Score and qualify a lead
 */
router.post('/sales/score-lead', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const leadProfile = req.body;

    if (!leadProfile.companyName) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    const score = await salesAIAgent.scoreLead(leadProfile);

    res.json({
      leadId: leadProfile.id,
      ...score,
      generatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[AI Routes] Lead score error:', error);
    res.status(500).json({ error: 'Failed to score lead' });
  }
});

/**
 * POST /api/ai/sales/generate-pitch
 * Generate personalized sales pitch
 */
router.post('/sales/generate-pitch', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { lead, competitorMentioned, specificPainPoint, meetingType } = req.body;

    if (!lead) {
      return res.status(400).json({ error: 'Lead profile is required' });
    }

    const pitch = await salesAIAgent.generatePitch(
      lead,
      { competitorMentioned, specificPainPoint, meetingType }
    );

    res.json(pitch);
  } catch (error: any) {
    console.error('[AI Routes] Pitch error:', error);
    res.status(500).json({ error: 'Failed to generate pitch' });
  }
});

/**
 * POST /api/ai/sales/upsell-opportunities
 * Identify upsell opportunities
 */
router.post('/sales/upsell-opportunities', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const clientProfile = req.body;

    if (!clientProfile.entityId) {
      return res.status(400).json({ error: 'Entity ID is required' });
    }

    const opportunities = await salesAIAgent.identifyUpsellOpportunities(clientProfile);

    res.json({
      entityId: clientProfile.entityId,
      opportunities,
      generatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[AI Routes] Upsell error:', error);
    res.status(500).json({ error: 'Failed to identify opportunities' });
  }
});

/**
 * POST /api/ai/sales/follow-up-email
 * Generate follow-up email
 */
router.post('/sales/follow-up-email', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { lead, previousInteraction, objective, tone } = req.body;

    if (!lead || !previousInteraction) {
      return res.status(400).json({ error: 'Lead and previous interaction are required' });
    }

    const email = await salesAIAgent.generateFollowUpEmail(
      lead,
      { previousInteraction, objective: objective || 'schedule_call', tone }
    );

    res.json(email);
  } catch (error: any) {
    console.error('[AI Routes] Follow-up email error:', error);
    res.status(500).json({ error: 'Failed to generate email' });
  }
});

/**
 * POST /api/ai/sales/analyze-call
 * Analyze sales call transcript
 */
router.post('/sales/analyze-call', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { transcript, leadId, callType } = req.body;

    if (!transcript) {
      return res.status(400).json({ error: 'Transcript is required' });
    }

    const analysis = await salesAIAgent.analyzeCallTranscript(
      transcript,
      { leadId, callType }
    );

    res.json(analysis);
  } catch (error: any) {
    console.error('[AI Routes] Call analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze call' });
  }
});

// ============================================================================
// DOCUMENT AI ROUTES
// ============================================================================

/**
 * POST /api/ai/documents/classify
 * Auto-classify document
 */
router.post('/documents/classify', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fileName, fileType, fileSize, textContent } = req.body;

    if (!fileName) {
      return res.status(400).json({ error: 'File name is required' });
    }

    const classification = await documentAIAgent.classifyDocument(
      {
        fileName,
        fileType: fileType || 'application/pdf',
        fileSize: fileSize || 0,
        uploadDate: new Date(),
        textContent
      },
      textContent
    );

    res.json(classification);
  } catch (error: any) {
    console.error('[AI Routes] Classify error:', error);
    res.status(500).json({ error: 'Failed to classify document' });
  }
});

/**
 * POST /api/ai/documents/extract
 * Extract information from document
 */
router.post('/documents/extract', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { documentText, documentType } = req.body;

    if (!documentText) {
      return res.status(400).json({ error: 'Document text is required' });
    }

    const extracted = await documentAIAgent.extractInformation(
      documentText,
      documentType
    );

    res.json(extracted);
  } catch (error: any) {
    console.error('[AI Routes] Extract error:', error);
    res.status(500).json({ error: 'Failed to extract information' });
  }
});

/**
 * POST /api/ai/documents/ask
 * Ask questions about a document
 */
router.post('/documents/ask', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { documentText, question, documentType } = req.body;

    if (!documentText || !question) {
      return res.status(400).json({ error: 'Document text and question are required' });
    }

    const answer = await documentAIAgent.answerQuestion(
      documentText,
      question,
      documentType
    );

    res.json(answer);
  } catch (error: any) {
    console.error('[AI Routes] Document Q&A error:', error);
    res.status(500).json({ error: 'Failed to answer question' });
  }
});

/**
 * POST /api/ai/documents/translate
 * Translate document
 */
router.post('/documents/translate', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { text, sourceLanguage, targetLanguage, preserveFormatting } = req.body;

    if (!text || !sourceLanguage || !targetLanguage) {
      return res.status(400).json({ error: 'Text and languages are required' });
    }

    const translation = await documentAIAgent.translateDocument(
      text,
      sourceLanguage,
      targetLanguage,
      preserveFormatting !== false
    );

    res.json(translation);
  } catch (error: any) {
    console.error('[AI Routes] Translate error:', error);
    res.status(500).json({ error: 'Failed to translate document' });
  }
});

/**
 * POST /api/ai/documents/summarize
 * Summarize document
 */
router.post('/documents/summarize', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { documentText, documentType, summaryLength } = req.body;

    if (!documentText) {
      return res.status(400).json({ error: 'Document text is required' });
    }

    const summary = await documentAIAgent.summarizeDocument(
      documentText,
      documentType,
      summaryLength || 'brief'
    );

    res.json(summary);
  } catch (error: any) {
    console.error('[AI Routes] Summarize error:', error);
    res.status(500).json({ error: 'Failed to summarize document' });
  }
});

/**
 * POST /api/ai/documents/compare
 * Compare two documents
 */
router.post('/documents/compare', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { doc1Text, doc2Text, comparisonType } = req.body;

    if (!doc1Text || !doc2Text) {
      return res.status(400).json({ error: 'Both documents are required' });
    }

    const comparison = await documentAIAgent.compareDocuments(
      doc1Text,
      doc2Text,
      comparisonType || 'general'
    );

    res.json(comparison);
  } catch (error: any) {
    console.error('[AI Routes] Compare error:', error);
    res.status(500).json({ error: 'Failed to compare documents' });
  }
});

/**
 * POST /api/ai/documents/validate
 * Validate document for compliance
 */
router.post('/documents/validate', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { documentText, documentType, entityType } = req.body;

    if (!documentText || !documentType) {
      return res.status(400).json({ error: 'Document text and type are required' });
    }

    const validation = await documentAIAgent.validateForCompliance(
      documentText,
      documentType,
      entityType || 'PRIVATE_LIMITED'
    );

    res.json(validation);
  } catch (error: any) {
    console.error('[AI Routes] Validate error:', error);
    res.status(500).json({ error: 'Failed to validate document' });
  }
});

// ============================================================================
// SUPPORT AI ROUTES
// ============================================================================

/**
 * POST /api/ai/support/classify-ticket
 * Classify and prioritize support ticket
 */
router.post('/support/classify-ticket', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ticket = req.body;

    if (!ticket.subject || !ticket.description) {
      return res.status(400).json({ error: 'Subject and description are required' });
    }

    const classification = await supportAIAgent.classifyTicket({
      ...ticket,
      createdAt: ticket.createdAt ? new Date(ticket.createdAt) : new Date()
    });

    res.json(classification);
  } catch (error: any) {
    console.error('[AI Routes] Classify ticket error:', error);
    res.status(500).json({ error: 'Failed to classify ticket' });
  }
});

/**
 * POST /api/ai/support/generate-response
 * Generate automated support response
 */
router.post('/support/generate-response', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ticket, previousResponses, clientHistory, relevantKnowledge } = req.body;

    if (!ticket) {
      return res.status(400).json({ error: 'Ticket is required' });
    }

    const response = await supportAIAgent.generateResponse(
      {
        ...ticket,
        createdAt: ticket.createdAt ? new Date(ticket.createdAt) : new Date()
      },
      { previousResponses, clientHistory, relevantKnowledge }
    );

    res.json(response);
  } catch (error: any) {
    console.error('[AI Routes] Generate response error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

/**
 * POST /api/ai/support/analyze-sentiment
 * Analyze customer sentiment
 */
router.post('/support/analyze-sentiment', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { text, ticketHistory, clientTier } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const analysis = await supportAIAgent.analyzeSentiment(
      text,
      { ticketHistory, clientTier }
    );

    res.json(analysis);
  } catch (error: any) {
    console.error('[AI Routes] Sentiment error:', error);
    res.status(500).json({ error: 'Failed to analyze sentiment' });
  }
});

/**
 * POST /api/ai/support/search-knowledge
 * Search knowledge base
 */
router.post('/support/search-knowledge', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { query, category } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const results = await supportAIAgent.searchKnowledge(query, category);

    res.json(results);
  } catch (error: any) {
    console.error('[AI Routes] Knowledge search error:', error);
    res.status(500).json({ error: 'Failed to search knowledge base' });
  }
});

/**
 * POST /api/ai/support/ticket-summary
 * Generate ticket summary for handoff
 */
router.post('/support/ticket-summary', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ticket, conversationHistory } = req.body;

    if (!ticket || !conversationHistory) {
      return res.status(400).json({ error: 'Ticket and conversation history are required' });
    }

    const summary = await supportAIAgent.generateTicketSummary(
      {
        ...ticket,
        createdAt: ticket.createdAt ? new Date(ticket.createdAt) : new Date()
      },
      conversationHistory.map((c: any) => ({
        ...c,
        timestamp: new Date(c.timestamp)
      }))
    );

    res.json(summary);
  } catch (error: any) {
    console.error('[AI Routes] Ticket summary error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

/**
 * POST /api/ai/support/suggest-responses
 * Suggest canned responses
 */
router.post('/support/suggest-responses', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ticket = req.body;

    if (!ticket.subject) {
      return res.status(400).json({ error: 'Ticket subject is required' });
    }

    const suggestions = await supportAIAgent.suggestCannedResponses({
      ...ticket,
      createdAt: ticket.createdAt ? new Date(ticket.createdAt) : new Date()
    });

    res.json({ suggestions });
  } catch (error: any) {
    console.error('[AI Routes] Suggest responses error:', error);
    res.status(500).json({ error: 'Failed to suggest responses' });
  }
});

/**
 * POST /api/ai/support/predict-csat
 * Predict CSAT score
 */
router.post('/support/predict-csat', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { conversationHistory, resolutionStatus } = req.body;

    if (!conversationHistory) {
      return res.status(400).json({ error: 'Conversation history is required' });
    }

    const prediction = await supportAIAgent.predictCSAT(
      conversationHistory,
      resolutionStatus || 'pending'
    );

    res.json(prediction);
  } catch (error: any) {
    console.error('[AI Routes] CSAT predict error:', error);
    res.status(500).json({ error: 'Failed to predict CSAT' });
  }
});

// ============================================================================
// EMBEDDINGS ROUTE
// ============================================================================

/**
 * POST /api/ai/embeddings
 * Generate text embeddings
 */
router.post('/embeddings', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const embedding = await aiGateway.generateEmbedding(text);

    res.json(embedding);
  } catch (error: any) {
    console.error('[AI Routes] Embedding error:', error);
    res.status(500).json({ error: 'Failed to generate embedding' });
  }
});

export default router;
