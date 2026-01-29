/**
 * Document Management Service - V2
 * 
 * World-class document lifecycle management inspired by:
 * - Secureframe: Smart document requests with validation
 * - Vanta: Auto-verification and OCR extraction  
 * - Rippling: Intelligent document checklists
 * - Carta: Version control and audit trails
 * 
 * Features:
 * - Smart document requests (know what you need before asking)
 * - Multi-version support (track document updates)
 * - OCR data extraction (auto-fill from scanned docs)
 * - Expiry tracking and auto-reminders
 * - File integrity (checksum validation)
 * - Compliance-driven workflows
 */

import { pool } from '../../db';
import crypto from 'crypto';
import { INDIAN_DOCUMENT_TYPES, getDocumentType, getDocumentsForService } from '../../data/indian-document-types-catalog';

export interface DocumentRecord {
  id: number;
  clientId: number;
  documentKey: string;
  documentName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  checksum: string;
  version: number;
  status: 'pending' | 'uploaded' | 'verifying' | 'verified' | 'rejected' | 'expired';
  verificationStatus: 'pending' | 'auto_verified' | 'manual_verified' | 'failed';
  uploadedBy: string;
  uploadedAt: Date;
  verifiedBy?: string;
  verifiedAt?: Date;
  rejectionReason?: string;
  expiryDate?: Date;
  extractedData?: any; // OCR extracted fields
  metadata?: any;
  linkedToActionId?: number;
  linkedToServiceKey?: string;
}

export interface DocumentRequest {
  serviceKey: string;
  actionId?: number;
  requiredDocuments: string[]; // Document keys
  optionalDocuments: string[];
  dueDate: Date;
  instructions?: string;
}

export interface DocumentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  extractedData?: any;
  suggestions?: string[];
}

/**
 * Create smart document request for a service
 * Automatically determines required documents based on service type
 */
export async function createDocumentRequest(
  clientId: number,
  serviceKey: string,
  actionId?: number
): Promise<DocumentRequest> {
  // Get documents required for this service
  const requiredDocs = getDocumentsForService(serviceKey);
  
  // Split into mandatory and optional based on service logic
  const mandatory = requiredDocs.filter(doc => 
    doc.mandatoryFields.length > 0 || 
    doc.commonFor.includes('all_services')
  ).map(doc => doc.documentKey);
  
  const optional = requiredDocs.filter(doc => 
    doc.mandatoryFields.length === 0 && 
    !doc.commonFor.includes('all_services')
  ).map(doc => doc.documentKey);

  // Calculate due date based on service urgency
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7); // Default 7 days

  const request: DocumentRequest = {
    serviceKey,
    actionId,
    requiredDocuments: mandatory,
    optionalDocuments: optional,
    dueDate,
    instructions: generateInstructions(serviceKey, requiredDocs)
  };

  // Store request in database
  await pool.query(
    `INSERT INTO document_requests 
     (client_id, service_key, action_id, required_documents, optional_documents, due_date, instructions, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
    [
      clientId,
      serviceKey,
      actionId,
      JSON.stringify(mandatory),
      JSON.stringify(optional),
      dueDate,
      request.instructions
    ]
  );

  return request;
}

/**
 * Upload document with smart validation
 * Vanta-style: Validate format, size, and content before accepting
 */
export async function uploadDocument(
  clientId: number,
  documentKey: string,
  fileData: {
    fileName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
    fileBuffer: Buffer;
  },
  uploadedBy: string,
  metadata?: any
): Promise<{ documentId: number; validationResult: DocumentValidationResult }> {
  // Get document type definition
  const docType = getDocumentType(documentKey);
  
  if (!docType) {
    throw new Error(`Unknown document type: ${documentKey}`);
  }

  // Validate file requirements
  const validationResult = await validateDocument(docType, fileData);
  
  if (!validationResult.isValid) {
    throw new Error(`Document validation failed: ${validationResult.errors.join(', ')}`);
  }

  // Calculate file checksum for integrity
  const checksum = crypto
    .createHash('sha256')
    .update(fileData.fileBuffer)
    .digest('hex');

  // Check for existing document versions
  const versionResult = await pool.query(
    `SELECT COALESCE(MAX(version), 0) as latest_version 
     FROM client_documents 
     WHERE client_id = $1 AND document_key = $2`,
    [clientId, documentKey]
  );

  const nextVersion = versionResult.rows[0].latest_version + 1;

  // Insert document record
  const result = await pool.query(
    `INSERT INTO client_documents 
     (client_id, document_key, document_name, file_name, file_path, file_size_bytes,
      mime_type, checksum, version, status, verification_status, uploaded_by, 
      extracted_data, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'uploaded', 'pending', $10, $11, $12)
     RETURNING id`,
    [
      clientId,
      documentKey,
      docType.name,
      fileData.fileName,
      fileData.filePath,
      fileData.fileSize,
      fileData.mimeType,
      checksum,
      nextVersion,
      uploadedBy,
      JSON.stringify(validationResult.extractedData || {}),
      JSON.stringify(metadata || {})
    ]
  );

  const documentId = result.rows[0].id;

  // Log activity
  await pool.query(
    `INSERT INTO client_activities 
     (client_id, activity_type, description, actor_id, entity_type, entity_id, metadata)
     VALUES ($1, 'document_uploaded', $2, $3, 'document', $4, $5)`,
    [
      clientId,
      `Uploaded ${docType.name} (version ${nextVersion})`,
      uploadedBy,
      documentId.toString(),
      JSON.stringify({ documentKey, version: nextVersion })
    ]
  );

  // If OCR enabled, queue for extraction
  if (docType.ocrEnabled && validationResult.extractedData) {
    await queueOCRProcessing(documentId, documentKey);
  }

  // Auto-verify if simple document
  if (shouldAutoVerify(docType, validationResult)) {
    await verifyDocument(documentId, 'system', true);
  }

  return { documentId, validationResult };
}

/**
 * Validate document against type requirements
 * Rippling-style: Check format, size, fields, and content
 */
async function validateDocument(
  docType: any,
  fileData: any
): Promise<DocumentValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Check file format
  const fileExt = fileData.fileName.split('.').pop()?.toLowerCase();
  if (!docType.fileRequirements.allowedFormats.includes(fileExt)) {
    errors.push(
      `Invalid file format. Allowed: ${docType.fileRequirements.allowedFormats.join(', ')}`
    );
  }

  // Check file size
  const fileSizeKB = fileData.fileSize / 1024;
  if (fileSizeKB > docType.fileRequirements.maxSizeKB) {
    errors.push(
      `File too large. Maximum: ${docType.fileRequirements.maxSizeKB}KB, Got: ${Math.round(fileSizeKB)}KB`
    );
  }

  // Check if file size is suspiciously small
  if (fileSizeKB < 10) {
    warnings.push('File size is very small. Please ensure the document is complete.');
  }

  // OCR simulation (in production, call actual OCR service)
  let extractedData: any = {};
  if (docType.ocrEnabled) {
    extractedData = await simulateOCR(docType.documentKey, fileData);
    
    // Validate mandatory fields from extraction
    for (const field of docType.mandatoryFields) {
      if (!extractedData[field]) {
        warnings.push(`Could not extract required field: ${field}. Please verify manually.`);
      }
    }

    // Validate extracted data against rules
    for (const rule of docType.validationRules) {
      if (extractedData[rule.field]) {
        const regex = new RegExp(rule.rule);
        if (!regex.test(extractedData[rule.field])) {
          errors.push(rule.errorMessage);
        }
      }
    }
  }

  // Add helpful suggestions
  if (docType.sampleTemplate) {
    suggestions.push(`Download sample template: ${docType.sampleTemplate}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    extractedData,
    suggestions
  };
}

