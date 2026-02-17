/**
 * Report Generator Routes
 *
 * API endpoints for generating, downloading, and managing reports
 */
import { Router, Response } from 'express';
import {
  sessionAuthMiddleware,
  requireMinimumRole,
  USER_ROLES,
  type AuthenticatedRequest,
} from '../rbac-middleware';
import { reportGeneratorService } from '../services/report-generator-service';

const router = Router();

// Apply authentication to all routes
router.use(sessionAuthMiddleware);

/**
 * GET /reports/types
 * Get available report types
 */
router.get(
  '/types',
  requireMinimumRole(USER_ROLES.OPS_EXECUTIVE),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const types = reportGeneratorService.getAvailableReportTypes();
      res.json({ success: true, data: types });
    } catch (error) {
      console.error('Error getting report types:', error);
      res.status(500).json({ error: 'Failed to get report types' });
    }
  }
);

/**
 * POST /reports/generate
 * Generate a report
 */
router.post(
  '/generate',
  requireMinimumRole(USER_ROLES.OPS_MANAGER),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { type, format = 'json', parameters = {} } = req.body;

      if (!type) {
        res.status(400).json({ error: 'Report type is required' });
        return;
      }

      const validTypes = [
        'service_requests',
        'revenue',
        'compliance',
        'user_activity',
        'operations_summary',
        'government_filings',
        'client_portfolio',
        'audit_trail',
      ];

      if (!validTypes.includes(type)) {
        res.status(400).json({ error: `Invalid report type. Must be one of: ${validTypes.join(', ')}` });
        return;
      }

      const validFormats = ['pdf', 'csv', 'excel', 'json'];
      if (!validFormats.includes(format)) {
        res.status(400).json({ error: `Invalid format. Must be one of: ${validFormats.join(', ')}` });
        return;
      }

      // Parse date range if provided
      const reportParams: any = { ...parameters };
      if (parameters.startDate || parameters.endDate) {
        reportParams.dateRange = {
          start: parameters.startDate ? new Date(parameters.startDate) : undefined,
          end: parameters.endDate ? new Date(parameters.endDate) : undefined,
        };
      }

      const currentUser = req.user!;
      const result = await reportGeneratorService.generateReport(type, reportParams, format, currentUser.id);

      if (!result.success) {
        res.status(500).json({ error: result.error || 'Failed to generate report' });
        return;
      }

      // Return report metadata (not the actual data for large reports)
      res.json({
        success: true,
        data: {
          reportId: result.reportId,
          filename: result.filename,
          format: result.format,
          generatedAt: result.generatedAt,
          metadata: result.metadata,
        },
      });
    } catch (error) {
      console.error('Error generating report:', error);
      res.status(500).json({ error: 'Failed to generate report' });
    }
  }
);

/**
 * POST /reports/download
 * Generate and download a report directly
 */
router.post(
  '/download',
  requireMinimumRole(USER_ROLES.OPS_MANAGER),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { type, format = 'csv', parameters = {} } = req.body;

      if (!type) {
        res.status(400).json({ error: 'Report type is required' });
        return;
      }

      // Parse date range if provided
      const reportParams: any = { ...parameters };
      if (parameters.startDate || parameters.endDate) {
        reportParams.dateRange = {
          start: parameters.startDate ? new Date(parameters.startDate) : undefined,
          end: parameters.endDate ? new Date(parameters.endDate) : undefined,
        };
      }

      const currentUser = req.user!;
      const result = await reportGeneratorService.generateReport(type, reportParams, format, currentUser.id);

      if (!result.success) {
        res.status(500).json({ error: result.error || 'Failed to generate report' });
        return;
      }

      // Set appropriate headers based on format
      switch (format) {
        case 'pdf':
          res.setHeader('Content-Type', 'application/pdf');
          break;
        case 'excel':
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          break;
        case 'csv':
          res.setHeader('Content-Type', 'text/csv');
          break;
        case 'json':
        default:
          res.setHeader('Content-Type', 'application/json');
          break;
      }

      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.data);
    } catch (error) {
      console.error('Error downloading report:', error);
      res.status(500).json({ error: 'Failed to download report' });
    }
  }
);

/**
 * GET /reports/history
 * Get report generation history
 */
router.get(
  '/history',
  requireMinimumRole(USER_ROLES.OPS_MANAGER),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { type, limit = '50' } = req.query;
      const currentUser = req.user!;

      // Admins can see all history, others see only their own
      const options: any = {
        limit: parseInt(limit as string),
      };

      if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
        options.userId = currentUser.id;
      }

      if (type) {
        options.type = type;
      }

      const history = await reportGeneratorService.getReportHistory(options);

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      console.error('Error getting report history:', error);
      res.status(500).json({ error: 'Failed to get report history' });
    }
  }
);

/**
 * POST /reports/service-requests
 * Quick endpoint for service requests report
 */
router.post(
  '/service-requests',
  requireMinimumRole(USER_ROLES.OPS_EXECUTIVE),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { format = 'json', startDate, endDate, status, limit } = req.body;

      const currentUser = req.user!;
      const result = await reportGeneratorService.generateReport(
        'service_requests',
        {
          dateRange: {
            start: startDate ? new Date(startDate) : undefined,
            end: endDate ? new Date(endDate) : undefined,
          },
          status,
          limit,
        },
        format,
        currentUser.id
      );

      if (!result.success) {
        res.status(500).json({ error: result.error });
        return;
      }

      if (format !== 'json') {
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      }

      res.send(result.data);
    } catch (error) {
      console.error('Error generating service requests report:', error);
      res.status(500).json({ error: 'Failed to generate report' });
    }
  }
);

/**
 * POST /reports/revenue
 * Quick endpoint for revenue report
 */
router.post(
  '/revenue',
  requireMinimumRole(USER_ROLES.OPS_MANAGER),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { format = 'json', startDate, endDate, groupBy } = req.body;

      const currentUser = req.user!;
      const result = await reportGeneratorService.generateReport(
        'revenue',
        {
          dateRange: {
            start: startDate ? new Date(startDate) : undefined,
            end: endDate ? new Date(endDate) : undefined,
          },
          groupBy,
        },
        format,
        currentUser.id
      );

      if (!result.success) {
        res.status(500).json({ error: result.error });
        return;
      }

      if (format !== 'json') {
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      }

      res.send(result.data);
    } catch (error) {
      console.error('Error generating revenue report:', error);
      res.status(500).json({ error: 'Failed to generate report' });
    }
  }
);

/**
 * POST /reports/compliance
 * Quick endpoint for compliance report
 */
router.post(
  '/compliance',
  requireMinimumRole(USER_ROLES.OPS_EXECUTIVE),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { format = 'json', startDate, endDate, status } = req.body;

      const currentUser = req.user!;
      const result = await reportGeneratorService.generateReport(
        'compliance',
        {
          dateRange: {
            start: startDate ? new Date(startDate) : undefined,
            end: endDate ? new Date(endDate) : undefined,
          },
          status,
        },
        format,
        currentUser.id
      );

      if (!result.success) {
        res.status(500).json({ error: result.error });
        return;
      }

      if (format !== 'json') {
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      }

      res.send(result.data);
    } catch (error) {
      console.error('Error generating compliance report:', error);
      res.status(500).json({ error: 'Failed to generate report' });
    }
  }
);

export default router;
