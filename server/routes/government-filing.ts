/**
 * Government Filing Routes
 *
 * API endpoints for government portal integrations
 * GST, Income Tax, MCA, TDS, PF, ESI
 */
import { Router, Response } from 'express';
import {
  sessionAuthMiddleware,
  requireMinimumRole,
  USER_ROLES,
  type AuthenticatedRequest,
} from '../rbac-middleware';
import { governmentApiService } from '../services/government-api-service';

const router = Router();

// Apply authentication to all routes
router.use(sessionAuthMiddleware);

// ==========================================
// GST Filing Endpoints
// ==========================================

/**
 * File GSTR-1 (Outward Supplies)
 */
router.post(
  '/gst/gstr1',
  requireMinimumRole(USER_ROLES.OPS_EXECUTIVE),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { clientId, entityId, period, data, credentials } = req.body;

      if (!clientId || !period || !data) {
        res.status(400).json({ error: 'Client ID, period, and data are required' });
        return;
      }

      const result = await governmentApiService.fileGSTR1({
        clientId,
        entityId,
        filingType: 'gstr1',
        period,
        data,
        credentials,
      });

      res.json(result);
    } catch (error) {
      console.error('Error filing GSTR-1:', error);
      res.status(500).json({ error: 'Failed to file GSTR-1' });
    }
  }
);

/**
 * File GSTR-3B (Summary Return)
 */
router.post(
  '/gst/gstr3b',
  requireMinimumRole(USER_ROLES.OPS_EXECUTIVE),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { clientId, entityId, period, data, credentials } = req.body;

      if (!clientId || !period || !data) {
        res.status(400).json({ error: 'Client ID, period, and data are required' });
        return;
      }

      const result = await governmentApiService.fileGSTR3B({
        clientId,
        entityId,
        filingType: 'gstr3b',
        period,
        data,
        credentials,
      });

      res.json(result);
    } catch (error) {
      console.error('Error filing GSTR-3B:', error);
      res.status(500).json({ error: 'Failed to file GSTR-3B' });
    }
  }
);

/**
 * Check GST filing status
 */
router.get(
  '/gst/status/:gstin/:arn',
  requireMinimumRole(USER_ROLES.OPS_EXECUTIVE),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { gstin, arn } = req.params;
      const result = await governmentApiService.checkGSTFilingStatus(gstin, arn);
      res.json(result);
    } catch (error) {
      console.error('Error checking GST status:', error);
      res.status(500).json({ error: 'Failed to check GST filing status' });
    }
  }
);

/**
 * Get GST returns calendar
 */
router.get(
  '/gst/calendar/:gstin',
  requireMinimumRole(USER_ROLES.OPS_EXECUTIVE),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { gstin } = req.params;
      const result = await governmentApiService.getGSTReturnsCalendar(gstin);
      res.json(result);
    } catch (error) {
      console.error('Error getting GST calendar:', error);
      res.status(500).json({ error: 'Failed to get GST returns calendar' });
    }
  }
);

// ==========================================
// Income Tax Filing Endpoints
// ==========================================

/**
 * File ITR (Income Tax Return)
 */
router.post(
  '/itr/file',
  requireMinimumRole(USER_ROLES.OPS_EXECUTIVE),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { clientId, entityId, itrType, assessmentYear, data, credentials } = req.body;

      if (!clientId || !itrType || !assessmentYear || !data) {
        res.status(400).json({ error: 'Client ID, ITR type, assessment year, and data are required' });
        return;
      }

      const result = await governmentApiService.fileITR({
        clientId,
        entityId,
        filingType: itrType,
        period: assessmentYear,
        itrType,
        assessmentYear,
        data,
        credentials,
      });

      res.json(result);
    } catch (error) {
      console.error('Error filing ITR:', error);
      res.status(500).json({ error: 'Failed to file ITR' });
    }
  }
);

/**
 * Get Form 26AS
 */
router.get(
  '/itr/form26as/:pan/:assessmentYear',
  requireMinimumRole(USER_ROLES.OPS_EXECUTIVE),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { pan, assessmentYear } = req.params;
      const result = await governmentApiService.getForm26AS(pan, assessmentYear);
      res.json(result);
    } catch (error) {
      console.error('Error getting Form 26AS:', error);
      res.status(500).json({ error: 'Failed to get Form 26AS' });
    }
  }
);

/**
 * Get AIS (Annual Information Statement)
 */
router.get(
  '/itr/ais/:pan/:financialYear',
  requireMinimumRole(USER_ROLES.OPS_EXECUTIVE),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { pan, financialYear } = req.params;
      const result = await governmentApiService.getAIS(pan, financialYear);
      res.json(result);
    } catch (error) {
      console.error('Error getting AIS:', error);
      res.status(500).json({ error: 'Failed to get AIS' });
    }
  }
);

// ==========================================
// MCA Filing Endpoints
// ==========================================

/**
 * File MCA Form
 */
router.post(
  '/mca/form',
  requireMinimumRole(USER_ROLES.OPS_EXECUTIVE),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { clientId, entityId, formType, financialYear, data, credentials } = req.body;

      if (!clientId || !formType || !data) {
        res.status(400).json({ error: 'Client ID, form type, and data are required' });
        return;
      }

      const result = await governmentApiService.fileMCAForm({
        clientId,
        entityId,
        filingType: formType,
        period: financialYear || '',
        financialYear,
        formType,
        data,
        credentials,
      });

      res.json(result);
    } catch (error) {
      console.error('Error filing MCA form:', error);
      res.status(500).json({ error: 'Failed to file MCA form' });
    }
  }
);

/**
 * Get company master data
 */
