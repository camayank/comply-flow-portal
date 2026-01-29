import { Router } from 'express';
import { storage } from './storage';

const router = Router();

// ============================================================================
// CLIENT MASTER MANAGEMENT ROUTES
// ============================================================================

// Client Contracts Routes
router.get('/contracts', async (req, res) => {
  try {
    const { clientId, status, contractType, renewalDue, limit = 50, offset = 0 } = req.query;
    
    const filters = {
      clientId: clientId ? Number(clientId) : undefined,
      status: status as string,
      contractType: contractType as string,
      renewalDue: renewalDue === 'true',
      limit: Number(limit),
      offset: Number(offset)
    };
    
    const result = await storage.getAllClientContracts(filters);
    res.json(result);
  } catch (error) {
    console.error('Error fetching contracts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/contracts/:id', async (req, res) => {
  try {
    const contract = await storage.getClientContract(Number(req.params.id));
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    res.json(contract);
  } catch (error) {
    console.error('Error fetching contract:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/contracts', async (req, res) => {
  try {
    const contract = await storage.createClientContract(req.body);
    res.status(201).json(contract);
  } catch (error) {
    console.error('Error creating contract:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/contracts/:id', async (req, res) => {
  try {
    const contract = await storage.updateClientContract(Number(req.params.id), req.body);
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    res.json(contract);
  } catch (error) {
    console.error('Error updating contract:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/contracts/:id', async (req, res) => {
  try {
    const deleted = await storage.deleteClientContract(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting contract:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/contracts/client/:clientId', async (req, res) => {
  try {
    const contracts = await storage.getContractsByClient(Number(req.params.clientId));
    res.json(contracts);
  } catch (error) {
    console.error('Error fetching client contracts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/contracts/expiring/:days?', async (req, res) => {
  try {
    const days = req.params.days ? Number(req.params.days) : 30;
    const contracts = await storage.getExpiringContracts(days);
    res.json(contracts);
  } catch (error) {
    console.error('Error fetching expiring contracts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Client Communications Routes
router.get('/communications', async (req, res) => {
  try {
    const { clientId, communicationType, purpose, dateFrom, dateTo, limit = 50, offset = 0 } = req.query;
    
    const filters = {
      clientId: clientId ? Number(clientId) : undefined,
      communicationType: communicationType as string,
      purpose: purpose as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      limit: Number(limit),
      offset: Number(offset)
    };
    
    const result = await storage.getAllClientCommunications(filters);
    res.json(result);
  } catch (error) {
    console.error('Error fetching communications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/communications/:id', async (req, res) => {
  try {
    const communication = await storage.getClientCommunication(Number(req.params.id));
    if (!communication) {
      return res.status(404).json({ error: 'Communication not found' });
    }
    res.json(communication);
  } catch (error) {
    console.error('Error fetching communication:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/communications', async (req, res) => {
  try {
    const communication = await storage.createClientCommunication(req.body);
    res.status(201).json(communication);
  } catch (error) {
    console.error('Error creating communication:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/communications/:id', async (req, res) => {
  try {
    const communication = await storage.updateClientCommunication(Number(req.params.id), req.body);
    if (!communication) {
      return res.status(404).json({ error: 'Communication not found' });
    }
    res.json(communication);
  } catch (error) {
    console.error('Error updating communication:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/communications/client/:clientId', async (req, res) => {
  try {
    const communications = await storage.getCommunicationsByClient(Number(req.params.clientId));
    res.json(communications);
  } catch (error) {
    console.error('Error fetching client communications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Client Portfolio Management Routes
router.get('/portfolios', async (req, res) => {
  try {
    const { valueSegment, riskLevel, loyaltyTier, portfolioManager, limit = 50, offset = 0 } = req.query;
    
    const filters = {
      valueSegment: valueSegment as string,
      riskLevel: riskLevel as string,
      loyaltyTier: loyaltyTier as string,
      portfolioManager: portfolioManager ? Number(portfolioManager) : undefined,
      limit: Number(limit),
      offset: Number(offset)
    };
    
    const result = await storage.getAllClientPortfolios(filters);
    res.json(result);
  } catch (error) {
    console.error('Error fetching portfolios:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/portfolios/:id', async (req, res) => {
  try {
    const portfolio = await storage.getClientPortfolio(Number(req.params.id));
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    res.json(portfolio);
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/portfolios/client/:clientId', async (req, res) => {
  try {
    const portfolio = await storage.getClientPortfolioByClient(Number(req.params.clientId));
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    res.json(portfolio);
  } catch (error) {
    console.error('Error fetching client portfolio:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/portfolios', async (req, res) => {
  try {
    const portfolio = await storage.createClientPortfolio(req.body);
    res.status(201).json(portfolio);
  } catch (error) {
    console.error('Error creating portfolio:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/portfolios/:id', async (req, res) => {
  try {
    const portfolio = await storage.updateClientPortfolio(Number(req.params.id), req.body);
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    res.json(portfolio);
  } catch (error) {
    console.error('Error updating portfolio:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Enhanced Business Entity Routes for Client Master
router.get('/clients', async (req, res) => {
  try {
    const { search, clientStatus, entityType, relationshipManager, valueSegment, limit = 50, offset = 0 } = req.query;
    
    const filters = {
      search: search as string,
      clientStatus: clientStatus as string,
      entityType: entityType as string,
      relationshipManager: relationshipManager as string,
      valueSegment: valueSegment as string,
      limit: Number(limit),
      offset: Number(offset)
    };
    
    const result = await storage.getAllBusinessEntitiesWithDetails(filters);
    res.json(result);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/clients/:clientId/profile', async (req, res) => {
  try {
    const profile = await storage.getClientMasterProfile(Number(req.params.clientId));
    res.json(profile);
  } catch (error) {
    console.error('Error fetching client profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Client Master Stats for Dashboard
router.get('/stats', async (req, res) => {
  try {
    // Get all business entities for stats calculation
    const result = await storage.getAllBusinessEntitiesWithDetails({ limit: 1000, offset: 0 });
    const clients = result.clients || result || [];

    const stats = {
      totalClients: clients.length,
      activeClients: clients.filter((c: any) => c.status === 'active').length,
      inactiveClients: clients.filter((c: any) => c.status !== 'active').length,
      // By entity type
      byEntityType: {
        privateLimited: clients.filter((c: any) => c.entityType === 'private_limited').length,
        llp: clients.filter((c: any) => c.entityType === 'llp').length,
        partnership: clients.filter((c: any) => c.entityType === 'partnership').length,
        proprietorship: clients.filter((c: any) => c.entityType === 'proprietorship').length,
        other: clients.filter((c: any) => !['private_limited', 'llp', 'partnership', 'proprietorship'].includes(c.entityType)).length,
      },
      // By value segment
      byValueSegment: {
        enterprise: clients.filter((c: any) => c.valueSegment === 'enterprise').length,
        premium: clients.filter((c: any) => c.valueSegment === 'premium').length,
        standard: clients.filter((c: any) => c.valueSegment === 'standard').length,
        basic: clients.filter((c: any) => c.valueSegment === 'basic' || !c.valueSegment).length,
      },
      // Recent activity
      recentlyOnboarded: clients.filter((c: any) => {
        const created = new Date(c.createdAt || Date.now());
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return created > thirtyDaysAgo;
      }).length,
      // Compliance status
      complianceGreen: clients.filter((c: any) => c.complianceStatus === 'green').length,
      complianceAmber: clients.filter((c: any) => c.complianceStatus === 'amber').length,
      complianceRed: clients.filter((c: any) => c.complianceStatus === 'red').length,
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching client master stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;