/**
 * Audit Log Routes
 *
 * Endpoints for querying, exporting, and managing audit logs
 */
import { Router, Response } from 'express';
import {
  sessionAuthMiddleware,
  requireMinimumRole,
  USER_ROLES,
  type AuthenticatedRequest,
} from '../rbac-middleware';
import { auditExportService } from '../services/audit-export-service';

const router = Router();

// Apply authentication to all routes
router.use(sessionAuthMiddleware);

// Query audit logs
router.get(
  '/logs',
  requireMinimumRole(USER_ROLES.OPS_MANAGER),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        userId,
        action,
        entityType,
        entityId,
        startDate,
        endDate,
        ipAddress,
        search,
        limit = '100',
        offset = '0',
        sortOrder = 'desc',
      } = req.query;

      const filters: any = {};
      if (userId) filters.userId = parseInt(userId as string);
      if (action) filters.action = action;
      if (entityType) filters.entityType = entityType;
      if (entityId) filters.entityId = entityId;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (ipAddress) filters.ipAddress = ipAddress;
      if (search) filters.search = search;

      const result = await auditExportService.queryAuditLogs(filters, {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        sortOrder: sortOrder as 'asc' | 'desc',
      });

      res.json(result);
    } catch (error) {
      console.error('Error querying audit logs:', error);
      res.status(500).json({ error: 'Failed to query audit logs' });
    }
  }
);

// Get audit summary
router.get(
  '/summary',
  requireMinimumRole(USER_ROLES.OPS_MANAGER),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { dateRange = '30' } = req.query;
      const summary = await auditExportService.getAuditSummary(parseInt(dateRange as string));
      res.json(summary);
    } catch (error) {
      console.error('Error getting audit summary:', error);
      res.status(500).json({ error: 'Failed to get audit summary' });
    }
  }
);

// Export audit logs
router.get(
  '/export',
  requireMinimumRole(USER_ROLES.ADMIN),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        format = 'csv',
        userId,
        action,
        entityType,
        startDate,
        endDate,
        includeDetails = 'false',
        limit = '10000',
      } = req.query;

      const filters: any = {};
      if (userId) filters.userId = parseInt(userId as string);
      if (action) filters.action = action;
      if (entityType) filters.entityType = entityType;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);

      const data = await auditExportService.exportAuditLogs({
        format: format as 'json' | 'csv',
        filters,
        includeDetails: includeDetails === 'true',
        limit: parseInt(limit as string),
      });

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.json`);
      }

      res.send(data);
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      res.status(500).json({ error: 'Failed to export audit logs' });
    }
  }
);

// Get logs by category
router.get(
  '/category/:category',
  requireMinimumRole(USER_ROLES.OPS_MANAGER),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { category } = req.params;
      const { dateRange = '30' } = req.query;

      const validCategories = ['authentication', 'data_access', 'data_modification', 'system', 'security'];
      if (!validCategories.includes(category)) {
        res.status(400).json({ error: 'Invalid category' });
        return;
      }

      const logs = await auditExportService.getLogsByCategory(
        category as any,
        parseInt(dateRange as string)
      );
      res.json(logs);
    } catch (error) {
      console.error('Error getting logs by category:', error);
      res.status(500).json({ error: 'Failed to get logs by category' });
    }
  }
);

// Get user activity timeline
router.get(
  '/user/:userId/timeline',
  requireMinimumRole(USER_ROLES.OPS_MANAGER),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const { dateRange = '30' } = req.query;

      const timeline = await auditExportService.getUserActivityTimeline(
        parseInt(userId),
        parseInt(dateRange as string)
      );
      res.json(timeline);
    } catch (error) {
      console.error('Error getting user activity timeline:', error);
      res.status(500).json({ error: 'Failed to get user activity timeline' });
    }
  }
);

// Generate compliance report
router.get(
  '/compliance-report/:reportType',
  requireMinimumRole(USER_ROLES.ADMIN),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { reportType } = req.params;
      const { dateRange = '90', format = 'json' } = req.query;

      const validTypes = ['data_access', 'security', 'changes', 'full'];
      if (!validTypes.includes(reportType)) {
        res.status(400).json({ error: 'Invalid report type' });
        return;
      }

      const report = await auditExportService.generateComplianceReport(
        reportType as any,
        parseInt(dateRange as string)
      );

      if (format === 'csv') {
        // Convert to CSV
        const headers = ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID', 'IP Address'];
        const rows = report.details.map((d: any) =>
          [
            d.timestamp,
            `"${d.user}"`,
            d.action,
            d.entityType,
            d.entityId || '',
            d.ipAddress || '',
          ].join(',')
        );

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename=compliance-report-${reportType}-${Date.now()}.csv`
        );
        res.send([headers.join(','), ...rows].join('\n'));
      } else {
        res.json(report);
      }
    } catch (error) {
      console.error('Error generating compliance report:', error);
      res.status(500).json({ error: 'Failed to generate compliance report' });
    }
  }
);

// Get entity change history
router.get(
  '/entity/:entityType/:entityId/history',
  requireMinimumRole(USER_ROLES.OPS_EXECUTIVE),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { entityType, entityId } = req.params;

      const history = await auditExportService.getEntityHistory(entityType, entityId);
      res.json(history);
    } catch (error) {
      console.error('Error getting entity history:', error);
      res.status(500).json({ error: 'Failed to get entity history' });
    }
  }
);

// Create audit log entry (internal use)
router.post(
  '/log',
  requireMinimumRole(USER_ROLES.CUSTOMER_SERVICE),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { action, entityType, entityId, oldValue, newValue } = req.body;
      const currentUser = req.user!;

      const logId = await auditExportService.createAuditLog({
        userId: currentUser.id,
        action,
        entityType,
        entityId,
        oldValue,
        newValue,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        sessionId: req.sessionID,
      });

      res.json({ success: true, logId });
    } catch (error) {
      console.error('Error creating audit log:', error);
      res.status(500).json({ error: 'Failed to create audit log' });
    }
  }
);

export default router;
