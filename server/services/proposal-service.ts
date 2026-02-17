/**
 * Proposal Service
 * Handles PDF generation, email sending, and tracking for sales proposals
 */
import PDFDocument from 'pdfkit';
import { storage } from '../storage';
import { logger } from '../logger';
import { EmailService } from './notifications/channels/email.service';

const emailService = new EmailService();

interface ProposalItem {
  name?: string;
  description?: string;
  quantity?: number;
  rate?: number;
  amount?: number;
}

class ProposalService {
  /**
   * Generate PDF for a proposal
   */
  async generatePDF(proposalId: number): Promise<Buffer> {
    const proposal = await storage.getProposal(proposalId);

    if (!proposal) {
      throw new Error('Proposal not found');
    }

    // Get associated lead for additional details
    let lead = null;
    if (proposal.leadId) {
      lead = await storage.getLeadByLeadId(proposal.leadId);
    }

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ margin: 50, size: 'A4' });

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header with branding
      doc.fontSize(28).fillColor('#1e3a5f').text('DigiComply', { align: 'center' });
      doc.fontSize(10).fillColor('#666').text('Your Compliance Partner', { align: 'center' });
      doc.moveDown(0.5);

      // Horizontal line
      doc.strokeColor('#1e3a5f').lineWidth(2)
        .moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown();

      // Title
      doc.fontSize(20).fillColor('#000').text('SERVICE PROPOSAL', { align: 'center' });
      doc.moveDown();

      // Proposal metadata box
      const metaY = doc.y;
      doc.rect(50, metaY, 495, 60).fillColor('#f8fafc').fill();
      doc.fillColor('#000').fontSize(10);
      doc.text(`Proposal #: PRO-${String(proposal.id).padStart(5, '0')}`, 60, metaY + 10);
      doc.text(`Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, 60, metaY + 25);
      doc.text(`Sales Executive: ${proposal.salesExecutive || 'N/A'}`, 60, metaY + 40);

      doc.text(`Lead ID: ${proposal.leadId || 'N/A'}`, 300, metaY + 10);
      doc.text(`Status: ${(proposal.proposalStatus || 'draft').toUpperCase()}`, 300, metaY + 25);
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);
      doc.text(`Valid Until: ${validUntil.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, 300, metaY + 40);

      doc.y = metaY + 75;

      // Client details section
      doc.fontSize(14).fillColor('#1e3a5f').text('Prepared For:', 50);
      doc.moveDown(0.3);
      doc.fontSize(12).fillColor('#000');

      const clientName = (proposal as any).clientName || lead?.contactPerson || lead?.companyName || 'Valued Client';
      const clientEmail = (proposal as any).email || lead?.email || '';
      const clientPhone = (proposal as any).phone || lead?.phone || '';
      const companyName = (proposal as any).companyName || lead?.companyName || '';

      doc.text(clientName);
      if (companyName && companyName !== clientName) {
        doc.text(companyName);
      }
      if (clientEmail) doc.text(clientEmail);
      if (clientPhone) doc.text(clientPhone);
      doc.moveDown();

      // Services section
      doc.fontSize(14).fillColor('#1e3a5f').text('Proposed Services', 50);
      doc.moveDown(0.5);

      // Parse required services
      let services: ProposalItem[] = [];
      if (proposal.requiredServices) {
        if (typeof proposal.requiredServices === 'string') {
          try {
            services = JSON.parse(proposal.requiredServices);
          } catch {
            services = [];
          }
        } else if (Array.isArray(proposal.requiredServices)) {
          services = proposal.requiredServices as ProposalItem[];
        }
      }

      // Services table
      const tableTop = doc.y;
      const colWidths = { desc: 250, qty: 50, rate: 100, amount: 95 };

      // Table header
      doc.rect(50, tableTop, 495, 25).fillColor('#1e3a5f').fill();
      doc.fillColor('#fff').fontSize(10);
      doc.text('Description', 60, tableTop + 8);
      doc.text('Qty', 320, tableTop + 8, { width: colWidths.qty, align: 'center' });
      doc.text('Rate', 380, tableTop + 8, { width: colWidths.rate, align: 'right' });
      doc.text('Amount', 450, tableTop + 8, { width: colWidths.amount, align: 'right' });

      let currentY = tableTop + 25;
      let subtotal = 0;

      doc.fillColor('#000').fontSize(10);

      if (services.length > 0) {
        services.forEach((service, index) => {
          // Alternate row background
          if (index % 2 === 0) {
            doc.rect(50, currentY, 495, 25).fillColor('#f8fafc').fill();
          }

          const serviceName = service.description || service.name || 'Service';
          const qty = service.quantity || 1;
          const rate = service.rate || service.amount || 0;
          const amount = qty * rate;
          subtotal += amount;

          doc.fillColor('#000');
          doc.text(serviceName, 60, currentY + 8, { width: colWidths.desc });
          doc.text(String(qty), 320, currentY + 8, { width: colWidths.qty, align: 'center' });
          doc.text(`Rs ${rate.toLocaleString('en-IN')}`, 380, currentY + 8, { width: colWidths.rate, align: 'right' });
          doc.text(`Rs ${amount.toLocaleString('en-IN')}`, 450, currentY + 8, { width: colWidths.amount, align: 'right' });

          currentY += 25;
        });
      } else {
        // No services listed, use proposal amount
        subtotal = Number(proposal.proposalAmount) || 0;
        doc.rect(50, currentY, 495, 25).fillColor('#f8fafc').fill();
        doc.fillColor('#000');
        doc.text('Compliance Services Package', 60, currentY + 8, { width: colWidths.desc });
        doc.text('1', 320, currentY + 8, { width: colWidths.qty, align: 'center' });
        doc.text(`Rs ${subtotal.toLocaleString('en-IN')}`, 380, currentY + 8, { width: colWidths.rate, align: 'right' });
        doc.text(`Rs ${subtotal.toLocaleString('en-IN')}`, 450, currentY + 8, { width: colWidths.amount, align: 'right' });
        currentY += 25;
      }

      // Table border
      doc.strokeColor('#ddd').lineWidth(0.5);
      doc.rect(50, tableTop, 495, currentY - tableTop).stroke();

      doc.y = currentY + 10;

      // Totals section
      const totalsX = 380;
      const gst = subtotal * 0.18;
      const total = subtotal + gst;

      doc.fontSize(11).fillColor('#000');

      // Subtotal
      doc.text('Subtotal:', totalsX, doc.y);
      doc.text(`Rs ${subtotal.toLocaleString('en-IN')}`, 450, doc.y - 11, { width: 95, align: 'right' });
      doc.moveDown(0.5);

      // GST
      doc.text('GST (18%):', totalsX, doc.y);
      doc.text(`Rs ${gst.toLocaleString('en-IN')}`, 450, doc.y - 11, { width: 95, align: 'right' });
      doc.moveDown(0.5);

      // Total box
      doc.rect(totalsX - 10, doc.y - 2, 175, 25).fillColor('#1e3a5f').fill();
      doc.fontSize(12).fillColor('#fff');
      doc.text('TOTAL:', totalsX, doc.y + 5);
      doc.text(`Rs ${total.toLocaleString('en-IN')}`, 450, doc.y + 5, { width: 95, align: 'right' });

      doc.y += 40;

      // Payment Terms
      doc.fontSize(12).fillColor('#1e3a5f').text('Payment Terms', 50);
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#000');
      doc.text('- 50% advance payment to initiate services', 60);
      doc.text('- 50% upon completion of deliverables', 60);
      doc.text('- Payment via Bank Transfer, UPI, or Cheque', 60);
      doc.moveDown();

      // Notes/Remarks
      if (proposal.finalRemark) {
        doc.fontSize(12).fillColor('#1e3a5f').text('Notes', 50);
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor('#000').text(proposal.finalRemark, 60);
        doc.moveDown();
      }

      // Footer
      const footerY = 720;
      doc.strokeColor('#1e3a5f').lineWidth(1)
        .moveTo(50, footerY).lineTo(545, footerY).stroke();

      doc.fontSize(9).fillColor('#666');
      doc.text('Thank you for considering DigiComply for your compliance needs.', 50, footerY + 10, { align: 'center' });
      doc.text('For queries, contact: support@digicomply.in | +91-XXXXXXXXXX', 50, footerY + 22, { align: 'center' });
      doc.text('DigiComply - Simplifying Compliance for Indian Businesses', 50, footerY + 34, { align: 'center' });

      doc.end();
    });
  }

  /**
   * Send proposal to client via email
   */
  async sendToClient(proposalId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const proposal = await storage.getProposal(proposalId);

      if (!proposal) {
        return { success: false, error: 'Proposal not found' };
      }

      // Get associated lead for email
      let lead = null;
      if (proposal.leadId) {
        lead = await storage.getLeadByLeadId(proposal.leadId);
      }

      const clientEmail = (proposal as any).email || lead?.email;
      const clientName = (proposal as any).clientName || lead?.contactPerson || lead?.companyName || 'Valued Client';

      if (!clientEmail) {
        return { success: false, error: 'Client email not found. Please update lead/proposal with client email.' };
      }

      // Generate PDF
      const pdfBuffer = await this.generatePDF(proposalId);

      // Create email template
      const proposalAmount = Number(proposal.proposalAmount) || 0;
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: #1e3a5f; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; }
    .highlight { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .amount { font-size: 24px; color: #1e3a5f; font-weight: bold; }
    .cta { background: #1e3a5f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; }
    .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>DigiComply</h1>
    <p>Your Compliance Partner</p>
  </div>
  <div class="content">
    <p>Dear ${clientName},</p>
    <p>Thank you for your interest in our compliance services. Please find attached our proposal for the services discussed.</p>

    <div class="highlight">
      <p><strong>Proposal #:</strong> PRO-${String(proposalId).padStart(5, '0')}</p>
      <p><strong>Total Amount:</strong> <span class="amount">Rs ${(proposalAmount * 1.18).toLocaleString('en-IN')}</span> (inclusive of GST)</p>
      <p><strong>Valid Until:</strong> ${validUntil.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
    </div>

    <p>The attached PDF contains the complete breakdown of services and terms.</p>

    <p>To proceed:</p>
    <ol>
      <li>Review the attached proposal</li>
      <li>Reply to this email with your confirmation</li>
      <li>Our team will guide you through the next steps</li>
    </ol>

    <p>If you have any questions, feel free to reach out to your sales executive or reply to this email.</p>

    <p>Best regards,<br>The DigiComply Team</p>
  </div>
  <div class="footer">
    <p>DigiComply - Simplifying Compliance for Indian Businesses</p>
    <p>support@digicomply.in | www.digicomply.in</p>
  </div>
</body>
</html>`;

      // Send email with PDF attachment
      await emailService.send({
        to: clientEmail,
        subject: `Your Service Proposal from DigiComply - PRO-${String(proposalId).padStart(5, '0')}`,
        html: emailHtml,
        attachments: [
          {
            filename: `DigiComply-Proposal-${proposalId}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });

      // Update proposal status
      await storage.updateProposal(proposalId, {
        proposalStatus: 'sent',
      });

      logger.info(`Proposal ${proposalId} sent to ${clientEmail}`);

      return { success: true };

    } catch (error: any) {
      logger.error('Send proposal error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Track proposal view
   */
  async trackView(proposalId: number, _viewerInfo?: { ip?: string; userAgent?: string }): Promise<void> {
    try {
      const proposal = await storage.getProposal(proposalId);
      if (!proposal) return;

      // Update to viewed status if not already converted/approved
      if (!['converted', 'approved'].includes(proposal.proposalStatus || '')) {
        await storage.updateProposal(proposalId, {
          proposalStatus: 'viewed',
        });
      }

      logger.info(`Proposal ${proposalId} viewed`);
    } catch (error) {
      logger.error('Track proposal view error:', error);
    }
  }

  /**
   * Get proposal statistics
   */
  async getStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    totalValue: number;
    conversionRate: number;
  }> {
    const stats = await storage.getProposalStats();

    const byStatus: Record<string, number> = {};
    let total = 0;
    let converted = 0;

    if (stats.statusDistribution) {
      for (const item of stats.statusDistribution) {
        byStatus[item.status] = item.count;
        total += item.count;
        if (item.status === 'converted') {
          converted = item.count;
        }
      }
    }

    return {
      total,
      byStatus,
      totalValue: stats.totalValue || 0,
      conversionRate: total > 0 ? (converted / total) * 100 : 0,
    };
  }
}

export const proposalService = new ProposalService();
