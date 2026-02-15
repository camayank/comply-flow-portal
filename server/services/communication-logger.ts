/**
 * Communication Logger Service
 *
 * Logs all outbound communications (email, SMS, WhatsApp) to the client_communications table.
 * This provides a complete audit trail of all client interactions.
 *
 * Usage:
 * - Import and call after sending any communication
 * - Automatically captures metadata for analytics
 */

import { pool } from '../db';

export interface CommunicationLogParams {
  // Client identification (at least one required)
  clientId?: number;
  businessEntityId?: number;
  serviceRequestId?: number;
  recipientEmail?: string;
  recipientPhone?: string;

  // Communication details
  type: 'email' | 'sms' | 'whatsapp' | 'call' | 'portal_message';
  direction: 'inbound' | 'outbound';
  subject?: string;
  summary: string;
  fullContent?: string;

  // Sender/context
  contactedBy?: number; // Staff user ID
  contactedByName?: string;

  // Categorization
  purpose?: 'follow_up' | 'issue_resolution' | 'service_discussion' | 'payment_reminder' | 'relationship_building' | 'notification' | 'otp' | 'welcome' | 'invoice';
  priority?: 'low' | 'medium' | 'high' | 'urgent';

  // Metadata
  metadata?: Record<string, any>;
  templateId?: string;
  campaignId?: string;
}

interface LogResult {
  success: boolean;
  communicationId?: number;
  error?: string;
}

/**
 * Log a communication to the database
 */
