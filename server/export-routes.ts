import { Request, Response, Express } from 'express';
import { storage } from './storage';
import { 
  sendCSVResponse, 
  sendExcelResponse, 
  sendMultiSheetExcel, 
  prepareDataForExport 
} from './export-utils';

export function registerExportRoutes(app: Express) {
  console.log('📤 Registering Export routes...');

  // Export leads
  app.get('/api/export/leads', async (req: Request, res: Response) => {
    try {
      const { format = 'csv' } = req.query;
      const { leads } = await storage.getAllLeads({});
      const exportData = prepareDataForExport(leads);

      if (format === 'excel' || format === 'xlsx') {
        sendExcelResponse(res, exportData, 'leads-export', 'Leads');
      } else {
        sendCSVResponse(res, exportData, 'leads-export');
      }
    } catch (error) {
      console.error('Error exporting leads:', error);
      res.status(500).json({ error: 'Failed to export leads' });
    }
  });

  // Export proposals
  app.get('/api/export/proposals', async (req: Request, res: Response) => {
    try {
      const { format = 'csv' } = req.query;
      const { proposals } = await storage.getAllProposals({});
      const exportData = prepareDataForExport(proposals);

      if (format === 'excel' || format === 'xlsx') {
        sendExcelResponse(res, exportData, 'proposals-export', 'Proposals');
      } else {
        sendCSVResponse(res, exportData, 'proposals-export');
      }
    } catch (error) {
      console.error('Error exporting proposals:', error);
      res.status(500).json({ error: 'Failed to export proposals' });
    }
  });

  // Export service requests
  app.get('/api/export/service-requests', async (req: Request, res: Response) => {
    try {
      const { format = 'csv', userId } = req.query;
      const serviceRequests = userId 
        ? await storage.getServiceRequestsByUser(parseInt(userId as string))
        : (await storage.getAllServiceRequests({})).requests;
      const exportData = prepareDataForExport(serviceRequests);

      if (format === 'excel' || format === 'xlsx') {
        sendExcelResponse(res, exportData, 'service-requests-export', 'Service Requests');
      } else {
        sendCSVResponse(res, exportData, 'service-requests-export');
      }
    } catch (error) {
      console.error('Error exporting service requests:', error);
      res.status(500).json({ error: 'Failed to export service requests' });
    }
  });

  // Export business entities
  app.get('/api/export/business-entities', async (req: Request, res: Response) => {
    try {
      const { format = 'csv', userId } = req.query;
      const { entities } = await storage.getAllBusinessEntities({});
      const exportData = prepareDataForExport(entities);

      if (format === 'excel' || format === 'xlsx') {
        sendExcelResponse(res, exportData, 'business-entities-export', 'Business Entities');
      } else {
        sendCSVResponse(res, exportData, 'business-entities-export');
      }
    } catch (error) {
      console.error('Error exporting business entities:', error);
      res.status(500).json({ error: 'Failed to export business entities' });
    }
  });

  // Export payments
  app.get('/api/export/payments', async (req: Request, res: Response) => {
    try {
      const { format = 'csv', status } = req.query;
      const { payments: allPayments } = await storage.getAllPayments({});
      const payments = status 
        ? allPayments.filter((p: any) => p.status === status)
        : allPayments;
      const exportData = prepareDataForExport(payments);

      if (format === 'excel' || format === 'xlsx') {
        sendExcelResponse(res, exportData, 'payments-export', 'Payments');
      } else {
        sendCSVResponse(res, exportData, 'payments-export');
      }
    } catch (error) {
      console.error('Error exporting payments:', error);
      res.status(500).json({ error: 'Failed to export payments' });
    }
  });

  // Export clients (users with client role)
  app.get('/api/export/clients', async (req: Request, res: Response) => {
    try {
      const { format = 'csv' } = req.query;
      const { entities } = await storage.getAllBusinessEntities({});
      
      const exportData = entities.map((client: any) => ({
        id: client.id,
        name: client.name,
        entityType: client.entityType,
        clientId: client.clientId,
        email: client.email || '',
        phone: client.phone || '',
        status: client.clientStatus,
        createdAt: client.createdAt
      }));

      if (format === 'excel' || format === 'xlsx') {
        sendExcelResponse(res, exportData, 'clients-export', 'Clients');
      } else {
        sendCSVResponse(res, exportData, 'clients-export');
      }
    } catch (error) {
      console.error('Error exporting clients:', error);
      res.status(500).json({ error: 'Failed to export clients' });
    }
  });

  // Export services catalog
  app.get('/api/export/services', async (req: Request, res: Response) => {
    try {
      const { format = 'csv' } = req.query;
      const services = await storage.getAllServices();
      const exportData = prepareDataForExport(services);

      if (format === 'excel' || format === 'xlsx') {
        sendExcelResponse(res, exportData, 'services-catalog-export', 'Services');
      } else {
        sendCSVResponse(res, exportData, 'services-catalog-export');
      }
    } catch (error) {
      console.error('Error exporting services:', error);
      res.status(500).json({ error: 'Failed to export services' });
    }
  });

  // Export agents
  app.get('/api/export/agents', async (req: Request, res: Response) => {
    try {
      const { format = 'csv' } = req.query;
      const agents: any[] = [];
      const exportData = prepareDataForExport(agents);

      if (format === 'excel' || format === 'xlsx') {
        sendExcelResponse(res, exportData, 'agents-export', 'Agents');
      } else {
        sendCSVResponse(res, exportData, 'agents-export');
      }
    } catch (error) {
      console.error('Error exporting agents:', error);
      res.status(500).json({ error: 'Failed to export agents' });
    }
  });

  // Export comprehensive report (multiple sheets)
  app.get('/api/export/comprehensive-report', async (req: Request, res: Response) => {
    try {
      const [leadsResult, proposalsResult, serviceRequestsResult, entitiesResult, paymentsResult, services] = await Promise.all([
        storage.getAllLeads({}),
        storage.getAllProposals({}),
        storage.getAllServiceRequests({}),
        storage.getAllBusinessEntities({}),
        storage.getAllPayments({}),
        storage.getAllServices()
      ]);
      
      const leads = leadsResult.leads;
      const proposals = proposalsResult.proposals;
      const serviceRequests = serviceRequestsResult.requests;
      const entities = entitiesResult.entities;
      const payments = paymentsResult.payments;
      const agents: any[] = [];

      const sheets = [
        { name: 'Leads', data: prepareDataForExport(leads) },
        { name: 'Proposals', data: prepareDataForExport(proposals) },
        { name: 'Service Requests', data: prepareDataForExport(serviceRequests) },
        { name: 'Business Entities', data: prepareDataForExport(entities) },
        { name: 'Payments', data: prepareDataForExport(payments) },
        { name: 'Services', data: prepareDataForExport(services) },
        { name: 'Agents', data: prepareDataForExport(agents) }
      ];

      sendMultiSheetExcel(res, sheets, 'comprehensive-report');
    } catch (error) {
      console.error('Error generating comprehensive report:', error);
      res.status(500).json({ error: 'Failed to generate comprehensive report' });
    }
  });

  // Export filtered data with date range
  app.post('/api/export/filtered-data', async (req: Request, res: Response) => {
    try {
      const { 
        entityType, 
        format = 'csv', 
        dateFrom, 
        dateTo,
        filters = {} 
      } = req.body;

      let data: any[] = [];
      let filename = 'export';

      switch (entityType) {
        case 'leads':
          data = (await storage.getAllLeads({})).leads;
          filename = 'leads-export';
          break;
        case 'proposals':
          data = (await storage.getAllProposals({})).proposals;
          filename = 'proposals-export';
          break;
        case 'service-requests':
          data = (await storage.getAllServiceRequests({})).requests;
          filename = 'service-requests-export';
          break;
        case 'payments':
          data = (await storage.getAllPayments({})).payments;
          filename = 'payments-export';
          break;
        case 'business-entities':
          data = (await storage.getAllBusinessEntities({})).entities;
          filename = 'business-entities-export';
          break;
        default:
          return res.status(400).json({ error: 'Invalid entity type' });
      }

      if (dateFrom || dateTo) {
        const fromDate = dateFrom ? new Date(dateFrom) : new Date(0);
        const toDate = dateTo ? new Date(dateTo) : new Date();
        
        data = data.filter(item => {
          const itemDate = new Date(item.createdAt || item.created_at);
          return itemDate >= fromDate && itemDate <= toDate;
        });
      }

      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          data = data.filter(item => item[key] === filters[key]);
        }
      });

      const exportData = prepareDataForExport(data);

      if (format === 'excel' || format === 'xlsx') {
        sendExcelResponse(res, exportData, filename, entityType);
      } else {
        sendCSVResponse(res, exportData, filename);
      }
    } catch (error) {
      console.error('Error exporting filtered data:', error);
      res.status(500).json({ error: 'Failed to export filtered data' });
    }
  });

  console.log('✅ Export routes registered');
}
