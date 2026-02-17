/**
 * Report Generator Service
 *
 * Comprehensive report generation with scheduling, PDF output,
 * email delivery, and report history tracking
 */
import { db } from '../db';
import { eq, and, desc, sql, gte, lte, count } from 'drizzle-orm';
import {
  serviceRequests,
  users,
  payments,
  complianceTracking,
  businessEntities,
  auditLogs,
  governmentFilings,
} from '@shared/schema';
import { convertToCSV, convertToExcel, flattenObject } from '../export-utils';
import { logger } from '../logger';
import PDFDocument from 'pdfkit';

// Types
interface ReportDefinition {
  id: string;
  name: string;
  type: ReportType;
  description: string;
  parameters?: ReportParameters;
  schedule?: ScheduleConfig;
  recipients?: string[];
  format: ReportFormat[];
  createdBy: number;
  isActive: boolean;
}

interface ReportParameters {
  dateRange?: { start?: Date; end?: Date };
  status?: string;
  clientId?: number;
  entityId?: number;
  limit?: number;
  groupBy?: 'day' | 'week' | 'month';
  customFilters?: Record<string, any>;
}

interface ScheduleConfig {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  time: string; // HH:MM
  timezone: string;
}

type ReportType =
  | 'service_requests'
  | 'revenue'
  | 'compliance'
  | 'user_activity'
  | 'operations_summary'
  | 'government_filings'
  | 'client_portfolio'
  | 'audit_trail'
  | 'custom';

type ReportFormat = 'pdf' | 'csv' | 'excel' | 'json';

interface ReportResult {
  success: boolean;
  reportId: string;
  format: ReportFormat;
  data?: Buffer | string;
  filename: string;
  generatedAt: Date;
  metadata: {
    recordCount: number;
    parameters: ReportParameters;
    generationTime: number;
  };
  error?: string;
}

interface ReportHistory {
  id: string;
  reportDefinitionId: string;
  reportType: ReportType;
  generatedAt: Date;
  generatedBy: number;
  format: ReportFormat;
  parameters: ReportParameters;
  status: 'success' | 'failed' | 'pending';
  fileSize?: number;
  recordCount?: number;
  downloadUrl?: string;
  error?: string;
}

// Report templates for consistent formatting
const REPORT_TEMPLATES: Record<ReportType, { title: string; sections: string[] }> = {
  service_requests: {
    title: 'Service Requests Report',
    sections: ['Summary', 'Status Distribution', 'By Service Type', 'Details'],
  },
  revenue: {
    title: 'Revenue Report',
    sections: ['Summary', 'Trend Analysis', 'Payment Methods', 'Outstanding'],
  },
  compliance: {
    title: 'Compliance Status Report',
    sections: ['Overview', 'Risk Assessment', 'Upcoming Deadlines', 'Overdue Items'],
  },
  user_activity: {
    title: 'User Activity Report',
    sections: ['Summary', 'Active Users', 'Session Analysis', 'Role Distribution'],
  },
  operations_summary: {
    title: 'Operations Summary Report',
    sections: ['Workload', 'SLA Compliance', 'Team Performance', 'Escalations'],
  },
  government_filings: {
    title: 'Government Filings Report',
    sections: ['Filing Status', 'By Portal', 'Upcoming Deadlines', 'Historical'],
  },
  client_portfolio: {
    title: 'Client Portfolio Report',
    sections: ['Client Summary', 'Service Usage', 'Revenue by Client', 'Compliance Status'],
  },
  audit_trail: {
    title: 'Audit Trail Report',
    sections: ['Activity Summary', 'By User', 'By Entity', 'Security Events'],
  },
  custom: {
    title: 'Custom Report',
    sections: ['Data'],
  },
};

class ReportGeneratorService {
  private reportDefinitions: Map<string, ReportDefinition> = new Map();
  private reportHistory: ReportHistory[] = [];