router.get(
  '/mca/company/:cin',
  requireMinimumRole(USER_ROLES.OPS_EXECUTIVE),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { cin } = req.params;
      const result = await governmentApiService.getCompanyMasterData(cin);
      res.json(result);
    } catch (error) {
      console.error('Error getting company data:', error);
      res.status(500).json({ error: 'Failed to get company master data' });
    }
  }
);

/**
 * Get director details
 */
router.get(
  '/mca/director/:din',
  requireMinimumRole(USER_ROLES.OPS_EXECUTIVE),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { din } = req.params;
      const result = await governmentApiService.getDirectorDetails(din);
      res.json(result);
    } catch (error) {
      console.error('Error getting director details:', error);
      res.status(500).json({ error: 'Failed to get director details' });
    }
  }
);

/**
 * Check MCA SRN status
 */
router.get(
  '/mca/srn/:srn',
  requireMinimumRole(USER_ROLES.OPS_EXECUTIVE),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { srn } = req.params;
      const result = await governmentApiService.checkMCASRNStatus(srn);
      res.json(result);
    } catch (error) {
      console.error('Error checking SRN status:', error);
      res.status(500).json({ error: 'Failed to check SRN status' });
    }
  }
);

// ==========================================
// TDS Filing Endpoints
// ==========================================

/**
 * File TDS Return
 */
router.post(
  '/tds/return',
  requireMinimumRole(USER_ROLES.OPS_EXECUTIVE),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { clientId, entityId, formType, quarter, financialYear, data, credentials } = req.body;

      if (!clientId || !formType || !quarter || !data) {
        res.status(400).json({ error: 'Client ID, form type, quarter, and data are required' });
        return;
      }

      const result = await governmentApiService.fileTDSReturn({
        clientId,
        entityId,
        filingType: formType,
        period: `${financialYear}-Q${quarter}`,
        financialYear,
        formType,
        quarter,
        data,
        credentials,
      });

      res.json(result);
    } catch (error) {
      console.error('Error filing TDS return:', error);
      res.status(500).json({ error: 'Failed to file TDS return' });
    }
  }
);

/**
 * Download Form 16/16A
 */
router.get(
  '/tds/form16/:tan/:pan/:financialYear',
  requireMinimumRole(USER_ROLES.OPS_EXECUTIVE),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tan, pan, financialYear } = req.params;
      const result = await governmentApiService.downloadForm16(tan, pan, financialYear);
      res.json(result);
    } catch (error) {
      console.error('Error downloading Form 16:', error);
      res.status(500).json({ error: 'Failed to download Form 16' });
    }
  }
);

// ==========================================
// PF & ESI Filing Endpoints
// ==========================================

/**
 * File PF Return
 */
router.post(
  '/pf/return',
  requireMinimumRole(USER_ROLES.OPS_EXECUTIVE),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { clientId, entityId, period, data, credentials } = req.body;

      if (!clientId || !period || !data) {
        res.status(400).json({ error: 'Client ID, period, and data are required' });
        return;
      }

      const result = await governmentApiService.filePFReturn({
        clientId,
        entityId,
        filingType: 'pf_ecr',
        period,
        data,
        credentials,
      });

      res.json(result);
    } catch (error) {
      console.error('Error filing PF return:', error);
      res.status(500).json({ error: 'Failed to file PF return' });
    }
  }
);

/**
 * File ESI Return
 */
router.post(
  '/esi/return',
  requireMinimumRole(USER_ROLES.OPS_EXECUTIVE),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { clientId, entityId, period, data, credentials } = req.body;

      if (!clientId || !period || !data) {
        res.status(400).json({ error: 'Client ID, period, and data are required' });
        return;
      }

      const result = await governmentApiService.fileESIReturn({
        clientId,
        entityId,
        filingType: 'esi_contribution',
        period,
        data,
        credentials,
      });

      res.json(result);
    } catch (error) {
      console.error('Error filing ESI return:', error);
      res.status(500).json({ error: 'Failed to file ESI return' });
    }
  }
);

// ==========================================
// Filing History & Tracking
// ==========================================

/**
 * Get filing history
 */
router.get(
  '/history/:clientId',
  requireMinimumRole(USER_ROLES.OPS_EXECUTIVE),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { clientId } = req.params;
      const { entityId, portalType, filingType, status, limit } = req.query;

      const history = await governmentApiService.getFilingHistory(parseInt(clientId), {
        entityId: entityId ? parseInt(entityId as string) : undefined,
        portalType: portalType as string,
        filingType: filingType as string,
        status: status as string,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json({ success: true, data: history });
    } catch (error) {
      console.error('Error getting filing history:', error);
      res.status(500).json({ error: 'Failed to get filing history' });
    }
  }
);

/**
 * Get pending filings
 */
router.get(
  '/pending',
  requireMinimumRole(USER_ROLES.OPS_EXECUTIVE),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { clientId } = req.query;
      const filings = await governmentApiService.getPendingFilings(
        clientId ? parseInt(clientId as string) : undefined
      );
      res.json({ success: true, data: filings });
    } catch (error) {
      console.error('Error getting pending filings:', error);
      res.status(500).json({ error: 'Failed to get pending filings' });
    }
  }
);

/**
 * Get upcoming deadlines
 */
router.get(
  '/deadlines',
  requireMinimumRole(USER_ROLES.OPS_EXECUTIVE),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { days = '30', clientId } = req.query;
      const deadlines = await governmentApiService.getUpcomingDeadlines(
        parseInt(days as string),
        clientId ? parseInt(clientId as string) : undefined
      );
      res.json({ success: true, data: deadlines });
    } catch (error) {
      console.error('Error getting deadlines:', error);
      res.status(500).json({ error: 'Failed to get upcoming deadlines' });
    }
  }
);

export default router;