export async function logCommunication(params: CommunicationLogParams): Promise<LogResult> {
  try {
    // Resolve client ID if not provided
    let clientId = params.clientId;

    if (!clientId && params.businessEntityId) {
      // Try to get client ID from business entity
      const beResult = await pool.query(
        'SELECT user_id FROM business_entities WHERE id = $1',
        [params.businessEntityId]
      );
      if (beResult.rows.length > 0) {
        clientId = beResult.rows[0].user_id;
      }
    }

    if (!clientId && params.recipientEmail) {
      // Try to get client ID from email
      const userResult = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [params.recipientEmail]
      );
      if (userResult.rows.length > 0) {
        clientId = userResult.rows[0].id;
      }
    }

    if (!clientId && params.serviceRequestId) {
      // Try to get client ID from service request
      const srResult = await pool.query(
        'SELECT user_id FROM service_requests WHERE id = $1',
        [params.serviceRequestId]
      );
      if (srResult.rows.length > 0) {
        clientId = srResult.rows[0].user_id;
      }
    }

    // If still no client ID, log to a catch-all record
    if (!clientId) {
      console.warn('[CommunicationLogger] Could not resolve client ID for communication:', {
        email: params.recipientEmail,
        phone: params.recipientPhone,
        type: params.type,
      });
      // Use system user ID (1) as fallback
      clientId = 1;
    }

    // Insert communication record
    const result = await pool.query(`
      INSERT INTO client_communications (
        client_id,
        business_entity_id,
        service_request_id,
        communication_type,
        direction,
        subject,
        summary,
        full_content,
        contacted_by,
        contacted_person,
        contact_method,
        actual_at,
        purpose,
        priority,
        outcome,
        tags,
        created_by,
        created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12, $13, $14, $15, $16, NOW()
      ) RETURNING id
    `, [
      clientId,
      params.businessEntityId || null,
      params.serviceRequestId || null,
      params.type,
      params.direction,
      params.subject || null,
      params.summary.substring(0, 500), // Truncate summary
      params.fullContent || null,
      params.contactedBy || null,
      params.contactedByName || null,
      params.recipientEmail || params.recipientPhone || null,
      params.purpose || 'notification',
      params.priority || 'medium',
      'delivered', // Initial outcome
      JSON.stringify({
        ...params.metadata,
        templateId: params.templateId,
        campaignId: params.campaignId,
      }),
      params.contactedBy || 1, // System user as default
    ]);

    return {
      success: true,
      communicationId: result.rows[0]?.id,
    };
  } catch (error) {
    console.error('[CommunicationLogger] Failed to log communication:', error);
    // Don't throw - logging should not break the main flow
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Log an email communication
 */
export async function logEmail(params: {
  to: string;
  subject: string;
  body: string;
  clientId?: number;
  businessEntityId?: number;
  serviceRequestId?: number;
  sentBy?: number;
  purpose?: CommunicationLogParams['purpose'];
  templateId?: string;
}): Promise<LogResult> {
  return logCommunication({
    recipientEmail: params.to,
    clientId: params.clientId,
    businessEntityId: params.businessEntityId,
    serviceRequestId: params.serviceRequestId,
    type: 'email',
    direction: 'outbound',
    subject: params.subject,
    summary: params.body.substring(0, 200),
    fullContent: params.body,
    contactedBy: params.sentBy,
    purpose: params.purpose || 'notification',
    templateId: params.templateId,
  });
}

/**
 * Log an SMS communication
 */
export async function logSMS(params: {
  to: string;
  message: string;
  clientId?: number;
  businessEntityId?: number;
  serviceRequestId?: number;
  sentBy?: number;
  purpose?: CommunicationLogParams['purpose'];
}): Promise<LogResult> {
  return logCommunication({
    recipientPhone: params.to,
    clientId: params.clientId,
    businessEntityId: params.businessEntityId,
    serviceRequestId: params.serviceRequestId,
    type: 'sms',
    direction: 'outbound',
    summary: params.message,
    fullContent: params.message,
    contactedBy: params.sentBy,
    purpose: params.purpose || 'notification',
  });
}

/**
 * Log a WhatsApp communication
 */
export async function logWhatsApp(params: {
  to: string;
  message: string;
  clientId?: number;
  businessEntityId?: number;
  serviceRequestId?: number;
  sentBy?: number;
  purpose?: CommunicationLogParams['purpose'];
  templateName?: string;
}): Promise<LogResult> {
  return logCommunication({
    recipientPhone: params.to,
    clientId: params.clientId,
    businessEntityId: params.businessEntityId,
    serviceRequestId: params.serviceRequestId,
    type: 'whatsapp',
    direction: 'outbound',
    summary: params.message.substring(0, 200),
    fullContent: params.message,
    contactedBy: params.sentBy,
    purpose: params.purpose || 'notification',
    templateId: params.templateName,
  });
}

/**
 * Log a phone call
 */
export async function logCall(params: {
  phone: string;
  direction: 'inbound' | 'outbound';
  summary: string;
  duration?: number; // in minutes
  clientId?: number;
  businessEntityId?: number;
  serviceRequestId?: number;
  agentId?: number;
  outcome?: 'resolved' | 'pending' | 'escalated' | 'no_action_needed';
}): Promise<LogResult> {
  return logCommunication({
    recipientPhone: params.phone,
    clientId: params.clientId,
    businessEntityId: params.businessEntityId,
    serviceRequestId: params.serviceRequestId,
    type: 'call',
    direction: params.direction,
    summary: params.summary,
    contactedBy: params.agentId,
    purpose: 'follow_up',
    metadata: {
      duration: params.duration,
      outcome: params.outcome,
    },
  });
}

/**
 * Get communication history for a client
 */
export async function getClientCommunicationHistory(
  clientId: number,
  options?: {
    limit?: number;
    offset?: number;
    type?: string;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<any[]> {
  try {
    const params: any[] = [clientId];
    let whereClause = 'WHERE client_id = $1';
    let paramIndex = 2;

    if (options?.type) {
      whereClause += ` AND communication_type = $${paramIndex++}`;
      params.push(options.type);
    }

    if (options?.startDate) {
      whereClause += ` AND actual_at >= $${paramIndex++}`;
      params.push(options.startDate);
    }

    if (options?.endDate) {
      whereClause += ` AND actual_at <= $${paramIndex++}`;
      params.push(options.endDate);
    }

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    params.push(limit, offset);

    const result = await pool.query(`
      SELECT
        id,
        communication_type,
        direction,
        subject,
        summary,
        contact_method,
        actual_at,
        purpose,
        priority,
        outcome,
        created_at
      FROM client_communications
      ${whereClause}
      ORDER BY actual_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `, params);

    return result.rows;
  } catch (error) {
    console.error('[CommunicationLogger] Failed to get history:', error);
    return [];
  }
}

/**
 * Get communication statistics for analytics
 */
export async function getCommunicationStats(
  options?: {
    clientId?: number;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<any> {
  try {
    const params: any[] = [];
    let whereClause = 'WHERE 1=1';
    let paramIndex = 1;

    if (options?.clientId) {
      whereClause += ` AND client_id = $${paramIndex++}`;
      params.push(options.clientId);
    }

    if (options?.startDate) {
      whereClause += ` AND actual_at >= $${paramIndex++}`;
      params.push(options.startDate);
    }

    if (options?.endDate) {
      whereClause += ` AND actual_at <= $${paramIndex++}`;
      params.push(options.endDate);
    }

    const result = await pool.query(`
      SELECT
        communication_type,
        direction,
        COUNT(*) as count
      FROM client_communications
      ${whereClause}
      GROUP BY communication_type, direction
      ORDER BY count DESC
    `, params);

    return result.rows;
  } catch (error) {
    console.error('[CommunicationLogger] Failed to get stats:', error);
    return [];
  }
}