  /**
   * Generate a report
   */
  async generateReport(
    type: ReportType,
    parameters: ReportParameters,
    format: ReportFormat,
    generatedBy: number
  ): Promise<ReportResult> {
    const startTime = Date.now();
    const reportId = `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Fetch report data
      const data = await this.fetchReportData(type, parameters);

      // Generate output in requested format
      let output: Buffer | string;
      let filename: string;

      const template = REPORT_TEMPLATES[type];
      const timestamp = new Date().toISOString().split('T')[0];

      switch (format) {
        case 'pdf':
          output = await this.generatePDF(type, data, parameters, template);
          filename = `${template.title.replace(/\s+/g, '-').toLowerCase()}-${timestamp}.pdf`;
          break;
        case 'excel':
          output = await this.generateExcel(type, data, template);
          filename = `${template.title.replace(/\s+/g, '-').toLowerCase()}-${timestamp}.xlsx`;
          break;
        case 'csv':
          output = this.generateCSV(data);
          filename = `${template.title.replace(/\s+/g, '-').toLowerCase()}-${timestamp}.csv`;
          break;
        case 'json':
        default:
          output = JSON.stringify({ type, generatedAt: new Date(), parameters, data }, null, 2);
          filename = `${template.title.replace(/\s+/g, '-').toLowerCase()}-${timestamp}.json`;
          break;
      }

      const result: ReportResult = {
        success: true,
        reportId,
        format,
        data: output,
        filename,
        generatedAt: new Date(),
        metadata: {
          recordCount: Array.isArray(data.records) ? data.records.length : 0,
          parameters,
          generationTime: Date.now() - startTime,
        },
      };

      // Log report generation
      await this.logReportGeneration(reportId, type, format, parameters, generatedBy, 'success', result.metadata);

      return result;
    } catch (error: any) {
      logger.error('Report generation error:', error);

      await this.logReportGeneration(reportId, type, format, parameters, generatedBy, 'failed', undefined, error.message);

      return {
        success: false,
        reportId,
        format,
        filename: '',
        generatedAt: new Date(),
        metadata: {
          recordCount: 0,
          parameters,
          generationTime: Date.now() - startTime,
        },
        error: error.message,
      };
    }
  }

  /**
   * Fetch report data based on type
   */
  private async fetchReportData(type: ReportType, params: ReportParameters): Promise<any> {
    const conditions: any[] = [];

    switch (type) {
      case 'service_requests':
        return this.fetchServiceRequestsData(params);
      case 'revenue':
        return this.fetchRevenueData(params);
      case 'compliance':
        return this.fetchComplianceData(params);
      case 'user_activity':
        return this.fetchUserActivityData(params);
      case 'operations_summary':
        return this.fetchOperationsSummaryData(params);
      case 'government_filings':
        return this.fetchGovernmentFilingsData(params);
      case 'client_portfolio':
        return this.fetchClientPortfolioData(params);
      case 'audit_trail':
        return this.fetchAuditTrailData(params);
      default:
        return { records: [], summary: {} };
    }
  }

  /**
   * Fetch service requests report data
   */
  private async fetchServiceRequestsData(params: ReportParameters): Promise<any> {
    const conditions: any[] = [];

    if (params.dateRange?.start) {
      conditions.push(gte(serviceRequests.createdAt, params.dateRange.start));
    }
    if (params.dateRange?.end) {
      conditions.push(lte(serviceRequests.createdAt, params.dateRange.end));
    }
    if (params.status) {
      conditions.push(eq(serviceRequests.status, params.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const records = await db
      .select({
        id: serviceRequests.id,
        requestId: serviceRequests.requestId,
        serviceId: serviceRequests.serviceId,
        status: serviceRequests.status,
        priority: serviceRequests.priority,
        totalAmount: serviceRequests.totalAmount,
        createdAt: serviceRequests.createdAt,
        businessEntity: businessEntities.name,
      })
      .from(serviceRequests)
      .leftJoin(businessEntities, eq(serviceRequests.businessEntityId, businessEntities.id))
      .where(whereClause)
      .orderBy(desc(serviceRequests.createdAt))
      .limit(params.limit || 1000);

    const [summary] = await db
      .select({
        total: sql<number>`COUNT(*)::int`,
        totalAmount: sql<number>`COALESCE(SUM(${serviceRequests.totalAmount}), 0)::int`,
        completed: sql<number>`COUNT(CASE WHEN ${serviceRequests.status} = 'completed' THEN 1 END)::int`,
        pending: sql<number>`COUNT(CASE WHEN ${serviceRequests.status} IN ('initiated', 'docs_uploaded') THEN 1 END)::int`,
        inProgress: sql<number>`COUNT(CASE WHEN ${serviceRequests.status} = 'in_progress' THEN 1 END)::int`,
      })
      .from(serviceRequests)
      .where(whereClause);

    const statusDistribution = await db
      .select({
        status: serviceRequests.status,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(serviceRequests)
      .where(whereClause)
      .groupBy(serviceRequests.status);

    return { records, summary, statusDistribution };
  }

  /**
   * Fetch revenue report data
   */
  private async fetchRevenueData(params: ReportParameters): Promise<any> {
    const conditions: any[] = [];

    if (params.dateRange?.start) {
      conditions.push(gte(payments.createdAt, params.dateRange.start));
    }
    if (params.dateRange?.end) {
      conditions.push(lte(payments.createdAt, params.dateRange.end));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const records = await db
      .select({
        id: payments.id,
        paymentId: payments.paymentId,
        amount: payments.amount,
        status: payments.status,
        paymentMethod: payments.paymentMethod,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .where(whereClause)
      .orderBy(desc(payments.createdAt))
      .limit(params.limit || 1000);

    const [summary] = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'completed' THEN ${payments.amount} ELSE 0 END), 0)::int`,
        totalTransactions: sql<number>`COUNT(*)::int`,
        completedPayments: sql<number>`COUNT(CASE WHEN ${payments.status} = 'completed' THEN 1 END)::int`,
        pendingPayments: sql<number>`COUNT(CASE WHEN ${payments.status} = 'pending' THEN 1 END)::int`,
        pendingAmount: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'pending' THEN ${payments.amount} ELSE 0 END), 0)::int`,
      })
      .from(payments)
      .where(whereClause);

    return { records, summary };
  }

  /**
   * Fetch compliance report data
   */
  private async fetchComplianceData(params: ReportParameters): Promise<any> {
    const conditions: any[] = [];

    if (params.dateRange?.start) {
      conditions.push(gte(complianceTracking.dueDate, params.dateRange.start));
    }
    if (params.dateRange?.end) {
      conditions.push(lte(complianceTracking.dueDate, params.dateRange.end));
    }
    if (params.status) {
      conditions.push(eq(complianceTracking.status, params.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const records = await db
      .select()
      .from(complianceTracking)
      .where(whereClause)
      .orderBy(complianceTracking.dueDate)
      .limit(params.limit || 1000);

    const [summary] = await db
      .select({
        total: sql<number>`COUNT(*)::int`,
        completed: sql<number>`COUNT(CASE WHEN ${complianceTracking.status} = 'completed' THEN 1 END)::int`,
        overdue: sql<number>`COUNT(CASE WHEN ${complianceTracking.status} = 'overdue' THEN 1 END)::int`,
        pending: sql<number>`COUNT(CASE WHEN ${complianceTracking.status} = 'pending' THEN 1 END)::int`,
        avgHealthScore: sql<number>`COALESCE(AVG(${complianceTracking.healthScore}), 0)::int`,
      })
      .from(complianceTracking)
      .where(whereClause);

    return { records, summary };
  }

  /**
   * Fetch user activity report data
   */
  private async fetchUserActivityData(params: ReportParameters): Promise<any> {
    const records = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.lastLogin))
      .limit(params.limit || 500);

    const [summary] = await db
      .select({
        totalUsers: sql<number>`COUNT(*)::int`,
        activeUsers: sql<number>`COUNT(CASE WHEN ${users.isActive} = true THEN 1 END)::int`,
        loggedInToday: sql<number>`COUNT(CASE WHEN ${users.lastLogin} >= CURRENT_DATE THEN 1 END)::int`,
        loggedInThisWeek: sql<number>`COUNT(CASE WHEN ${users.lastLogin} >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END)::int`,
      })
      .from(users);

    const roleDistribution = await db
      .select({
        role: users.role,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(users)
      .groupBy(users.role);

    return { records, summary, roleDistribution };
  }

  /**
   * Fetch operations summary data
   */
  private async fetchOperationsSummaryData(params: ReportParameters): Promise<any> {
    const conditions: any[] = [];

    if (params.dateRange?.start) {
      conditions.push(gte(serviceRequests.createdAt, params.dateRange.start));
    }
    if (params.dateRange?.end) {
      conditions.push(lte(serviceRequests.createdAt, params.dateRange.end));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [workload] = await db
      .select({
        totalRequests: sql<number>`COUNT(*)::int`,
        completedOnTime: sql<number>`COUNT(CASE WHEN ${serviceRequests.status} = 'completed' AND ${serviceRequests.completedAt} <= ${serviceRequests.dueDate} THEN 1 END)::int`,
        inProgress: sql<number>`COUNT(CASE WHEN ${serviceRequests.status} = 'in_progress' THEN 1 END)::int`,
        escalated: sql<number>`COUNT(CASE WHEN ${serviceRequests.priority} = 'urgent' THEN 1 END)::int`,
      })
      .from(serviceRequests)
      .where(whereClause);

    return { records: [], summary: workload };
  }

  /**
   * Fetch government filings data
   */
  private async fetchGovernmentFilingsData(params: ReportParameters): Promise<any> {
    const conditions: any[] = [];

    if (params.dateRange?.start) {
      conditions.push(gte(governmentFilings.createdAt, params.dateRange.start));
    }
    if (params.dateRange?.end) {
      conditions.push(lte(governmentFilings.createdAt, params.dateRange.end));
    }
    if (params.clientId) {
      conditions.push(eq(governmentFilings.clientId, params.clientId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const records = await db
      .select()
      .from(governmentFilings)
      .where(whereClause)
      .orderBy(desc(governmentFilings.createdAt))
      .limit(params.limit || 500);

    const [summary] = await db
      .select({
        total: sql<number>`COUNT(*)::int`,
        submitted: sql<number>`COUNT(CASE WHEN ${governmentFilings.status} = 'submitted' THEN 1 END)::int`,
        acknowledged: sql<number>`COUNT(CASE WHEN ${governmentFilings.status} = 'acknowledged' THEN 1 END)::int`,
        pending: sql<number>`COUNT(CASE WHEN ${governmentFilings.status} = 'pending' THEN 1 END)::int`,
      })
      .from(governmentFilings)
      .where(whereClause);

    const portalDistribution = await db
      .select({
        portalType: governmentFilings.portalType,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(governmentFilings)
      .where(whereClause)
      .groupBy(governmentFilings.portalType);

    return { records, summary, portalDistribution };
  }

  /**
   * Fetch client portfolio data
   */
  private async fetchClientPortfolioData(params: ReportParameters): Promise<any> {
    const records = await db
      .select({
        id: businessEntities.id,
        name: businessEntities.name,
        entityType: businessEntities.entityType,
        pan: businessEntities.pan,
        gstin: businessEntities.gstin,
        cin: businessEntities.cin,
        createdAt: businessEntities.createdAt,
      })
      .from(businessEntities)
      .limit(params.limit || 500);

    const [summary] = await db
      .select({
        totalEntities: sql<number>`COUNT(*)::int`,
      })
      .from(businessEntities);

    return { records, summary };
  }

  /**
   * Fetch audit trail data
   */
  private async fetchAuditTrailData(params: ReportParameters): Promise<any> {
    const conditions: any[] = [];

    if (params.dateRange?.start) {
      conditions.push(gte(auditLogs.timestamp, params.dateRange.start));
    }
    if (params.dateRange?.end) {
      conditions.push(lte(auditLogs.timestamp, params.dateRange.end));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const records = await db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.timestamp))
      .limit(params.limit || 1000);

    const [summary] = await db
      .select({
        totalActions: sql<number>`COUNT(*)::int`,
        uniqueUsers: sql<number>`COUNT(DISTINCT ${auditLogs.userId})::int`,
      })
      .from(auditLogs)
      .where(whereClause);

    const actionDistribution = await db
      .select({
        action: auditLogs.action,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(auditLogs)
      .where(whereClause)
      .groupBy(auditLogs.action)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(10);

    return { records, summary, actionDistribution };
  }

  /**
   * Generate PDF report
   */
  private async generatePDF(
    type: ReportType,
    data: any,
    params: ReportParameters,
    template: { title: string; sections: string[] }
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc.fontSize(20).text(template.title, { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown(2);

        // Summary section
        if (data.summary) {
          doc.fontSize(14).text('Summary', { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(10);

          Object.entries(data.summary).forEach(([key, value]) => {
            const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
            doc.text(`${label}: ${value}`);
          });
          doc.moveDown();
        }

        // Distribution sections
        if (data.statusDistribution) {
          doc.fontSize(14).text('Status Distribution', { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(10);

          data.statusDistribution.forEach((item: any) => {
            doc.text(`${item.status}: ${item.count}`);
          });
          doc.moveDown();
        }

        if (data.roleDistribution) {
          doc.fontSize(14).text('Role Distribution', { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(10);

          data.roleDistribution.forEach((item: any) => {
            doc.text(`${item.role}: ${item.count}`);
          });
          doc.moveDown();
        }

        if (data.portalDistribution) {
          doc.fontSize(14).text('Portal Distribution', { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(10);

          data.portalDistribution.forEach((item: any) => {
            doc.text(`${item.portalType}: ${item.count}`);
          });
          doc.moveDown();
        }

        // Records table (simplified)
        if (data.records && data.records.length > 0) {
          doc.addPage();
          doc.fontSize(14).text('Records', { underline: true });
          doc.moveDown(0.5);

          const displayRecords = data.records.slice(0, 50); // Limit for PDF
          const headers = Object.keys(displayRecords[0]).filter(
            (k) => !['createdAt', 'updatedAt'].includes(k)
          );

          // Table header
          doc.fontSize(8);
          let xPos = 50;
          const colWidth = (doc.page.width - 100) / Math.min(headers.length, 5);

          headers.slice(0, 5).forEach((header) => {
            doc.text(header.substring(0, 15), xPos, doc.y, { width: colWidth, continued: false });
            xPos += colWidth;
          });
          doc.moveDown();

          // Table rows
          displayRecords.forEach((record: any) => {
            xPos = 50;
            headers.slice(0, 5).forEach((header) => {
              const value = String(record[header] ?? '').substring(0, 20);
              doc.text(value, xPos, doc.y, { width: colWidth, continued: false });
              xPos += colWidth;
            });
            doc.moveDown(0.5);

            if (doc.y > doc.page.height - 100) {
              doc.addPage();
            }
          });

          if (data.records.length > 50) {
            doc.moveDown();
            doc.text(`... and ${data.records.length - 50} more records`);
          }
        }

        // Footer
        doc.fontSize(8).text(`Report ID: RPT-${Date.now()}`, 50, doc.page.height - 50);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate Excel report
   */
  private async generateExcel(
    type: ReportType,
    data: any,
    template: { title: string; sections: string[] }
  ): Promise<Buffer> {
    const flattenedRecords = data.records.map((r: any) => flattenObject(r));
    return convertToExcel(flattenedRecords, template.title);
  }

  /**
   * Generate CSV report
   */
  private generateCSV(data: any): string {
    const flattenedRecords = data.records.map((r: any) => flattenObject(r));
    return convertToCSV(flattenedRecords);
  }

  /**
   * Log report generation
   */
  private async logReportGeneration(
    reportId: string,
    type: ReportType,
    format: ReportFormat,
    parameters: ReportParameters,
    generatedBy: number,
    status: 'success' | 'failed',
    metadata?: { recordCount: number; generationTime: number },
    error?: string
  ): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        userId: generatedBy,
        action: 'report_generated',
        entityType: 'report',
        entityId: reportId,
        oldValue: null,
        newValue: {
          type,
          format,
          parameters,
          status,
          metadata,
          error,
        },
        timestamp: new Date(),
      });
    } catch (err) {
      logger.error('Failed to log report generation:', err);
    }
  }

  /**
   * Get available report types
   */
  getAvailableReportTypes(): Array<{ type: ReportType; name: string; description: string }> {
    return [
      { type: 'service_requests', name: 'Service Requests', description: 'All service request data with status and amounts' },
      { type: 'revenue', name: 'Revenue', description: 'Payment and revenue analytics' },
      { type: 'compliance', name: 'Compliance', description: 'Compliance status and deadlines' },
      { type: 'user_activity', name: 'User Activity', description: 'User login and activity data' },
      { type: 'operations_summary', name: 'Operations Summary', description: 'Operational metrics and workload' },
      { type: 'government_filings', name: 'Government Filings', description: 'Filing status across portals' },
      { type: 'client_portfolio', name: 'Client Portfolio', description: 'Client and entity overview' },
      { type: 'audit_trail', name: 'Audit Trail', description: 'System audit logs' },
    ];
  }

  /**
   * Get report history
   */
  async getReportHistory(
    options?: {
      userId?: number;
      type?: ReportType;
      limit?: number;
    }
  ): Promise<any[]> {
    try {
      const conditions: any[] = [eq(auditLogs.action, 'report_generated')];

      if (options?.userId) {
        conditions.push(eq(auditLogs.userId, options.userId));
      }

      const logs = await db
        .select()
        .from(auditLogs)
        .where(and(...conditions))
        .orderBy(desc(auditLogs.timestamp))
        .limit(options?.limit || 50);

      return logs.map((log) => ({
        id: log.entityId,
        ...((log.newValue as any) || {}),
        generatedAt: log.timestamp,
        generatedBy: log.userId,
      }));
    } catch (error) {
      logger.error('Get report history error:', error);
      return [];
    }
  }
}

export const reportGeneratorService = new ReportGeneratorService();
