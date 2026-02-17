/**
 * Agent KYC Database Schema
 *
 * Tables for agent KYC documents, verification, and status tracking
 */

import { pgTable, serial, integer, varchar, text, boolean, timestamp, date, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users';

// ============================================
// DOCUMENTS TABLE (Shared across all modules)
// ============================================
export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),

  // File info
  fileName: varchar('file_name', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }),
  mimeType: varchar('mime_type', { length: 100 }),
  fileSize: integer('file_size'), // in bytes
  checksum: varchar('checksum', { length: 64 }), // SHA256 hash

  // Storage info
  storagePath: varchar('storage_path', { length: 500 }).notNull(),
  storageProvider: varchar('storage_provider', { length: 20 }).default('local'), // local, gcs, s3
  storageBucket: varchar('storage_bucket', { length: 255 }),

  // Categorization
  category: varchar('category', { length: 50 }).notNull(), // kyc, service_doc, deliverable, invoice, contract
  subcategory: varchar('subcategory', { length: 50 }), // pan, aadhaar, gst_certificate, etc.

  // Entity reference
  entityType: varchar('entity_type', { length: 50 }), // agent, client, service_request, business_entity
  entityId: integer('entity_id'),

  // Upload info
  uploadedBy: integer('uploaded_by').references(() => users.id),

  // Status
  status: varchar('status', { length: 20 }).default('active'), // active, archived, deleted
  isPublic: boolean('is_public').default(false),

  // Soft delete
  isDeleted: boolean('is_deleted').default(false),
  deletedAt: timestamp('deleted_at'),
  deletedBy: integer('deleted_by').references(() => users.id),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  entityIdx: index('idx_documents_entity').on(table.entityType, table.entityId),
  categoryIdx: index('idx_documents_category').on(table.category),
  uploadedByIdx: index('idx_documents_uploaded_by').on(table.uploadedBy),
}));

// ============================================
// AGENT KYC STATUS TABLE
// ============================================
export const agentKycStatus = pgTable('agent_kyc_status', {
  id: serial('id').primaryKey(),
  agentId: integer('agent_id').references(() => users.id).unique().notNull(),

  // Overall status
  overallStatus: varchar('overall_status', { length: 20 }).default('not_started'),
  // not_started, documents_pending, under_review, approved, rejected, expired

  // Document completion tracking
  documentsSubmitted: integer('documents_submitted').default(0),
  documentsRequired: integer('documents_required').default(4), // PAN, Aadhaar, Bank, Address
  documentsApproved: integer('documents_approved').default(0),
  documentsRejected: integer('documents_rejected').default(0),

  // Workflow tracking
  submittedAt: timestamp('submitted_at'),
  reviewStartedAt: timestamp('review_started_at'),
  reviewedAt: timestamp('reviewed_at'),
  reviewedBy: integer('reviewed_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  approvedBy: integer('approved_by').references(() => users.id),
  rejectedAt: timestamp('rejected_at'),
  rejectedBy: integer('rejected_by').references(() => users.id),

  // Expiry tracking
  expiresAt: timestamp('expires_at'),
  lastRenewalAt: timestamp('last_renewal_at'),

  // Notes
  internalNotes: text('internal_notes'),
  rejectionReason: text('rejection_reason'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================
// AGENT KYC DOCUMENTS TABLE
// ============================================
export const agentKycDocuments = pgTable('agent_kyc_documents', {
  id: serial('id').primaryKey(),
  agentId: integer('agent_id').references(() => users.id).notNull(),

  // Document type
  documentType: varchar('document_type', { length: 50 }).notNull(),
  // pan, aadhaar, bank_statement, cancelled_cheque, address_proof, photo, signature

  // Link to actual document
  documentId: integer('document_id').references(() => documents.id),

  // Extracted/entered info (encrypted in sensitive cases)
  documentNumber: varchar('document_number', { length: 255 }), // Encrypted PAN, Aadhaar, etc.
  documentName: varchar('document_name', { length: 255 }), // Name on document
  additionalInfo: jsonb('additional_info'), // Bank account number, IFSC, etc.

  // Verification
  verificationStatus: varchar('verification_status', { length: 20 }).default('pending'),
  // pending, auto_verified, manual_review, verified, rejected

  // OCR/AI verification results
  ocrConfidence: integer('ocr_confidence'), // 0-100
  ocrExtractedData: jsonb('ocr_extracted_data'),
  aiVerificationResult: jsonb('ai_verification_result'),

  // Manual verification
  verifiedBy: integer('verified_by').references(() => users.id),
  verifiedAt: timestamp('verified_at'),
  verificationNotes: text('verification_notes'),
  rejectionReason: text('rejection_reason'),

  // Document validity
  issueDate: date('issue_date'),
  expiryDate: date('expiry_date'),
  isExpired: boolean('is_expired').default(false),

  // Version tracking (for resubmissions)
  version: integer('version').default(1),
  previousVersionId: integer('previous_version_id'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  agentIdIdx: index('idx_agent_kyc_docs_agent_id').on(table.agentId),
  documentTypeIdx: index('idx_agent_kyc_docs_type').on(table.documentType),
  statusIdx: index('idx_agent_kyc_docs_status').on(table.verificationStatus),
}));

// ============================================
// KYC VERIFICATION LOG TABLE
// ============================================
export const kycVerificationLog = pgTable('kyc_verification_log', {
  id: serial('id').primaryKey(),
  kycDocumentId: integer('kyc_document_id').references(() => agentKycDocuments.id).notNull(),

  // Action
  action: varchar('action', { length: 30 }).notNull(),
  // submitted, auto_verified, sent_for_review, approved, rejected, resubmit_requested

  // Actor
  performedBy: integer('performed_by').references(() => users.id),
  performedByRole: varchar('performed_by_role', { length: 30 }),

  // Before/After status
  previousStatus: varchar('previous_status', { length: 20 }),
  newStatus: varchar('new_status', { length: 20 }),

  // Details
  notes: text('notes'),
  metadata: jsonb('metadata'),

  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  kycDocumentIdIdx: index('idx_kyc_log_document_id').on(table.kycDocumentId),
}));

// Type exports
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type AgentKycStatus = typeof agentKycStatus.$inferSelect;
export type NewAgentKycStatus = typeof agentKycStatus.$inferInsert;
export type AgentKycDocument = typeof agentKycDocuments.$inferSelect;
export type NewAgentKycDocument = typeof agentKycDocuments.$inferInsert;
export type KycVerificationLog = typeof kycVerificationLog.$inferSelect;
