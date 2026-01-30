/**
 * Invoice PDF Generator Service
 *
 * Generates professional PDF invoices for payments.
 * Uses HTML-to-PDF conversion for flexibility and easy customization.
 */

import { db } from '../db';
import { payments, serviceRequests, businessEntities, users } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Company details (would come from config in production)
const COMPANY_INFO = {
  name: 'DigiComply Solutions Pvt. Ltd.',
  address: '123 Business Park, Sector 44',
  city: 'Gurugram, Haryana 122003',
  country: 'India',
  gstin: 'XXABC1234X1Z5',
  pan: 'AABCD1234E',
  email: 'billing@digicomply.in',
  phone: '+91-124-4567890',
  website: 'www.digicomply.in',
  bankDetails: {
    accountName: 'DigiComply Solutions Pvt Ltd',
    accountNumber: 'XXXX XXXX XXXX 1234',
    bankName: 'HDFC Bank',
    ifscCode: 'HDFC0001234',
    branch: 'Gurugram Sector 44'
  }
};

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  payment: {
    id: number;
    amount: string;
    paymentMethod: string;
    paymentStatus: string;
    transactionId: string;
    paidAt: Date | null;
  };
  client: {
    id: string;
    companyName: string;
    contactPerson: string | null;
    contactEmail: string | null;
    gstin: string | null;
    pan: string | null;
    address: string | null;
    state: string | null;
  };
  service: {
    id: number;
    name: string;
    description: string | null;
    requestId: string | null;
  };
  lineItems: {
    description: string;
    hsn: string;
    quantity: number;
    rate: number;
    amount: number;
  }[];
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  amountInWords: string;
  notes: string | null;
  termsAndConditions: string[];
}

/**
 * Generate invoice data for a payment
 */
