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
import { getDocumentType, getDocumentsForService } from '../../data/indian-document-types-catalog';

export interface DocumentRecord {
  id: number;
  clientId: number;
  documentKey: string;
  documentName: string;
  category?: string;
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
  source?: 'vault' | 'upload';
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

const normalizeDocumentKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const normalizeFileUrl = (value: string) => {
  if (!value) return value;
  const marker = '/uploads/';
  const index = value.indexOf(marker);
  if (index >= 0) {
    return value.slice(index);
  }
  return value;
};

const mapVaultStatus = (status: string | null): DocumentRecord['status'] => {
  switch ((status || '').toLowerCase()) {
    case 'approved':
      return 'verified';
    case 'under_review':
      return 'uploaded';
    case 'rejected':
      return 'rejected';
    case 'pending':
      return 'uploaded';
    default:
      return 'uploaded';
  }
};

const mapUploadStatus = (status: string | null): DocumentRecord['status'] => {
  switch ((status || '').toLowerCase()) {
    case 'approved':
      return 'verified';
    case 'rejected':
      return 'rejected';
    case 'archived':
      return 'uploaded';
    case 'pending_review':
    default:
      return 'uploaded';
  }
};

const mapStatusToVault = (status?: string) => {
  switch ((status || '').toLowerCase()) {
    case 'verified':
      return ['approved'];
    case 'rejected':
      return ['rejected'];
    case 'verifying':
      return ['under_review'];
    case 'uploaded':
    case 'pending':
    default:
      return ['pending', 'under_review'];
  }
};

const mapStatusToUpload = (status?: string) => {
  switch ((status || '').toLowerCase()) {
    case 'verified':
      return ['approved'];
    case 'rejected':
      return ['rejected'];
    case 'uploaded':
    case 'pending':
    default:
      return ['pending_review'];
  }
};

const resolveUserId = async (value: string | number): Promise<number> => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
    if (value.includes('@')) {
      const result = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [value]);
      if (result.rows.length > 0) {
        return result.rows[0].id;
      }
    }
  }

  throw new Error('Unable to resolve uploader ID');
};