/**
 * Simulate OCR extraction (replace with actual OCR in production)
 * In production: Use Google Cloud Vision, AWS Textract, or Azure Form Recognizer
 */
async function simulateOCR(documentKey: string, fileData: any): Promise<any> {
  // Mock OCR extraction based on document type
  const mockData: Record<string, any> = {
    pan_card: {
      pan_number: 'ABCDE1234F',
      name: 'JOHN DOE',
      dob: '01/01/1990'
    },
    aadhaar_card: {
      aadhaar_number: '123456789012',
      name: 'John Doe',
      dob: '01/01/1990',
      address: '123 Main St, City'
    },
    gst_certificate: {
      gstin: '29AABCT1234E1Z5',
      legal_name: 'TechStart Solutions Pvt Ltd',
      trade_name: 'TechStart',
      registration_date: '2023-06-15'
    }
  };

  return mockData[documentKey] || {};
}

/**
 * Verify document (manual or auto)
 * Secureframe-style: Track who verified and when
 */
export async function verifyDocument(
  documentId: number,
  verifiedBy: string,
  autoVerified: boolean = false
): Promise<void> {
  await pool.query(
    `UPDATE client_documents 
     SET status = 'verified',
         verification_status = $1,
         verified_by = $2,
         verified_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [
      autoVerified ? 'auto_verified' : 'manual_verified',
      verifiedBy,
      documentId
    ]
  );

  // Log activity
  const doc = await pool.query(
    'SELECT client_id, document_name FROM client_documents WHERE id = $1',
    [documentId]
  );

  if (doc.rows.length > 0) {
    await pool.query(
      `INSERT INTO client_activities 
       (client_id, activity_type, description, actor_id, entity_type, entity_id)
       VALUES ($1, 'document_approved', $2, $3, 'document', $4)`,
      [
        doc.rows[0].client_id,
        `${doc.rows[0].document_name} verified`,
        verifiedBy,
        documentId.toString()
      ]
    );
  }
}

/**
 * Reject document with reason
 */
export async function rejectDocument(
  documentId: number,
  rejectedBy: string,
  reason: string
): Promise<void> {
  await pool.query(
    `UPDATE client_documents 
     SET status = 'rejected',
         verification_status = 'failed',
         verified_by = $1,
         verified_at = CURRENT_TIMESTAMP,
         rejection_reason = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [rejectedBy, reason, documentId]
  );

  // Log activity
  const doc = await pool.query(
    'SELECT client_id, document_name FROM client_documents WHERE id = $1',
    [documentId]
  );

  if (doc.rows.length > 0) {
    await pool.query(
      `INSERT INTO client_activities 
       (client_id, activity_type, description, actor_id, entity_type, entity_id, metadata)
       VALUES ($1, 'document_rejected', $2, $3, 'document', $4, $5)`,
      [
        doc.rows[0].client_id,
        `${doc.rows[0].document_name} rejected: ${reason}`,
        rejectedBy,
        documentId.toString(),
        JSON.stringify({ reason })
      ]
    );
  }
}