export async function generateInvoiceData(paymentId: number): Promise<InvoiceData | null> {
  try {
    // Get payment with related data
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);

    if (!payment) {
      return null;
    }

    // Get service request if exists
    let serviceRequest = null;
    let businessEntity = null;

    if (payment.serviceRequestId) {
      const [sr] = await db
        .select()
        .from(serviceRequests)
        .where(eq(serviceRequests.id, payment.serviceRequestId))
        .limit(1);
      serviceRequest = sr;

      if (sr?.businessEntityId) {
        const [be] = await db
          .select()
          .from(businessEntities)
          .where(eq(businessEntities.id, sr.businessEntityId))
          .limit(1);
        businessEntity = be;
      }
    }

    // Generate invoice number
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(payment.id).padStart(6, '0')}`;

    // Calculate amounts
    const baseAmount = parseFloat(payment.amount);
    const gstRate = 18; // 18% GST
    const isInterstate = false; // Would check client state vs company state

    let cgst = 0, sgst = 0, igst = 0;
    if (isInterstate) {
      igst = baseAmount * (gstRate / 100);
    } else {
      cgst = baseAmount * (gstRate / 200); // Half of GST
      sgst = baseAmount * (gstRate / 200); // Half of GST
    }

    const total = baseAmount + cgst + sgst + igst;

    // Build line items
    const lineItems = [
      {
        description: serviceRequest?.serviceName || 'Professional Services',
        hsn: '998311', // HSN code for professional services
        quantity: 1,
        rate: baseAmount,
        amount: baseAmount
      }
    ];

    const invoiceData: InvoiceData = {
      invoiceNumber,
      invoiceDate: payment.createdAt || new Date(),
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      payment: {
        id: payment.id,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod || 'Online',
        paymentStatus: payment.paymentStatus || 'pending',
        transactionId: payment.transactionId || '',
        paidAt: payment.paidAt
      },
      client: {
        id: businessEntity?.clientId || 'N/A',
        companyName: businessEntity?.companyName || 'Customer',
        contactPerson: businessEntity?.contactPerson || null,
        contactEmail: businessEntity?.contactEmail || null,
        gstin: businessEntity?.gstin || null,
        pan: businessEntity?.pan || null,
        address: businessEntity?.registeredAddress || null,
        state: businessEntity?.state || null
      },
      service: {
        id: serviceRequest?.id || 0,
        name: serviceRequest?.serviceName || 'Professional Services',
        description: serviceRequest?.serviceType || null,
        requestId: (serviceRequest as any)?.requestId || null
      },
      lineItems,
      subtotal: baseAmount,
      cgst,
      sgst,
      igst,
      total,
      amountInWords: numberToWords(total),
      notes: 'Thank you for your business!',
      termsAndConditions: [
        'Payment is due within 15 days of invoice date.',
        'Late payments may be subject to interest at 1.5% per month.',
        'This is a computer-generated invoice and does not require a signature.',
        'For any queries, please contact billing@digicomply.in'
      ]
    };

    return invoiceData;
  } catch (error) {
    console.error('Error generating invoice data:', error);
    return null;
  }
}

/**
 * Generate HTML for invoice
 */
export function generateInvoiceHTML(data: InvoiceData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${data.invoiceNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #333;
      background: #fff;
    }
    .invoice {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #2563eb;
    }
    .company-info h1 {
      font-size: 24px;
      color: #2563eb;
      margin-bottom: 8px;
    }
    .company-info p {
      color: #666;
      font-size: 11px;
    }
    .invoice-title {
      text-align: right;
    }
    .invoice-title h2 {
      font-size: 32px;
      color: #2563eb;
      margin-bottom: 10px;
    }
    .invoice-title .invoice-number {
      font-size: 14px;
      color: #333;
    }
    .invoice-title .invoice-date {
      font-size: 12px;
      color: #666;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      margin-top: 8px;
    }
    .status-paid {
      background: #dcfce7;
      color: #166534;
    }
    .status-pending {
      background: #fef3c7;
      color: #92400e;
    }
    .billing-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }
    .billing-to, .billing-from {
      width: 48%;
    }
    .billing-to h3, .billing-from h3 {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }
    .billing-to p, .billing-from p {
      margin-bottom: 4px;
    }
    .billing-to .company-name, .billing-from .company-name {
      font-size: 16px;
      font-weight: 600;
      color: #111;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .items-table th {
      background: #f8fafc;
      padding: 12px;
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      border-bottom: 2px solid #e2e8f0;
    }
    .items-table td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    .items-table .text-right {
      text-align: right;
    }
    .totals {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 40px;
    }
    .totals-table {
      width: 300px;
    }
    .totals-table tr td {
      padding: 8px 0;
    }
    .totals-table tr td:last-child {
      text-align: right;
      font-weight: 500;
    }
    .totals-table .total-row {
      border-top: 2px solid #2563eb;
      font-size: 16px;
      font-weight: 700;
    }
    .totals-table .total-row td {
      padding-top: 12px;
      color: #2563eb;
    }
    .amount-words {
      background: #f8fafc;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 30px;
    }
    .amount-words span {
      font-weight: 600;
    }
    .bank-details {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .bank-details h4 {
      font-size: 12px;
      color: #333;
      margin-bottom: 12px;
    }
    .bank-details table {
      width: 100%;
    }
    .bank-details td {
      padding: 4px 0;
    }
    .bank-details td:first-child {
      color: #666;
      width: 150px;
    }
    .terms {
      border-top: 1px solid #e2e8f0;
      padding-top: 20px;
    }
    .terms h4 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      margin-bottom: 10px;
    }
    .terms ul {
      list-style: none;
    }
    .terms li {
      font-size: 10px;
      color: #666;
      margin-bottom: 4px;
      padding-left: 12px;
      position: relative;
    }
    .terms li:before {
      content: "•";
      position: absolute;
      left: 0;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      color: #666;
      font-size: 10px;
    }
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      .invoice {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div class="company-info">
        <h1>${COMPANY_INFO.name}</h1>
        <p>${COMPANY_INFO.address}</p>
        <p>${COMPANY_INFO.city}, ${COMPANY_INFO.country}</p>
        <p>GSTIN: ${COMPANY_INFO.gstin} | PAN: ${COMPANY_INFO.pan}</p>
        <p>Email: ${COMPANY_INFO.email} | Phone: ${COMPANY_INFO.phone}</p>
      </div>
      <div class="invoice-title">
        <h2>INVOICE</h2>
        <p class="invoice-number">${data.invoiceNumber}</p>
        <p class="invoice-date">Date: ${formatDate(data.invoiceDate)}</p>
        <p class="invoice-date">Due Date: ${formatDate(data.dueDate)}</p>
        <span class="status-badge ${data.payment.paymentStatus === 'completed' ? 'status-paid' : 'status-pending'}">
          ${data.payment.paymentStatus === 'completed' ? 'PAID' : 'PENDING'}
        </span>
      </div>
    </div>

    <div class="billing-section">
      <div class="billing-to">
        <h3>Bill To</h3>
        <p class="company-name">${data.client.companyName}</p>
        ${data.client.contactPerson ? `<p>${data.client.contactPerson}</p>` : ''}
        ${data.client.address ? `<p>${data.client.address}</p>` : ''}
        ${data.client.state ? `<p>${data.client.state}</p>` : ''}
        ${data.client.gstin ? `<p>GSTIN: ${data.client.gstin}</p>` : ''}
        ${data.client.pan ? `<p>PAN: ${data.client.pan}</p>` : ''}
        ${data.client.contactEmail ? `<p>${data.client.contactEmail}</p>` : ''}
      </div>
      <div class="billing-from">
        <h3>Service Details</h3>
        ${data.service.requestId ? `<p><strong>Request ID:</strong> ${data.service.requestId}</p>` : ''}
        <p><strong>Service:</strong> ${data.service.name}</p>
        ${data.payment.transactionId ? `<p><strong>Transaction ID:</strong> ${data.payment.transactionId}</p>` : ''}
        <p><strong>Payment Method:</strong> ${data.payment.paymentMethod}</p>
        ${data.payment.paidAt ? `<p><strong>Paid On:</strong> ${formatDate(data.payment.paidAt)}</p>` : ''}
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Description</th>
          <th>HSN/SAC</th>
          <th class="text-right">Qty</th>
          <th class="text-right">Rate (₹)</th>
          <th class="text-right">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${data.lineItems.map(item => `
          <tr>
            <td>${item.description}</td>
            <td>${item.hsn}</td>
            <td class="text-right">${item.quantity}</td>
            <td class="text-right">${formatCurrency(item.rate)}</td>
            <td class="text-right">${formatCurrency(item.amount)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals">
      <table class="totals-table">
        <tr>
          <td>Subtotal</td>
          <td>₹${formatCurrency(data.subtotal)}</td>
        </tr>
        ${data.cgst > 0 ? `
          <tr>
            <td>CGST (9%)</td>
            <td>₹${formatCurrency(data.cgst)}</td>
          </tr>
          <tr>
            <td>SGST (9%)</td>
            <td>₹${formatCurrency(data.sgst)}</td>
          </tr>
        ` : ''}
        ${data.igst > 0 ? `
          <tr>
            <td>IGST (18%)</td>
            <td>₹${formatCurrency(data.igst)}</td>
          </tr>
        ` : ''}
        <tr class="total-row">
          <td>Total</td>
          <td>₹${formatCurrency(data.total)}</td>
        </tr>
      </table>
    </div>

    <div class="amount-words">
      <span>Amount in Words:</span> ${data.amountInWords}
    </div>

    <div class="bank-details">
      <h4>Bank Details for Payment</h4>
      <table>
        <tr>
          <td>Account Name:</td>
          <td>${COMPANY_INFO.bankDetails.accountName}</td>
        </tr>
        <tr>
          <td>Account Number:</td>
          <td>${COMPANY_INFO.bankDetails.accountNumber}</td>
        </tr>
        <tr>
          <td>Bank Name:</td>
          <td>${COMPANY_INFO.bankDetails.bankName}</td>
        </tr>
        <tr>
          <td>IFSC Code:</td>
          <td>${COMPANY_INFO.bankDetails.ifscCode}</td>
        </tr>
        <tr>
          <td>Branch:</td>
          <td>${COMPANY_INFO.bankDetails.branch}</td>
        </tr>
      </table>
    </div>

    <div class="terms">
      <h4>Terms & Conditions</h4>
      <ul>
        ${data.termsAndConditions.map(term => `<li>${term}</li>`).join('')}
      </ul>
    </div>

    <div class="footer">
      <p>This is a computer-generated invoice and does not require a signature.</p>
      <p>${COMPANY_INFO.name} | ${COMPANY_INFO.website} | ${COMPANY_INFO.email}</p>
    </div>
  </div>
</body>
</html>
`;
}

// Helper functions
function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero Rupees Only';

  function convert(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  }

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  let result = convert(rupees) + ' Rupees';
  if (paise > 0) {
    result += ' and ' + convert(paise) + ' Paise';
  }
  result += ' Only';

  return result;
}
