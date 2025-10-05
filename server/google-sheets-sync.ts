import { google, sheets_v4 } from 'googleapis';
import { db } from './db';
import { 
  governmentFilings, 
  sheetSyncLogs,
  integrationCredentials,
  InsertSheetSyncLog 
} from '@shared/schema';
import { eq, and, desc, gte } from 'drizzle-orm';
import { integrationHub } from './integration-hub';

// ============================================================================
// GOOGLE SHEETS SYNC ENGINE
// Bidirectional sync between platform database and Google Sheets
// Works as backup when system is down
// ============================================================================

export class GoogleSheetsSync {
  private sheets: sheets_v4.Sheets | null = null;

  // Initialize Google Sheets API client
  async initializeClient(serviceAccountEmail: string, privateKey: string) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: serviceAccountEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth });
    return this.sheets;
  }

  // ========================================================================
  // SYNC TO GOOGLE SHEETS (Database → Sheets)
  // ========================================================================

  async syncToSheets(clientId: number, sheetId: string) {
    const logData: InsertSheetSyncLog = {
      clientId,
      sheetId,
      syncDirection: 'to_sheet',
      syncType: 'full',
      status: 'in_progress',
      recordsProcessed: 0,
      recordsSucceeded: 0,
      recordsFailed: 0,
    };

    const [syncLog] = await db.insert(sheetSyncLogs).values(logData).returning();

    try {
      // Get credentials
      const credential = await integrationHub.getCredentials(clientId, 'sheets');
      if (!credential || !credential.serviceAccountEmail) {
        throw new Error('Google Sheets credentials not found');
      }

      // Initialize client
      await this.initializeClient(credential.serviceAccountEmail, credential.apiKey || '');

      // Get all filings for this client
      const filings = await integrationHub.getFilingsByClient(clientId);

      // Group filings by portal type
      const gstFilings = filings.filter(f => f.portalType === 'gsp');
      const itFilings = filings.filter(f => f.portalType === 'eri');
      const mcaFilings = filings.filter(f => f.portalType === 'mca21');

      let totalProcessed = 0;
      let totalSucceeded = 0;
      let totalFailed = 0;

      // Sync GST filings
      if (gstFilings.length > 0) {
        const result = await this.syncGSTToSheet(sheetId, gstFilings);
        totalProcessed += result.processed;
        totalSucceeded += result.succeeded;
        totalFailed += result.failed;
      }

      // Sync IT filings
      if (itFilings.length > 0) {
        const result = await this.syncITToSheet(sheetId, itFilings);
        totalProcessed += result.processed;
        totalSucceeded += result.succeeded;
        totalFailed += result.failed;
      }

      // Sync MCA filings
      if (mcaFilings.length > 0) {
        const result = await this.syncMCAToSheet(sheetId, mcaFilings);
        totalProcessed += result.processed;
        totalSucceeded += result.succeeded;
        totalFailed += result.failed;
      }

      // Update sync log
      await db
        .update(sheetSyncLogs)
        .set({
          status: 'completed',
          recordsProcessed: totalProcessed,
          recordsSucceeded: totalSucceeded,
          recordsFailed: totalFailed,
          completedAt: new Date(),
          duration: Date.now() - new Date(syncLog.startedAt).getTime(),
        })
        .where(eq(sheetSyncLogs.id, syncLog.id));

      return {
        success: true,
        syncLog,
        stats: {
          processed: totalProcessed,
          succeeded: totalSucceeded,
          failed: totalFailed,
        },
      };
    } catch (error: any) {
      // Mark sync as failed
      await db
        .update(sheetSyncLogs)
        .set({
          status: 'failed',
          errorDetails: { error: error.message },
          completedAt: new Date(),
        })
        .where(eq(sheetSyncLogs.id, syncLog.id));

      throw error;
    }
  }

  // Sync GST filings to sheet
  private async syncGSTToSheet(sheetId: string, filings: any[]) {
    if (!this.sheets) throw new Error('Sheets client not initialized');

    const headers = [
      'Filing ID',
      'GSTIN',
      'Period',
      'Filing Type',
      'ARN',
      'Status',
      'Due Date',
      'Filed Date',
      'Sync Time',
    ];

    const rows = filings.map(f => [
      f.id,
      f.entityId || '',
      f.period || '',
      f.filingType,
      f.arnNumber || '',
      f.status,
      f.dueDate ? new Date(f.dueDate).toISOString().split('T')[0] : '',
      f.submittedAt ? new Date(f.submittedAt).toISOString().split('T')[0] : '',
      new Date().toISOString(),
    ]);

    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: 'GST!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers, ...rows],
        },
      });

      // Update filings with sheet sync status
      for (const filing of filings) {
        await integrationHub.updateFiling(filing.id, {
          lastSyncedAt: new Date(),
          syncStatus: 'synced',
        });
      }

      return { processed: filings.length, succeeded: filings.length, failed: 0 };
    } catch (error) {
      return { processed: filings.length, succeeded: 0, failed: filings.length };
    }
  }

  // Sync IT filings to sheet
  private async syncITToSheet(sheetId: string, filings: any[]) {
    if (!this.sheets) throw new Error('Sheets client not initialized');

    const headers = [
      'Filing ID',
      'PAN',
      'Assessment Year',
      'ITR Type',
      'Acknowledgment',
      'Status',
      'Due Date',
      'Filed Date',
      'Sync Time',
    ];

    const rows = filings.map(f => [
      f.id,
      f.entityId || '',
      f.assessmentYear || '',
      f.filingType,
      f.acknowledgmentNumber || '',
      f.status,
      f.dueDate ? new Date(f.dueDate).toISOString().split('T')[0] : '',
      f.submittedAt ? new Date(f.submittedAt).toISOString().split('T')[0] : '',
      new Date().toISOString(),
    ]);

    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: 'IncomeTax!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers, ...rows],
        },
      });

      // Update filings with sheet sync status
      for (const filing of filings) {
        await integrationHub.updateFiling(filing.id, {
          lastSyncedAt: new Date(),
          syncStatus: 'synced',
        });
      }

      return { processed: filings.length, succeeded: filings.length, failed: 0 };
    } catch (error) {
      return { processed: filings.length, succeeded: 0, failed: filings.length };
    }
  }

  // Sync MCA filings to sheet
  private async syncMCAToSheet(sheetId: string, filings: any[]) {
    if (!this.sheets) throw new Error('Sheets client not initialized');

    const headers = [
      'Filing ID',
      'CIN',
      'Financial Year',
      'Form Type',
      'SRN',
      'Status',
      'Due Date',
      'Filed Date',
      'Sync Time',
    ];

    const rows = filings.map(f => [
      f.id,
      f.entityId || '',
      f.financialYear || '',
      f.filingType,
      f.srnNumber || '',
      f.status,
      f.dueDate ? new Date(f.dueDate).toISOString().split('T')[0] : '',
      f.submittedAt ? new Date(f.submittedAt).toISOString().split('T')[0] : '',
      new Date().toISOString(),
    ]);

    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: 'MCA!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers, ...rows],
        },
      });

      // Update filings with sheet sync status
      for (const filing of filings) {
        await integrationHub.updateFiling(filing.id, {
          lastSyncedAt: new Date(),
          syncStatus: 'synced',
        });
      }

      return { processed: filings.length, succeeded: filings.length, failed: 0 };
    } catch (error) {
      return { processed: filings.length, succeeded: 0, failed: filings.length };
    }
  }

  // ========================================================================
  // SYNC FROM GOOGLE SHEETS (Sheets → Database)
  // Used when system is down and edits are made in sheets
  // ========================================================================

  async syncFromSheets(clientId: number, sheetId: string) {
    const logData: InsertSheetSyncLog = {
      clientId,
      sheetId,
      syncDirection: 'from_sheet',
      syncType: 'full',
      status: 'in_progress',
      recordsProcessed: 0,
      recordsSucceeded: 0,
      recordsFailed: 0,
    };

    const [syncLog] = await db.insert(sheetSyncLogs).values(logData).returning();

    try {
      // Get credentials
      const credential = await integrationHub.getCredentials(clientId, 'sheets');
      if (!credential || !credential.serviceAccountEmail) {
        throw new Error('Google Sheets credentials not found');
      }

      // Initialize client
      await this.initializeClient(credential.serviceAccountEmail, credential.apiKey || '');

      if (!this.sheets) throw new Error('Sheets client not initialized');

      // Read data from all sheets
      const gstData = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'GST!A2:I',
      });

      const itData = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'IncomeTax!A2:I',
      });

      const mcaData = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'MCA!A2:I',
      });

      let totalProcessed = 0;
      let totalSucceeded = 0;
      let totalFailed = 0;
      let conflictsDetected = 0;

      // Process GST data
      if (gstData.data.values) {
        const result = await this.processGSTFromSheet(clientId, gstData.data.values);
        totalProcessed += result.processed;
        totalSucceeded += result.succeeded;
        totalFailed += result.failed;
        conflictsDetected += result.conflicts;
      }

      // Process IT data
      if (itData.data.values) {
        const result = await this.processITFromSheet(clientId, itData.data.values);
        totalProcessed += result.processed;
        totalSucceeded += result.succeeded;
        totalFailed += result.failed;
        conflictsDetected += result.conflicts;
      }

      // Process MCA data
      if (mcaData.data.values) {
        const result = await this.processMCAFromSheet(clientId, mcaData.data.values);
        totalProcessed += result.processed;
        totalSucceeded += result.succeeded;
        totalFailed += result.failed;
        conflictsDetected += result.conflicts;
      }

      // Update sync log
      await db
        .update(sheetSyncLogs)
        .set({
          status: 'completed',
          recordsProcessed: totalProcessed,
          recordsSucceeded: totalSucceeded,
          recordsFailed: totalFailed,
          conflictsDetected,
          conflictsResolved: conflictsDetected,
          conflictResolutionStrategy: 'portal_priority',
          completedAt: new Date(),
          duration: Date.now() - new Date(syncLog.startedAt).getTime(),
        })
        .where(eq(sheetSyncLogs.id, syncLog.id));

      return {
        success: true,
        syncLog,
        stats: {
          processed: totalProcessed,
          succeeded: totalSucceeded,
          failed: totalFailed,
          conflicts: conflictsDetected,
        },
      };
    } catch (error: any) {
      await db
        .update(sheetSyncLogs)
        .set({
          status: 'failed',
          errorDetails: { error: error.message },
          completedAt: new Date(),
        })
        .where(eq(sheetSyncLogs.id, syncLog.id));

      throw error;
    }
  }

  private async processGSTFromSheet(clientId: number, rows: any[][]) {
    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    let conflicts = 0;

    for (const row of rows) {
      processed++;
      try {
        const [id, gstin, period, filingType, arn, status] = row;

        // Check if filing exists
        const existing = await integrationHub.getFilingById(parseInt(id));

        if (existing) {
          // Conflict detection - compare last sync time
          if (existing.lastSyncedAt && new Date(row[8]) > existing.lastSyncedAt) {
            conflicts++;
            // Update with sheet data (sheet wins in conflict)
            await integrationHub.updateFiling(parseInt(id), {
              status,
              arnNumber: arn || existing.arnNumber,
              syncStatus: 'synced',
            });
          }
        }

        succeeded++;
      } catch (error) {
        failed++;
      }
    }

    return { processed, succeeded, failed, conflicts };
  }

  private async processITFromSheet(clientId: number, rows: any[][]) {
    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    let conflicts = 0;

    for (const row of rows) {
      processed++;
      try {
        const [id, pan, ay, itrType, ack, status] = row;

        const existing = await integrationHub.getFilingById(parseInt(id));

        if (existing) {
          if (existing.lastSyncedAt && new Date(row[8]) > existing.lastSyncedAt) {
            conflicts++;
            await integrationHub.updateFiling(parseInt(id), {
              status,
              acknowledgmentNumber: ack || existing.acknowledgmentNumber,
              syncStatus: 'synced',
            });
          }
        }

        succeeded++;
      } catch (error) {
        failed++;
      }
    }

    return { processed, succeeded, failed, conflicts };
  }

  private async processMCAFromSheet(clientId: number, rows: any[][]) {
    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    let conflicts = 0;

    for (const row of rows) {
      processed++;
      try {
        const [id, cin, fy, formType, srn, status] = row;

        const existing = await integrationHub.getFilingById(parseInt(id));

        if (existing) {
          if (existing.lastSyncedAt && new Date(row[8]) > existing.lastSyncedAt) {
            conflicts++;
            await integrationHub.updateFiling(parseInt(id), {
              status,
              srnNumber: srn || existing.srnNumber,
              syncStatus: 'synced',
            });
          }
        }

        succeeded++;
      } catch (error) {
        failed++;
      }
    }

    return { processed, succeeded, failed, conflicts };
  }
}

export const googleSheetsSync = new GoogleSheetsSync();
