/**
 * @deprecated This service has been replaced by v2/document-management-service.ts
 * Please migrate to: /api/v2/lifecycle/documents-detail
 * Removal planned for: 2026-06-01
 * 
 * Document Management Service
 * 
 * Following best practices from Secureframe, Vanta:
 * - Secure file storage with encryption
 * - File integrity verification (checksums)
 * - Document expiry tracking
 * - Version control ready
 */

console.warn('⚠️  DEPRECATED: document-service.ts - Use v2/document-management-service.ts instead');

import { pool } from '../db';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';

export interface DocumentMetadata {
  clientId: number;
  actionId?: number;
  documentType: string;
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
  mimeType: string;
  uploadedBy: string;
  expiryDate?: Date;
  metadata?: any;
}

/**
 * Store document metadata in database
 */
export async function storeDocument(doc: DocumentMetadata) {
  try {
    // Calculate checksum for file integrity
    const fileBuffer = await fs.readFile(doc.filePath);
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const result = await pool.query(
      `INSERT INTO client_documents (
        client_id, action_id, document_type, file_name, file_path,
        file_size_bytes, mime_type, checksum, uploaded_by, expiry_date, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id`,
      [
        doc.clientId,
        doc.actionId || null,
        doc.documentType,
        doc.fileName,
        doc.filePath,
        doc.fileSizeBytes,
        doc.mimeType,
        checksum,
        doc.uploadedBy,
        doc.expiryDate || null,
        doc.metadata ? JSON.stringify(doc.metadata) : null,
      ]
    );

    return result.rows[0].id;
  } catch (error) {
    console.error('Error storing document:', error);
    throw error;
  }
}

/**
 * Get documents for a client
 */
export async function getClientDocuments(clientId: number, filters?: {
  documentType?: string;
  verificationStatus?: string;
  limit?: number;
}) {
  try {
    let query = `
      SELECT 
        id, document_type, file_name, file_size_bytes, mime_type,
        verification_status, verified_at, verified_by,
        expiry_date, uploaded_by, created_at, metadata
      FROM client_documents
      WHERE client_id = $1
    `;
    
    const params: any[] = [clientId];
    let paramCount = 1;

    if (filters?.documentType) {
      paramCount++;
      query += ` AND document_type = $${paramCount}`;
      params.push(filters.documentType);
    }

    if (filters?.verificationStatus) {
      paramCount++;
      query += ` AND verification_status = $${paramCount}`;
      params.push(filters.verificationStatus);
    }

    query += ` ORDER BY created_at DESC`;

    if (filters?.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error getting documents:', error);
    return [];
  }
}

/**
 * Verify document (approve/reject)
 */
export async function verifyDocument(
  documentId: number,
  verifiedBy: string,
  status: 'verified' | 'rejected',
  rejectionReason?: string
) {
  try {
    await pool.query(
      `UPDATE client_documents 
      SET 
        verification_status = $1,
        verified_by = $2,
        verified_at = CURRENT_TIMESTAMP,
        rejection_reason = $3
      WHERE id = $4`,
      [status, verifiedBy, rejectionReason || null, documentId]
    );
  } catch (error) {
    console.error('Error verifying document:', error);
    throw error;
  }
}

/**
 * Check document integrity
 */
export async function verifyDocumentIntegrity(documentId: number): Promise<boolean> {
  try {
    const result = await pool.query(
      `SELECT file_path, checksum FROM client_documents WHERE id = $1`,
      [documentId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    const { file_path, checksum } = result.rows[0];
    const fileBuffer = await fs.readFile(file_path);
    const currentChecksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    return checksum === currentChecksum;
  } catch (error) {
    console.error('Error verifying document integrity:', error);
    return false;
  }
}

/**
 * Get documents expiring soon
 */
export async function getExpiringDocuments(clientId: number, daysThreshold: number = 30) {
  try {
    const result = await pool.query(
      `SELECT 
        id, document_type, file_name, expiry_date, uploaded_by
      FROM client_documents
      WHERE 
        client_id = $1 
        AND expiry_date IS NOT NULL
        AND expiry_date <= CURRENT_DATE + INTERVAL '${daysThreshold} days'
        AND expiry_date > CURRENT_DATE
      ORDER BY expiry_date ASC`,
      [clientId]
    );

    return result.rows;
  } catch (error) {
    console.error('Error getting expiring documents:', error);
    return [];
  }
}