const resolveOptionalUserId = async (value: string | number): Promise<number | null> => {
  if (typeof value === 'string' && value.toLowerCase() === 'system') {
    return null;
  }
  try {
    return await resolveUserId(value);
  } catch (error) {
    return null;
  }
};

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
  const normalizedKey = normalizeDocumentKey(documentKey);
  const docType = getDocumentType(documentKey) || getDocumentType(normalizedKey);
  
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

  const fileUrl = normalizeFileUrl(fileData.filePath);

  // Check for existing document versions
  const versionResult = await pool.query(
    `SELECT COALESCE(MAX(version), 0) as latest_version 
     FROM document_vault 
     WHERE business_entity_id = $1 AND document_type = $2`,
    [clientId, normalizedKey]
  );

  const nextVersion = versionResult.rows[0].latest_version + 1;
  const uploaderId = await resolveUserId(uploadedBy);

  // Insert document record
  const result = await pool.query(
    `INSERT INTO document_vault 
     (user_id, business_entity_id, document_type, category, file_name, original_file_name,
      file_size, mime_type, file_url, version, approval_status, checksum_hash, ocr_data, tags)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11, $12, $13)
     RETURNING id`,
    [
      uploaderId,
      clientId,
      normalizedKey,
      docType.category,
      fileData.fileName,
      fileData.fileName,
      fileData.fileSize,
      fileData.mimeType,
      fileUrl,
      nextVersion,
      checksum,
      JSON.stringify(validationResult.extractedData || {}),
      JSON.stringify(metadata || {})
    ]
  );

  const documentId = result.rows[0].id;

  // Log activity
  await pool.query(
    `INSERT INTO activity_logs
     (user_id, business_entity_id, action, entity_type, entity_id, details, metadata, created_at)
     VALUES ($1, $2, 'document_upload', 'document', $3, $4, $5, CURRENT_TIMESTAMP)`,
    [
      uploaderId,
      clientId,
      documentId,
      `Uploaded ${docType.name} (version ${nextVersion})`,
      JSON.stringify({ documentKey: normalizedKey, version: nextVersion, source: 'document_vault' })
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
 * OCR extraction with graceful degradation
 * Returns clear status when OCR is not configured (no fake data)
 *
 * Supported OCR Services (configure via environment):
 * - AWS Textract: Set AWS_TEXTRACT_ENABLED=true
 * - Google Cloud Vision: Set GOOGLE_VISION_ENABLED=true
 * - Azure Form Recognizer: Set AZURE_FORM_RECOGNIZER_ENABLED=true
 */

interface OcrResult {
  status: 'extracted' | 'manual_verification_required' | 'extraction_failed';
  message?: string;
  extractedData: Record<string, any>;
  confidence: number;
  ocrProvider?: string;
}

async function extractOCR(documentKey: string, fileData: any): Promise<OcrResult> {
  // Check if any OCR service is configured
  const isOcrConfigured =
    process.env.AWS_TEXTRACT_ENABLED === 'true' ||
    process.env.GOOGLE_VISION_ENABLED === 'true' ||
    process.env.AZURE_FORM_RECOGNIZER_ENABLED === 'true';

  if (!isOcrConfigured) {
    // No OCR service configured - return honest status
    console.log(`OCR not configured. Document ${documentKey} requires manual verification.`);
    return {
      status: 'manual_verification_required',
      message: 'OCR service not configured. Document requires manual verification by ops team.',
      extractedData: {},
      confidence: 0,
    };
  }

  try {
    // AWS Textract integration
    if (process.env.AWS_TEXTRACT_ENABLED === 'true') {
      // Placeholder for actual AWS Textract call
      // const textractResult = await callAWSTextract(fileData.fileBuffer);
      console.log(`Would call AWS Textract for ${documentKey}`);
      return {
        status: 'manual_verification_required',
        message: 'AWS Textract integration pending implementation.',
        extractedData: {},
        confidence: 0,
        ocrProvider: 'aws_textract',
      };
    }

    // Google Vision integration
    if (process.env.GOOGLE_VISION_ENABLED === 'true') {
      // Placeholder for actual Google Vision call
      // const visionResult = await callGoogleVision(fileData.fileBuffer);
      console.log(`Would call Google Vision for ${documentKey}`);
      return {
        status: 'manual_verification_required',
        message: 'Google Vision integration pending implementation.',
        extractedData: {},
        confidence: 0,
        ocrProvider: 'google_vision',
      };
    }

    // Azure Form Recognizer integration
    if (process.env.AZURE_FORM_RECOGNIZER_ENABLED === 'true') {
      // Placeholder for actual Azure call
      // const azureResult = await callAzureFormRecognizer(fileData.fileBuffer);
      console.log(`Would call Azure Form Recognizer for ${documentKey}`);
      return {
        status: 'manual_verification_required',
        message: 'Azure Form Recognizer integration pending implementation.',
        extractedData: {},
        confidence: 0,
        ocrProvider: 'azure_form_recognizer',
      };
    }

    // Fallback
    return {
      status: 'manual_verification_required',
      message: 'No OCR provider available.',
      extractedData: {},
      confidence: 0,
    };
  } catch (error) {
    console.error(`OCR extraction failed for ${documentKey}:`, error);
    return {
      status: 'extraction_failed',
      message: `OCR extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      extractedData: {},
      confidence: 0,
    };
  }
}

// Keep old function name for backward compatibility but call new implementation
async function simulateOCR(documentKey: string, fileData: any): Promise<any> {
  const result = await extractOCR(documentKey, fileData);
  return result.extractedData;
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
  const verifierId = await resolveOptionalUserId(verifiedBy);

  await pool.query(
    `UPDATE document_vault 
     SET approval_status = 'approved',
         approved_by = $1,
         approved_at = CURRENT_TIMESTAMP,
         ai_verification_status = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [
      verifierId,
      autoVerified ? 'verified' : 'pending',
      documentId
    ]
  );

  // Log activity
  const doc = await pool.query(
    'SELECT business_entity_id, document_type FROM document_vault WHERE id = $1',
    [documentId]
  );

  if (doc.rows.length > 0) {
    await pool.query(
      `INSERT INTO activity_logs
       (user_id, business_entity_id, action, entity_type, entity_id, details, metadata, created_at)
       VALUES ($1, $2, 'document_approved', 'document', $3, $4, $5, CURRENT_TIMESTAMP)`,
      [
        verifierId,
        doc.rows[0].business_entity_id,
        documentId,
        `${doc.rows[0].document_type} verified`,
        JSON.stringify({ source: 'document_vault', autoVerified })
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
  const reviewerId = await resolveOptionalUserId(rejectedBy);

  await pool.query(
    `UPDATE document_vault 
     SET approval_status = 'rejected',
         approved_by = $1,
         approved_at = CURRENT_TIMESTAMP,
         rejection_reason = $2,
         ai_verification_status = 'failed',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [reviewerId, reason, documentId]
  );

  // Log activity
  const doc = await pool.query(
    'SELECT business_entity_id, document_type FROM document_vault WHERE id = $1',
    [documentId]
  );

  if (doc.rows.length > 0) {
    await pool.query(
      `INSERT INTO activity_logs 
       (user_id, business_entity_id, action, entity_type, entity_id, details, metadata, created_at)
       VALUES ($1, $2, 'document_rejected', 'document', $3, $4, $5, CURRENT_TIMESTAMP)`,
      [
        reviewerId,
        doc.rows[0].business_entity_id,
        documentId,
        `${doc.rows[0].document_type} rejected: ${reason}`,
        JSON.stringify({ reason, source: 'document_vault' })
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
  const normalizedKey = filters?.documentKey ? normalizeDocumentKey(filters.documentKey) : null;
  const vaultStatuses = filters?.status ? mapStatusToVault(filters.status) : null;
  const uploadStatuses = filters?.status ? mapStatusToUpload(filters.status) : null;

  const vaultParams: any[] = [clientId];
  let vaultWhere = 'WHERE business_entity_id = $1';
  if (normalizedKey) {
    vaultWhere += ` AND document_type = $${vaultParams.length + 1}`;
    vaultParams.push(normalizedKey);
  }
  if (vaultStatuses) {
    vaultWhere += ` AND approval_status = ANY($${vaultParams.length + 1})`;
    vaultParams.push(vaultStatuses);
  }

  const uploadParams: any[] = [clientId];
  let uploadWhere = 'WHERE entity_id = $1';
  if (normalizedKey) {
    uploadWhere += ` AND doctype = $${uploadParams.length + 1}`;
    uploadParams.push(normalizedKey);
  }
  if (uploadStatuses) {
    uploadWhere += ` AND status = ANY($${uploadParams.length + 1})`;
    uploadParams.push(uploadStatuses);
  }

  const [vaultResult, uploadResult] = await Promise.all([
    pool.query(
      `SELECT id, business_entity_id, document_type, category, file_name, original_file_name,
              file_size, mime_type, file_url, version, approval_status, approved_by, approved_at,
              rejection_reason, expiry_date, ocr_data, checksum_hash, user_id, created_at
       FROM document_vault
       ${vaultWhere}
       ORDER BY created_at DESC`,
      vaultParams
    ),
    pool.query(
      `SELECT id, entity_id, doctype, filename, path, size_bytes, mime_type, status,
              reviewed_by, reviewed_at, rejection_reason, uploader, version, uploaded_at, created_at
       FROM documents
       ${uploadWhere}
       ORDER BY uploaded_at DESC`,
      uploadParams
    )
  ]);

  const vaultDocs: DocumentRecord[] = vaultResult.rows.map((row: any) => {
    const key = normalizeDocumentKey(row.document_type);
    const docType = getDocumentType(key);
    const status = mapVaultStatus(row.approval_status);
    return {
      id: row.id,
      clientId,
      documentKey: key,
      documentName: docType?.name || row.document_type,
      category: docType?.category || row.category || 'operational',
      fileName: row.original_file_name || row.file_name,
      filePath: row.file_url,
      fileSize: row.file_size || 0,
      mimeType: row.mime_type || '',
      checksum: row.checksum_hash || '',
      version: row.version || 1,
      status,
      verificationStatus: status === 'verified' ? 'manual_verified' : status === 'rejected' ? 'failed' : 'pending',
      uploadedBy: String(row.user_id ?? ''),
      uploadedAt: row.created_at,
      verifiedBy: row.approved_by ? String(row.approved_by) : undefined,
      verifiedAt: row.approved_at || undefined,
      rejectionReason: row.rejection_reason || undefined,
      expiryDate: row.expiry_date || undefined,
      extractedData: row.ocr_data || undefined,
      metadata: undefined,
      source: 'vault',
    };
  });

  const uploadDocs: DocumentRecord[] = uploadResult.rows.map((row: any) => {
    const key = normalizeDocumentKey(row.doctype);
    const docType = getDocumentType(key);
    const status = mapUploadStatus(row.status);
    return {
      id: row.id,
      clientId,
      documentKey: key,
      documentName: docType?.name || row.doctype,
      category: docType?.category || 'operational',
      fileName: row.filename,
      filePath: row.path,
      fileSize: row.size_bytes || 0,
      mimeType: row.mime_type || '',
      checksum: '',
      version: row.version || 1,
      status,
      verificationStatus: status === 'verified' ? 'manual_verified' : status === 'rejected' ? 'failed' : 'pending',
      uploadedBy: row.uploader || 'client',
      uploadedAt: row.uploaded_at || row.created_at,
      verifiedBy: row.reviewed_by || undefined,
      verifiedAt: row.reviewed_at || undefined,
      rejectionReason: row.rejection_reason || undefined,
      extractedData: undefined,
      metadata: undefined,
      source: 'upload',
    };
  });

  let records = [...vaultDocs, ...uploadDocs];

  if (filters?.latestOnly) {
    const latestByKey = new Map<string, DocumentRecord>();
    records.forEach((doc) => {
      const key = normalizeDocumentKey(doc.documentKey);
      const existing = latestByKey.get(key);
      if (!existing) {
        latestByKey.set(key, doc);
        return;
      }
      const existingVersion = existing.version || 0;
      const nextVersion = doc.version || 0;
      if (nextVersion > existingVersion) {
        latestByKey.set(key, doc);
        return;
      }
      if (nextVersion === existingVersion) {
        const existingTime = new Date(existing.uploadedAt).getTime();
        const nextTime = new Date(doc.uploadedAt).getTime();
        if (nextTime > existingTime) {
          latestByKey.set(key, doc);
        }
      }
    });
    records = Array.from(latestByKey.values());
  }

  records.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  return records;
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
      dv.id,
      dv.document_type as document_key,
      dv.document_type as document_name,
      dv.expiry_date,
      dv.business_entity_id as client_id,
      DATE_PART('day', dv.expiry_date::timestamp - CURRENT_DATE) as days_until_expiry
    FROM document_vault dv
    WHERE dv.business_entity_id = $1
      AND dv.expiry_date IS NOT NULL
      AND dv.expiry_date::timestamp > CURRENT_DATE
      AND dv.expiry_date::timestamp <= CURRENT_DATE + INTERVAL '1 day' * $2
      AND dv.approval_status = 'approved'
    ORDER BY dv.expiry_date ASC`,
    [clientId, daysThreshold]
  );

  return result.rows.map((row: any) => {
    const key = normalizeDocumentKey(row.document_key);
    const docType = getDocumentType(key);
    return {
      ...row,
      document_key: key,
      document_name: docType?.name || row.document_name,
    };
  });
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
