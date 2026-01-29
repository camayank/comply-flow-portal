import type { Express, Request, Response } from "express";
import { db } from './db';

// Tax Management for Startups - GST, TDS, ITR
export function registerTaxManagementRoutes(app: Express) {

  // Tax dashboard handler
  const taxDashboardHandler = async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;

      const dashboard = {
        gst: {
          gstin: "29AABCU9603R1ZM",
          status: "Active",
          filingFrequency: "Monthly",
          lastFiled: "GSTR-3B for Aug 2024",
          lastFiledDate: "2024-09-10",
          nextDue: "GSTR-3B for Sep 2024",
          nextDueDate: "2024-10-20",
          pendingReturns: [],
          yearlyLiability: 450000,
        },
        tds: {
          tan: "BLRM12345A",
          status: "Active",
          filingFrequency: "Quarterly",
          lastFiled: "Q1 FY 2024-25",
          lastFiledDate: "2024-07-31",
          nextDue: "Q2 FY 2024-25",
          nextDueDate: "2024-10-31",
          pendingDeductions: 0,
          quarterlyLiability: 125000,
        },
        itr: {
          pan: "AAACI1234Q",
          assessmentYear: "2024-25",
          lastFiled: "ITR-6 for AY 2023-24",
          lastFiledDate: "2023-10-30",
          nextDue: "ITR-6 for AY 2024-25",
          nextDueDate: "2024-10-31",
          status: "On Time",
          refundStatus: "Processed - ₹45,000",
        },
        summary: {
          overdueCompliances: 0,
          upcomingDeadlines: 2,
          totalTaxPaid: 1250000,
          estimatedAnnualLiability: 1800000,
        }
      };

      res.json(dashboard);
    } catch (error) {
      console.error('Get tax dashboard error:', error);
      res.status(500).json({ error: 'Failed to fetch tax dashboard' });
    }
  };

  // GST history handler
  const gstHistoryHandler = async (req: Request, res: Response) => {
    try {
      const history = [
        {
          id: 1,
          period: "September 2024",
          returnType: "GSTR-3B",
          dueDate: "2024-10-20",
          filedDate: null,
          status: "pending",
          taxPayable: 42500,
        },
        {
          id: 2,
          period: "August 2024",
          returnType: "GSTR-3B",
          dueDate: "2024-09-20",
          filedDate: "2024-09-10",
          status: "filed",
          taxPayable: 38750,
          arn: "AB240910123456A",
        },
        {
          id: 3,
          period: "August 2024",
          returnType: "GSTR-1",
          dueDate: "2024-09-11",
          filedDate: "2024-09-08",
          status: "filed",
          totalSales: 1250000,
          arn: "AB240908987654B",
        },
        {
          id: 4,
          period: "July 2024",
          returnType: "GSTR-3B",
          dueDate: "2024-08-20",
          filedDate: "2024-08-15",
          status: "filed",
          taxPayable: 41200,
          arn: "AB240815456789C",
        },
      ];

      res.json(history);
    } catch (error) {
      console.error('Get GST history error:', error);
      res.status(500).json({ error: 'Failed to fetch GST history' });
    }
  };

  // GST calculate handler
  const gstCalculateHandler = async (req: Request, res: Response) => {
    try {
      const { sales, purchases, igst, cgst, sgst } = req.body;

      const outputTax = (sales * (igst + cgst + sgst)) / 100;
      const inputTax = (purchases * (igst + cgst + sgst)) / 100;
      const netLiability = outputTax - inputTax;

      res.json({
        sales,
        purchases,
        outputTax: outputTax.toFixed(2),
        inputTax: inputTax.toFixed(2),
        netLiability: netLiability.toFixed(2),
        breakdown: {
          igst: ((sales - purchases) * igst / 100).toFixed(2),
          cgst: ((sales - purchases) * cgst / 100).toFixed(2),
          sgst: ((sales - purchases) * sgst / 100).toFixed(2),
        }
      });
    } catch (error) {
      console.error('Calculate GST error:', error);
      res.status(500).json({ error: 'Failed to calculate GST' });
    }
  };

  // TDS history handler
  const tdsHistoryHandler = async (req: Request, res: Response) => {
    try {
      const history = [
        {
          id: 1,
          quarter: "Q2 FY 2024-25",
          period: "Jul-Sep 2024",
          dueDate: "2024-10-31",
          filedDate: null,
          status: "pending",
          totalDeduction: 125000,
          form: "Form 24Q",
        },
        {
          id: 2,
          quarter: "Q1 FY 2024-25",
          period: "Apr-Jun 2024",
          dueDate: "2024-07-31",
          filedDate: "2024-07-25",
          status: "filed",
          totalDeduction: 118000,
          form: "Form 24Q",
          token: "TK240725ABCD1234",
        },
        {
          id: 3,
          quarter: "Q4 FY 2023-24",
          period: "Jan-Mar 2024",
          dueDate: "2024-05-31",
          filedDate: "2024-05-20",
          status: "filed",
          totalDeduction: 112000,
          form: "Form 24Q",
          token: "TK240520WXYZ5678",
        },
      ];

      res.json(history);
    } catch (error) {
      console.error('Get TDS history error:', error);
      res.status(500).json({ error: 'Failed to fetch TDS history' });
    }
  };

  // TDS calculate handler
  const tdsCalculateHandler = async (req: Request, res: Response) => {
    try {
      const { amount, section, panAvailable } = req.body;

      const rates: Record<string, { withPan: number; withoutPan: number }> = {
        '194C': { withPan: 1, withoutPan: 20 },
        '194H': { withPan: 5, withoutPan: 20 },
        '194I': { withPan: 10, withoutPan: 20 },
        '194J': { withPan: 10, withoutPan: 20 },
        '192': { withPan: 0, withoutPan: 0 },
      };

      const rate = panAvailable ? rates[section]?.withPan : rates[section]?.withoutPan;
      const tdsAmount = (amount * (rate || 0)) / 100;
      const netPayable = amount - tdsAmount;

      res.json({
        grossAmount: amount,
        section,
        rate,
        tdsAmount: tdsAmount.toFixed(2),
        netPayable: netPayable.toFixed(2),
        panAvailable,
      });
    } catch (error) {
      console.error('Calculate TDS error:', error);
      res.status(500).json({ error: 'Failed to calculate TDS' });
    }
  };

  // ITR status handler
  const itrStatusHandler = async (req: Request, res: Response) => {
    try {
      const status = {
        assessmentYear: "2024-25",
        financialYear: "2023-24",
        itrType: "ITR-6 (Companies)",
        filingStatus: "Not Filed",
        dueDate: "2024-10-31",
        extensionAvailable: true,
        extendedDueDate: "2024-11-30",
        previousYear: {
          assessmentYear: "2023-24",
          status: "Filed & Verified",
          filedDate: "2023-10-15",
          acknowledgment: "123456789012345",
          refund: {
            claimed: 45000,
            status: "Processed",
            receivedDate: "2023-12-20",
          }
        },
        documents: {
          form16: "Available",
          form26AS: "Available",
          auditReport: "Pending",
          financialStatements: "Available",
        }
      };

      res.json(status);
    } catch (error) {
      console.error('Get ITR status error:', error);
      res.status(500).json({ error: 'Failed to fetch ITR status' });
    }
  };

  // Tax calendar handler
  const taxCalendarHandler = async (req: Request, res: Response) => {
    try {
      const calendar = [
        {
          date: "2024-10-11",
          deadline: "GSTR-1 for September 2024",
          type: "GST",
          priority: "high",
        },
        {
          date: "2024-10-20",
          deadline: "GSTR-3B for September 2024",
          type: "GST",
          priority: "high",
        },
        {
          date: "2024-10-31",
          deadline: "TDS Return Q2 FY 2024-25",
          type: "TDS",
          priority: "high",
        },
        {
          date: "2024-10-31",
          deadline: "ITR Filing AY 2024-25",
          type: "ITR",
          priority: "critical",
        },
        {
          date: "2024-11-07",
          deadline: "TDS Payment for October 2024",
          type: "TDS",
          priority: "medium",
        },
      ];

      res.json(calendar);
    } catch (error) {
      console.error('Get tax calendar error:', error);
      res.status(500).json({ error: 'Failed to fetch tax calendar' });
    }
  };

  // Tax insights handler
  const taxInsightsHandler = async (req: Request, res: Response) => {
    try {
      const insights = {
        savingsOpportunities: [
          {
            title: "Section 80C Deduction",
            description: "Invest up to ₹1.5L in ELSS, PPF, or NSC to save taxes",
            potentialSaving: 46800,
            category: "Investment",
          },
          {
            title: "Section 80D - Health Insurance",
            description: "Claim deduction up to ₹25,000 for health insurance premiums",
            potentialSaving: 7800,
            category: "Insurance",
          },
          {
            title: "Business Expenses",
            description: "Ensure all legitimate business expenses are properly accounted",
            potentialSaving: 35000,
            category: "Expenses",
          },
        ],
        complianceAlerts: [
          {
            type: "warning",
            message: "GST return for September 2024 due in 16 days",
            dueDate: "2024-10-20",
          },
          {
            type: "critical",
            message: "ITR filing deadline approaching - 27 days remaining",
            dueDate: "2024-10-31",
          },
        ],
        statistics: {
          onTimeFilingRate: 100,
          avgRefundTime: "45 days",
          taxEfficiencyScore: 78,
          complianceScore: 95,
        }
      };

      res.json(insights);
    } catch (error) {
      console.error('Get tax insights error:', error);
      res.status(500).json({ error: 'Failed to fetch tax insights' });
    }
  };

  // Register routes at both /api and /api/v1 paths for backward compatibility
  app.get('/api/tax/dashboard/:clientId', taxDashboardHandler);
  app.get('/api/v1/tax/dashboard/:clientId', taxDashboardHandler);

  app.get('/api/tax/gst/history/:clientId', gstHistoryHandler);
  app.get('/api/v1/tax/gst/history/:clientId', gstHistoryHandler);

  app.post('/api/tax/gst/calculate', gstCalculateHandler);
  app.post('/api/v1/tax/gst/calculate', gstCalculateHandler);

  app.get('/api/tax/tds/history/:clientId', tdsHistoryHandler);
  app.get('/api/v1/tax/tds/history/:clientId', tdsHistoryHandler);

  app.post('/api/tax/tds/calculate', tdsCalculateHandler);
  app.post('/api/v1/tax/tds/calculate', tdsCalculateHandler);

  app.get('/api/tax/itr/status/:clientId', itrStatusHandler);
  app.get('/api/v1/tax/itr/status/:clientId', itrStatusHandler);

  app.get('/api/tax/calendar', taxCalendarHandler);
  app.get('/api/v1/tax/calendar', taxCalendarHandler);

  app.get('/api/tax/insights/:clientId', taxInsightsHandler);
  app.get('/api/v1/tax/insights/:clientId', taxInsightsHandler);

  console.log('✅ Tax Management routes registered');
}
