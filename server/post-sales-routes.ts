import { Router } from 'express';
import { storage } from './storage';

const router = Router();

// Client Health Scoring Routes
router.get('/health-scores', async (req, res) => {
  try {
    const { clientId, riskLevel } = req.query;
    
    if (clientId) {
      const healthScore = await storage.getClientHealthScore(Number(clientId));
      return res.json(healthScore);
    }
    
    if (riskLevel && riskLevel !== 'all') {
      const clientsAtRisk = await storage.getClientsAtRisk(riskLevel as string);
      return res.json(clientsAtRisk);
    }
    
    // Get health score analytics
    const analytics = await storage.getHealthScoreAnalytics();
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching health scores:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/health-scores', async (req, res) => {
  try {
    const healthScore = await storage.createClientHealthScore(req.body);
    res.status(201).json(healthScore);
  } catch (error) {
    console.error('Error creating health score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/health-scores/:id', async (req, res) => {
  try {
    const healthScore = await storage.updateClientHealthScore(Number(req.params.id), req.body);
    if (!healthScore) {
      return res.status(404).json({ error: 'Health score not found' });
    }
    res.json(healthScore);
  } catch (error) {
    console.error('Error updating health score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/health-scores/:clientId/calculate', async (req, res) => {
  try {
    const healthScore = await storage.calculateClientHealthScore(Number(req.params.clientId));
    res.json(healthScore);
  } catch (error) {
    console.error('Error calculating health score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upselling Opportunities Routes
router.get('/upsell-opportunities', async (req, res) => {
  try {
    const { clientId, status, priority, assignedTo, limit = 50, offset = 0 } = req.query;
    
    const filters = {
      clientId: clientId ? Number(clientId) : undefined,
      status: status as string,
      priority: priority as string,
      assignedTo: assignedTo ? Number(assignedTo) : undefined,
      limit: Number(limit),
      offset: Number(offset)
    };
    
    const result = await storage.getAllUpsellOpportunities(filters);
    res.json(result);
  } catch (error) {
    console.error('Error fetching upsell opportunities:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/upsell-opportunities/:id', async (req, res) => {
  try {
    const opportunity = await storage.getUpsellOpportunity(Number(req.params.id));
    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }
    res.json(opportunity);
  } catch (error) {
    console.error('Error fetching upsell opportunity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/upsell-opportunities', async (req, res) => {
  try {
    const opportunity = await storage.createUpsellOpportunity(req.body);
    res.status(201).json(opportunity);
  } catch (error) {
    console.error('Error creating upsell opportunity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/upsell-opportunities/:id', async (req, res) => {
  try {
    const opportunity = await storage.updateUpsellOpportunity(Number(req.params.id), req.body);
    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }
    res.json(opportunity);
  } catch (error) {
    console.error('Error updating upsell opportunity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/upsell-opportunities/:id', async (req, res) => {
  try {
    const deleted = await storage.deleteUpsellOpportunity(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting upsell opportunity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/upsell-opportunities/:clientId/identify', async (req, res) => {
  try {
    const opportunities = await storage.identifyUpsellOpportunities(Number(req.params.clientId));
    res.json(opportunities);
  } catch (error) {
    console.error('Error identifying upsell opportunities:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/upsell-stats', async (req, res) => {
  try {
    const stats = await storage.getUpsellStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching upsell stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Loyalty Programs Routes
router.get('/loyalty-programs', async (req, res) => {
  try {
    const programs = await storage.getAllLoyaltyPrograms();
    res.json(programs);
  } catch (error) {
    console.error('Error fetching loyalty programs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/loyalty-programs/:programId', async (req, res) => {
  try {
    const program = await storage.getLoyaltyProgram(req.params.programId);
    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }
    res.json(program);
  } catch (error) {
    console.error('Error fetching loyalty program:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/loyalty-programs', async (req, res) => {
  try {
    const program = await storage.createLoyaltyProgram(req.body);
    res.status(201).json(program);
  } catch (error) {
    console.error('Error creating loyalty program:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/loyalty-status/:clientId', async (req, res) => {
  try {
    const { programId } = req.query;
    const status = await storage.getClientLoyaltyStatus(Number(req.params.clientId), programId as string);
    if (!status) {
      return res.status(404).json({ error: 'Loyalty status not found' });
    }
    res.json(status);
  } catch (error) {
    console.error('Error fetching loyalty status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/loyalty-status', async (req, res) => {
  try {
    const status = await storage.createClientLoyaltyStatus(req.body);
    res.status(201).json(status);
  } catch (error) {
    console.error('Error creating loyalty status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/loyalty-status/:clientId/award-points', async (req, res) => {
  try {
    const { points, reason } = req.body;
    const status = await storage.awardLoyaltyPoints(Number(req.params.clientId), points, reason);
    if (!status) {
      return res.status(404).json({ error: 'Client loyalty status not found' });
    }
    res.json(status);
  } catch (error) {
    console.error('Error awarding loyalty points:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/loyalty-status/:clientId/redeem-points', async (req, res) => {
  try {
    const { points } = req.body;
    const status = await storage.redeemLoyaltyPoints(Number(req.params.clientId), points);
    if (!status) {
      return res.status(400).json({ error: 'Insufficient points or client not found' });
    }
    res.json(status);
  } catch (error) {
    console.error('Error redeeming loyalty points:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/loyalty-analytics', async (req, res) => {
  try {
    const analytics = await storage.getLoyaltyAnalytics();
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching loyalty analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Relationship Events Routes
router.get('/relationship-events', async (req, res) => {
  try {
    const { clientId, eventType, category, sentiment, limit = 50, offset = 0 } = req.query;
    
    const filters = {
      clientId: clientId ? Number(clientId) : undefined,
      eventType: eventType as string,
      category: category as string,
      sentiment: sentiment as string,
      limit: Number(limit),
      offset: Number(offset)
    };
    
    const result = await storage.getAllRelationshipEvents(filters);
    res.json(result);
  } catch (error) {
    console.error('Error fetching relationship events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/relationship-events/:id', async (req, res) => {
  try {
    const event = await storage.getRelationshipEvent(Number(req.params.id));
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    console.error('Error fetching relationship event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/relationship-events', async (req, res) => {
  try {
    const event = await storage.createRelationshipEvent(req.body);
    res.status(201).json(event);
  } catch (error) {
    console.error('Error creating relationship event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/relationship-events/:id', async (req, res) => {
  try {
    const event = await storage.updateRelationshipEvent(Number(req.params.id), req.body);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    console.error('Error updating relationship event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/relationship-events/:id', async (req, res) => {
  try {
    const deleted = await storage.deleteRelationshipEvent(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting relationship event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/relationship-timeline/:clientId', async (req, res) => {
  try {
    const timeline = await storage.getClientRelationshipTimeline(Number(req.params.clientId));
    res.json(timeline);
  } catch (error) {
    console.error('Error fetching relationship timeline:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/relationship-insights/:clientId', async (req, res) => {
  try {
    const insights = await storage.getRelationshipInsights(Number(req.params.clientId));
    res.json(insights);
  } catch (error) {
    console.error('Error fetching relationship insights:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Client Feedback Routes
router.get('/client-feedback', async (req, res) => {
  try {
    const { clientId, serviceCategory, overallRating, hasIssues, limit = 50, offset = 0 } = req.query;
    
    const filters = {
      clientId: clientId ? Number(clientId) : undefined,
      serviceCategory: serviceCategory as string,
      overallRating: overallRating ? Number(overallRating) : undefined,
      hasIssues: hasIssues === 'true' ? true : hasIssues === 'false' ? false : undefined,
      limit: Number(limit),
      offset: Number(offset)
    };
    
    const result = await storage.getAllClientFeedback(filters);
    res.json(result);
  } catch (error) {
    console.error('Error fetching client feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/client-feedback/:id', async (req, res) => {
  try {
    const feedback = await storage.getClientFeedback(Number(req.params.id));
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    res.json(feedback);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/client-feedback', async (req, res) => {
  try {
    const feedback = await storage.createClientFeedback(req.body);
    res.status(201).json(feedback);
  } catch (error) {
    console.error('Error creating feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/client-feedback/:id', async (req, res) => {
  try {
    const feedback = await storage.updateClientFeedback(Number(req.params.id), req.body);
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    res.json(feedback);
  } catch (error) {
    console.error('Error updating feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/feedback-analytics', async (req, res) => {
  try {
    const analytics = await storage.getFeedbackAnalytics();
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching feedback analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Post-Sales Management Routes
router.get('/post-sales/:serviceRequestId', async (req, res) => {
  try {
    const record = await storage.getPostSalesRecord(Number(req.params.serviceRequestId));
    if (!record) {
      return res.status(404).json({ error: 'Post-sales record not found' });
    }
    res.json(record);
  } catch (error) {
    console.error('Error fetching post-sales record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/post-sales', async (req, res) => {
  try {
    const record = await storage.createPostSalesRecord(req.body);
    res.status(201).json(record);
  } catch (error) {
    console.error('Error creating post-sales record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/post-sales/:id', async (req, res) => {
  try {
    const record = await storage.updatePostSalesRecord(Number(req.params.id), req.body);
    if (!record) {
      return res.status(404).json({ error: 'Post-sales record not found' });
    }
    res.json(record);
  } catch (error) {
    console.error('Error updating post-sales record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/post-sales-analytics', async (req, res) => {
  try {
    const analytics = await storage.getPostSalesAnalytics();
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching post-sales analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Advanced Analytics Routes
router.get('/client-segmentation', async (req, res) => {
  try {
    const analysis = await storage.getClientSegmentationAnalysis();
    res.json(analysis);
  } catch (error) {
    console.error('Error fetching client segmentation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/revenue-growth', async (req, res) => {
  try {
    const analytics = await storage.getRevenueGrowthAnalytics();
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching revenue growth analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/retention-analytics', async (req, res) => {
  try {
    const analytics = await storage.getRetentionAnalytics();
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching retention analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;