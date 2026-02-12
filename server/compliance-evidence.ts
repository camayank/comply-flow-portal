import { db } from './db';
import {
  complianceRequiredDocuments,
  complianceRules,
  documentVault,
  documentsUploads
} from '@shared/schema';
import { eq } from 'drizzle-orm';
import { inArray } from 'drizzle-orm';
import { getComplianceByCode } from './compliance-knowledge-base';

export interface EvidenceDocument {
  documentType: string;
  documentName: string;
  isMandatory: boolean | null;
}

export interface EvidenceStatus {
  requiredDocuments: EvidenceDocument[];
  missingDocuments: EvidenceDocument[];
  uploadedDocumentTypes: string[];
}

const normalizeDocumentType = (value: string) => value.trim().toLowerCase();

const toDocumentType = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

export async function ensureRequiredDocumentsForRuleIds(ruleIds: number[]): Promise<void> {
  if (ruleIds.length === 0) return;

  const existing = await db
    .select({
      complianceRuleId: complianceRequiredDocuments.complianceRuleId,
    })
    .from(complianceRequiredDocuments)
    .where(inArray(complianceRequiredDocuments.complianceRuleId, ruleIds));

  const existingRuleIds = new Set(existing.map(doc => doc.complianceRuleId));
  const missingRuleIds = ruleIds.filter(ruleId => !existingRuleIds.has(ruleId));

  if (missingRuleIds.length === 0) return;

  const rules = await db
    .select({
      id: complianceRules.id,
      ruleCode: complianceRules.ruleCode,
    })
    .from(complianceRules)
    .where(inArray(complianceRules.id, missingRuleIds));

  const inserts: {
    complianceRuleId: number;
    documentType: string;
    documentName: string;
    isMandatory: boolean;
    order: number;
  }[] = [];

  rules.forEach(rule => {
    const kbRule = getComplianceByCode(rule.ruleCode);
    if (!kbRule?.requiredDocuments?.length) return;

    kbRule.requiredDocuments.forEach((docName: string, index: number) => {
      inserts.push({
        complianceRuleId: rule.id,
        documentType: toDocumentType(docName),
        documentName: docName,
        isMandatory: true,
        order: index + 1,
      });
    });
  });

  if (inserts.length > 0) {
    await db.insert(complianceRequiredDocuments).values(inserts);
  }
}

export async function getEvidenceStatusForRule(
  entityId: number,
  complianceRuleId: number | null
): Promise<EvidenceStatus> {
  if (!complianceRuleId) {
    return { requiredDocuments: [], missingDocuments: [], uploadedDocumentTypes: [] };
  }

  await ensureRequiredDocumentsForRuleIds([complianceRuleId]);

  const requiredDocuments = await db
    .select({
      documentType: complianceRequiredDocuments.documentType,
      documentName: complianceRequiredDocuments.documentName,
      isMandatory: complianceRequiredDocuments.isMandatory,
    })
    .from(complianceRequiredDocuments)
    .where(eq(complianceRequiredDocuments.complianceRuleId, complianceRuleId));

  if (requiredDocuments.length === 0) {
    return { requiredDocuments: [], missingDocuments: [], uploadedDocumentTypes: [] };
  }

  const vaultDocs = await db
    .select({
      documentType: documentVault.documentType,
      approvalStatus: documentVault.approvalStatus,
    })
    .from(documentVault)
    .where(eq(documentVault.businessEntityId, entityId));

  const uploadDocs = await db
    .select({
      documentType: documentsUploads.doctype,
      status: documentsUploads.status,
    })
    .from(documentsUploads)
    .where(eq(documentsUploads.entityId, entityId));

  const uploadedTypes = new Set<string>();

  vaultDocs.forEach(doc => {
    if (!doc.documentType) return;
    if (doc.approvalStatus !== 'approved') return;
    uploadedTypes.add(normalizeDocumentType(doc.documentType));
  });

  uploadDocs.forEach(doc => {
    if (!doc.documentType) return;
    if (doc.status !== 'approved') return;
    uploadedTypes.add(normalizeDocumentType(doc.documentType));
  });

  const missingDocuments = requiredDocuments.filter(doc => {
    if (doc.isMandatory === false) return false;
    return !uploadedTypes.has(normalizeDocumentType(doc.documentType));
  });

  return {
    requiredDocuments,
    missingDocuments,
    uploadedDocumentTypes: Array.from(uploadedTypes),
  };
}