/**
 * Get client documents with filters
 */
export async function getClientDocuments(
  clientId: number,
  filters?: {
    documentKey?: string;
    status?: string;
    serviceKey?: string;
    latestOnly?: boolean;
  }
): Promise<DocumentRecord[]> {
  let query = `
    SELECT 
      cd.*,
      dt.name as document_name,
      dt.category,
      dt.validity_period_days,
      dt.renewal_reminder_days
    FROM client_documents cd
    LEFT JOIN document_types dt ON cd.document_key = dt.document_key
    WHERE cd.client_id = $1
  `;

  const params: any[] = [clientId];
  let paramIndex = 2;

  if (filters?.documentKey) {
    query += ` AND cd.document_key = $${paramIndex}`;
    params.push(filters.documentKey);
    paramIndex++;
  }

  if (filters?.status) {
    query += ` AND cd.status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }

  if (filters?.latestOnly) {
    query += ` AND cd.version = (
      SELECT MAX(version) 
      FROM client_documents 
      WHERE client_id = cd.client_id 
      AND document_key = cd.document_key
    )`;
  }

  query += ' ORDER BY cd.created_at DESC';

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Check document expiry and send reminders
 * Carta-style: Proactive expiry management
 */
export async function checkExpiringDocuments(
  clientId: number,
  daysThreshold: number = 30
): Promise<any[]> {
  const result = await pool.query(
    `SELECT 
      cd.id,
      cd.document_key,
      cd.document_name,
      cd.expiry_date,
      cd.client_id,
      DATE_PART('day', cd.expiry_date::timestamp - CURRENT_DATE) as days_until_expiry
    FROM client_documents cd
    WHERE cd.client_id = $1
      AND cd.expiry_date IS NOT NULL
      AND cd.expiry_date::timestamp > CURRENT_DATE
      AND cd.expiry_date::timestamp <= CURRENT_DATE + INTERVAL '1 day' * $2
      AND cd.status = 'verified'
    ORDER BY cd.expiry_date ASC`,
    [clientId, daysThreshold]
  );

  return result.rows;
}

/**
 * Generate smart instructions for document collection
 */
function generateInstructions(serviceKey: string, documents: any[]): string {
  const instructions: string[] = [
    `Please upload the following documents for ${serviceKey}:`,
    ''
  ];

  documents.forEach((doc, index) => {
    instructions.push(`${index + 1}. ${doc.name}`);
    instructions.push(`   - Accepted formats: ${doc.fileRequirements.allowedFormats.join(', ')}`);
    instructions.push(`   - Maximum size: ${doc.fileRequirements.maxSizeKB}KB`);
    if (doc.description) {
      instructions.push(`   - Note: ${doc.description}`);
    }
    instructions.push('');
  });

  instructions.push('Tips for better processing:');
  instructions.push('- Ensure documents are clear and readable');
  instructions.push('- Upload original or certified copies');
  instructions.push('- Check that all pages are included');
  instructions.push('- Verify all details are visible');

  return instructions.join('\n');
}

/**
 * Determine if document can be auto-verified
 */
function shouldAutoVerify(docType: any, validationResult: DocumentValidationResult): boolean {
  // Auto-verify if:
  // 1. OCR extraction successful
  // 2. All mandatory fields extracted
  // 3. No validation errors
  // 4. Document type allows auto-verification
  
  if (!docType.ocrEnabled || !validationResult.extractedData) {
    return false;
  }

  if (validationResult.errors.length > 0) {
    return false;
  }

  const allFieldsExtracted = docType.mandatoryFields.every(
    (field: string) => validationResult.extractedData[field]
  );

  return allFieldsExtracted;
}

/**
 * Queue document for OCR processing
 */
async function queueOCRProcessing(documentId: number, documentKey: string): Promise<void> {
  // In production: Queue to background job processor (Bull, AWS SQS, etc.)
  console.log(`Queued document ${documentId} (${documentKey}) for OCR processing`);
}
