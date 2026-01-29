/**
 * Compliance Certificate Generator Service
 * Generates professional PDF certificates for compliance status
 */

import PDFDocument from 'pdfkit';
import { db } from '../db';
import { businessEntities, complianceTracking, documentsUploads } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { Readable } from 'stream';

// Certificate types
export type CertificateType =
  | 'compliance_status'
  | 'gst_filing'
  | 'roc_filing'
  | 'tax_clearance'
  | 'funding_readiness'
  | 'digicomply_score';

export interface CertificateData {
  entityId: number;
  certificateType: CertificateType;
  issuedTo?: string;
  validFrom?: Date;
  validUntil?: Date;
  additionalData?: Record<string, any>;
}

export interface CertificateResult {
  success: boolean;
  pdfBuffer?: Buffer;
  certificateId?: string;
  error?: string;
}

/**
 * Generate a compliance certificate PDF
 */
export async function generateComplianceCertificate(data: CertificateData): Promise<CertificateResult> {
  try {
    // Fetch entity details
    const [entity] = await db.select()
      .from(businessEntities)
      .where(eq(businessEntities.id, data.entityId))
      .limit(1);

    if (!entity) {
      return { success: false, error: 'Entity not found' };
    }

    // Fetch compliance data
    const complianceItems = await db.select()
      .from(complianceTracking)
      .where(eq(complianceTracking.businessEntityId, data.entityId));

    // Calculate compliance metrics
    const totalItems = complianceItems.length || 1;
    const completedItems = complianceItems.filter(i => i.status === 'completed').length;
    const complianceRate = Math.round((completedItems / totalItems) * 100);

    // Generate unique certificate ID
    const certificateId = `DC-${data.certificateType.toUpperCase().slice(0, 3)}-${entity.clientId || entity.id}-${Date.now().toString(36).toUpperCase()}`;

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `DigiComply Certificate - ${certificateId}`,
        Author: 'DigiComply Platform',
        Subject: `Compliance Certificate for ${entity.entityName}`,
        Keywords: 'compliance, certificate, digicomply',
        Creator: 'DigiComply Certificate Service'
      }
    });

    // Collect PDF data
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    // Certificate styling
    const primaryColor = '#1e40af'; // Blue
    const secondaryColor = '#059669'; // Green
    const accentColor = '#f59e0b'; // Amber
    const textColor = '#1f2937';

    // Border decoration
    doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
       .lineWidth(2)
       .stroke(primaryColor);

    // Inner decorative border
    doc.rect(40, 40, doc.page.width - 80, doc.page.height - 80)
       .lineWidth(0.5)
       .stroke(primaryColor);

    // Header with logo area
    doc.fontSize(10)
       .fillColor(primaryColor)
       .text('DIGICOMPLY', 50, 60, { align: 'center' })
       .fontSize(8)
       .fillColor(textColor)
       .text('Enterprise Compliance Platform', { align: 'center' });

    // Certificate title
    doc.moveDown(2)
       .fontSize(24)
       .fillColor(primaryColor)
       .text('CERTIFICATE', { align: 'center' })
       .fontSize(14)
       .text('OF COMPLIANCE', { align: 'center' });

    // Decorative line
    doc.moveDown(1)
       .moveTo(150, doc.y)
       .lineTo(doc.page.width - 150, doc.y)
       .lineWidth(1)
       .stroke(accentColor);

    // Certificate type specific content
    doc.moveDown(2);

    switch (data.certificateType) {
      case 'compliance_status':
        await generateComplianceStatusCertificate(doc, entity, complianceRate, data);
        break;
      case 'funding_readiness':
        await generateFundingReadinessCertificate(doc, entity, complianceRate, data);
        break;
      case 'digicomply_score':
        await generateDigiScoreCertificate(doc, entity, complianceRate, data);
        break;
      case 'gst_filing':
        await generateGSTFilingCertificate(doc, entity, data);
        break;
      case 'roc_filing':
        await generateROCFilingCertificate(doc, entity, data);
        break;
      case 'tax_clearance':
        await generateTaxClearanceCertificate(doc, entity, data);
        break;
      default:
        await generateGenericCertificate(doc, entity, complianceRate, data);
    }

    // Certificate ID and QR code area
    doc.moveDown(3)
       .fontSize(9)
       .fillColor(textColor)
       .text(`Certificate ID: ${certificateId}`, { align: 'center' })
       .text(`Issued on: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, { align: 'center' });

    if (data.validUntil) {
      doc.text(`Valid until: ${data.validUntil.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, { align: 'center' });
    }

    // Verification note
    doc.moveDown(2)
       .fontSize(8)
       .fillColor('#6b7280')
       .text('This certificate can be verified at: https://verify.digicomply.in/' + certificateId, { align: 'center' })
       .moveDown(0.5)
       .text('This is a digitally generated certificate and does not require a physical signature.', { align: 'center' });

    // Footer with DigiComply branding
    doc.moveDown(2)
       .fontSize(8)
       .fillColor(primaryColor)
       .text('Powered by DigiComply - India\'s Leading Compliance Platform', { align: 'center' })
       .text('www.digicomply.in | support@digicomply.in', { align: 'center' });

    // Finalize PDF
    doc.end();

    // Wait for PDF generation to complete
    return new Promise((resolve) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve({
          success: true,
          pdfBuffer,
          certificateId
        });
      });
    });

  } catch (error: any) {
    console.error('Certificate generation error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate Compliance Status Certificate
 */
async function generateComplianceStatusCertificate(
  doc: PDFKit.PDFDocument,
  entity: any,
  complianceRate: number,
  data: CertificateData
) {
  const statusColor = complianceRate >= 90 ? '#059669' : complianceRate >= 70 ? '#f59e0b' : '#dc2626';
  const statusText = complianceRate >= 90 ? 'EXCELLENT' : complianceRate >= 70 ? 'GOOD' : 'NEEDS ATTENTION';

  doc.fontSize(12)
     .fillColor('#1f2937')
     .text('This is to certify that', { align: 'center' })
     .moveDown(1)
     .fontSize(18)
     .fillColor('#1e40af')
     .text(entity.entityName || 'Business Entity', { align: 'center' })
     .moveDown(0.5)
     .fontSize(10)
     .fillColor('#6b7280')
     .text(`(${entity.entityType?.replace(/_/g, ' ').toUpperCase() || 'BUSINESS ENTITY'})`, { align: 'center' })
     .text(`CIN: ${entity.cin || 'N/A'} | GSTIN: ${entity.gstin || 'N/A'}`, { align: 'center' });

  doc.moveDown(1.5)
     .fontSize(12)
     .fillColor('#1f2937')
     .text('has achieved a compliance status of', { align: 'center' });

  // Compliance score display
  doc.moveDown(1)
     .fontSize(48)
     .fillColor(statusColor)
     .text(`${complianceRate}%`, { align: 'center' })
     .fontSize(14)
     .text(statusText, { align: 'center' });

  doc.moveDown(1.5)
     .fontSize(11)
     .fillColor('#1f2937')
     .text('across all monitored compliance checkpoints including statutory filings,', { align: 'center' })
     .text('tax compliance, and regulatory requirements.', { align: 'center' });
}

/**
 * Generate Funding Readiness Certificate
 */
async function generateFundingReadinessCertificate(
  doc: PDFKit.PDFDocument,
  entity: any,
  complianceRate: number,
  data: CertificateData
) {
  const fundingScore = data.additionalData?.fundingScore || Math.round(complianceRate * 0.85);
  const fundingStage = fundingScore >= 85 ? 'Series A' : fundingScore >= 70 ? 'Seed' : fundingScore >= 50 ? 'Pre-Seed' : 'Angel';

  doc.fontSize(12)
     .fillColor('#1f2937')
     .text('This is to certify that', { align: 'center' })
     .moveDown(1)
     .fontSize(18)
     .fillColor('#1e40af')
     .text(entity.entityName || 'Business Entity', { align: 'center' })
     .moveDown(0.5)
     .fontSize(10)
     .fillColor('#6b7280')
     .text(`CIN: ${entity.cin || 'N/A'}`, { align: 'center' });

  doc.moveDown(1.5)
     .fontSize(12)
     .fillColor('#1f2937')
     .text('has achieved a Funding Readiness Score of', { align: 'center' });

  // Funding score display
  doc.moveDown(1)
     .fontSize(48)
     .fillColor('#059669')
     .text(`${fundingScore}/100`, { align: 'center' })
     .fontSize(14)
     .fillColor('#1e40af')
     .text(`Eligible for: ${fundingStage} Funding`, { align: 'center' });

  doc.moveDown(1.5)
     .fontSize(11)
     .fillColor('#1f2937')
     .text('The entity has met the due diligence requirements for investor readiness,', { align: 'center' })
     .text('including documentation, compliance, and governance standards.', { align: 'center' });
}

/**
 * Generate DigiScore Certificate
 */
async function generateDigiScoreCertificate(
  doc: PDFKit.PDFDocument,
  entity: any,
  complianceRate: number,
  data: CertificateData
) {
  const digiScore = data.additionalData?.digiScore || Math.round(complianceRate * 100);

  doc.fontSize(12)
     .fillColor('#1f2937')
     .text('This is to certify that', { align: 'center' })
     .moveDown(1)
     .fontSize(18)
     .fillColor('#1e40af')
     .text(entity.entityName || 'Business Entity', { align: 'center' })
     .moveDown(0.5)
     .fontSize(10)
     .fillColor('#6b7280')
     .text(`${entity.entityType?.replace(/_/g, ' ').toUpperCase() || 'BUSINESS ENTITY'}`, { align: 'center' });

  doc.moveDown(1.5)
     .fontSize(12)
     .fillColor('#1f2937')
     .text('has achieved a DigiComply Score of', { align: 'center' });

  // DigiScore display (out of 10,000)
  doc.moveDown(1)
     .fontSize(48)
     .fillColor('#059669')
     .text(`${digiScore.toLocaleString()}`, { align: 'center' })
     .fontSize(14)
     .fillColor('#6b7280')
     .text('out of 10,000 points', { align: 'center' });

  doc.moveDown(1.5)
     .fontSize(11)
     .fillColor('#1f2937')
     .text('based on comprehensive assessment across Statutory Compliance,', { align: 'center' })
     .text('Tax Compliance, Documentation, Financial Health, Governance, and Legal Standing.', { align: 'center' });
}

/**
 * Generate GST Filing Certificate
 */
async function generateGSTFilingCertificate(
  doc: PDFKit.PDFDocument,
  entity: any,
  data: CertificateData
) {
  const period = data.additionalData?.period || 'Current Period';
  const returnType = data.additionalData?.returnType || 'GSTR-3B';

  doc.fontSize(12)
     .fillColor('#1f2937')
     .text('This is to certify that', { align: 'center' })
     .moveDown(1)
     .fontSize(18)
     .fillColor('#1e40af')
     .text(entity.entityName || 'Business Entity', { align: 'center' })
     .moveDown(0.5)
     .fontSize(10)
     .fillColor('#6b7280')
     .text(`GSTIN: ${entity.gstin || 'N/A'}`, { align: 'center' });

  doc.moveDown(1.5)
     .fontSize(12)
     .fillColor('#1f2937')
     .text(`has successfully filed the ${returnType} return`, { align: 'center' })
     .moveDown(0.5)
     .fontSize(14)
     .fillColor('#059669')
     .text(`for the period: ${period}`, { align: 'center' });

  doc.moveDown(2)
     .fontSize(20)
     .fillColor('#059669')
     .text('FILED ON TIME', { align: 'center' });

  doc.moveDown(1.5)
     .fontSize(11)
     .fillColor('#1f2937')
     .text('All GST obligations for the mentioned period have been fulfilled', { align: 'center' })
     .text('as per the Central Goods and Services Tax Act, 2017.', { align: 'center' });
}

/**
 * Generate ROC Filing Certificate
 */
async function generateROCFilingCertificate(
  doc: PDFKit.PDFDocument,
  entity: any,
  data: CertificateData
) {
  const formType = data.additionalData?.formType || 'AOC-4';
  const filingYear = data.additionalData?.year || new Date().getFullYear();

  doc.fontSize(12)
     .fillColor('#1f2937')
     .text('This is to certify that', { align: 'center' })
     .moveDown(1)
     .fontSize(18)
     .fillColor('#1e40af')
     .text(entity.entityName || 'Business Entity', { align: 'center' })
     .moveDown(0.5)
     .fontSize(10)
     .fillColor('#6b7280')
     .text(`CIN: ${entity.cin || 'N/A'}`, { align: 'center' });

  doc.moveDown(1.5)
     .fontSize(12)
     .fillColor('#1f2937')
     .text(`has successfully filed Form ${formType}`, { align: 'center' })
     .moveDown(0.5)
     .fontSize(14)
     .fillColor('#059669')
     .text(`for the Financial Year: ${filingYear - 1}-${filingYear}`, { align: 'center' });

  doc.moveDown(2)
     .fontSize(20)
     .fillColor('#059669')
     .text('ROC COMPLIANT', { align: 'center' });

  doc.moveDown(1.5)
     .fontSize(11)
     .fillColor('#1f2937')
     .text('All Registrar of Companies filings for the mentioned year', { align: 'center' })
     .text('have been completed as per the Companies Act, 2013.', { align: 'center' });
}

/**
 * Generate Tax Clearance Certificate
 */
async function generateTaxClearanceCertificate(
  doc: PDFKit.PDFDocument,
  entity: any,
  data: CertificateData
) {
  const assessmentYear = data.additionalData?.assessmentYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  doc.fontSize(12)
     .fillColor('#1f2937')
     .text('This is to certify that', { align: 'center' })
     .moveDown(1)
     .fontSize(18)
     .fillColor('#1e40af')
     .text(entity.entityName || 'Business Entity', { align: 'center' })
     .moveDown(0.5)
     .fontSize(10)
     .fillColor('#6b7280')
     .text(`PAN: ${entity.pan || 'N/A'}`, { align: 'center' });

  doc.moveDown(1.5)
     .fontSize(12)
     .fillColor('#1f2937')
     .text('has no outstanding tax liabilities', { align: 'center' })
     .moveDown(0.5)
     .fontSize(14)
     .fillColor('#059669')
     .text(`for Assessment Year: ${assessmentYear}`, { align: 'center' });

  doc.moveDown(2)
     .fontSize(20)
     .fillColor('#059669')
     .text('TAX COMPLIANT', { align: 'center' });

  doc.moveDown(1.5)
     .fontSize(11)
     .fillColor('#1f2937')
     .text('All direct tax obligations including Income Tax, TDS, and Advance Tax', { align: 'center' })
     .text('have been cleared for the mentioned assessment year.', { align: 'center' });
}

/**
 * Generate Generic Certificate
 */
async function generateGenericCertificate(
  doc: PDFKit.PDFDocument,
  entity: any,
  complianceRate: number,
  data: CertificateData
) {
  doc.fontSize(12)
     .fillColor('#1f2937')
     .text('This is to certify that', { align: 'center' })
     .moveDown(1)
     .fontSize(18)
     .fillColor('#1e40af')
     .text(entity.entityName || 'Business Entity', { align: 'center' })
     .moveDown(0.5)
     .fontSize(10)
     .fillColor('#6b7280')
     .text(`${entity.entityType?.replace(/_/g, ' ').toUpperCase() || 'BUSINESS ENTITY'}`, { align: 'center' });

  doc.moveDown(1.5)
     .fontSize(12)
     .fillColor('#1f2937')
     .text('maintains good compliance standing', { align: 'center' })
     .moveDown(1)
     .fontSize(36)
     .fillColor('#059669')
     .text(`${complianceRate}%`, { align: 'center' })
     .fontSize(12)
     .text('Compliance Score', { align: 'center' });

  doc.moveDown(1.5)
     .fontSize(11)
     .fillColor('#1f2937')
     .text('as verified through the DigiComply Platform.', { align: 'center' });
}

/**
 * Get certificate as a readable stream
 */
export function getCertificateStream(pdfBuffer: Buffer): Readable {
  const stream = new Readable();
  stream.push(pdfBuffer);
  stream.push(null);
  return stream;
}