export async function getEvidenceSummaries(
  items: { entityId: number | null; complianceRuleId: number | null }[]
): Promise<Map<string, EvidenceStatus & { evidenceSummary: { required: number; uploaded: number; missing: number } }>> {
  const ruleIds = Array.from(
    new Set(items.map(item => item.complianceRuleId).filter((id): id is number => typeof id === 'number'))
  );
  const entityIds = Array.from(
    new Set(items.map(item => item.entityId).filter((id): id is number => typeof id === 'number'))
  );

  if (ruleIds.length === 0 || entityIds.length === 0) {
    return new Map();
  }

  await ensureRequiredDocumentsForRuleIds(ruleIds);

  const requiredDocs = await db
    .select({
      complianceRuleId: complianceRequiredDocuments.complianceRuleId,
      documentType: complianceRequiredDocuments.documentType,
      documentName: complianceRequiredDocuments.documentName,
      isMandatory: complianceRequiredDocuments.isMandatory,
    })
    .from(complianceRequiredDocuments)
    .where(inArray(complianceRequiredDocuments.complianceRuleId, ruleIds));

  const docsByRule = new Map<number, EvidenceDocument[]>();
  requiredDocs.forEach(doc => {
    const list = docsByRule.get(doc.complianceRuleId) || [];
    list.push({
      documentType: doc.documentType,
      documentName: doc.documentName,
      isMandatory: doc.isMandatory,
    });
    docsByRule.set(doc.complianceRuleId, list);
  });

  const vaultDocs = await db
    .select({
      businessEntityId: documentVault.businessEntityId,
      documentType: documentVault.documentType,
      approvalStatus: documentVault.approvalStatus,
    })
    .from(documentVault)
    .where(inArray(documentVault.businessEntityId, entityIds));

  const uploadDocs = await db
    .select({
      entityId: documentsUploads.entityId,
      documentType: documentsUploads.doctype,
      status: documentsUploads.status,
    })
    .from(documentsUploads)
    .where(inArray(documentsUploads.entityId, entityIds));

  const docsByEntity = new Map<number, Set<string>>();

  vaultDocs.forEach(doc => {
    if (!doc.businessEntityId || !doc.documentType) return;
    if (doc.approvalStatus !== 'approved') return;
    const set = docsByEntity.get(doc.businessEntityId) || new Set<string>();
    set.add(normalizeDocumentType(doc.documentType));
    docsByEntity.set(doc.businessEntityId, set);
  });

  uploadDocs.forEach(doc => {
    if (!doc.entityId || !doc.documentType) return;
    if (doc.status !== 'approved') return;
    const set = docsByEntity.get(doc.entityId) || new Set<string>();
    set.add(normalizeDocumentType(doc.documentType));
    docsByEntity.set(doc.entityId, set);
  });

  const result = new Map<string, EvidenceStatus & { evidenceSummary: { required: number; uploaded: number; missing: number } }>();

  items.forEach(item => {
    if (!item.entityId || !item.complianceRuleId) return;
    const required = docsByRule.get(item.complianceRuleId) || [];
    const uploaded = docsByEntity.get(item.entityId) || new Set<string>();
    const missing = required.filter(doc => {
      if (doc.isMandatory === false) return false;
      return !uploaded.has(normalizeDocumentType(doc.documentType));
    });

    result.set(`${item.entityId}:${item.complianceRuleId}`, {
      requiredDocuments: required,
      missingDocuments: missing,
      uploadedDocumentTypes: Array.from(uploaded),
      evidenceSummary: {
        required: required.length,
        uploaded: Math.max(0, required.length - missing.length),
        missing: missing.length,
      },
    });
  });

  return result;
}
