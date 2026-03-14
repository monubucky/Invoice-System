import puppeteer from 'puppeteer';
import { Invoice, Client, InvoiceItem, Business, Payment } from '@prisma/client';

type InvoiceWithRelations = Invoice & {
  client: Client;
  items: InvoiceItem[];
  business?: Business;
  payments?: Payment[];
};

const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
};

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    DRAFT: '#6B7280',
    SENT: '#3B82F6',
    VIEWED: '#8B5CF6',
    PARTIALLY_PAID: '#F59E0B',
    PAID: '#10B981',
    OVERDUE: '#EF4444',
    CANCELLED: '#9CA3AF',
  };
  return colors[status] || '#6B7280';
};

export const generateInvoiceHTML = (
  invoice: InvoiceWithRelations,
  businessName: string,
  currency: string = 'USD'
): string => {
  const statusColor = getStatusColor(invoice.status);
  const amountPaid = invoice.payments?.reduce(
    (sum: number, p: any) => sum + Number(p.amount), 0
  ) || 0;
  const balanceDue = Number(invoice.total) - amountPaid;

  const itemRows = invoice.items.map((item) => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #F3F4F6; color: #374151;">
        ${item.description}
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #F3F4F6; text-align: center; color: #374151;">
        ${Number(item.quantity)}
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #F3F4F6; text-align: right; color: #374151;">
        ${formatCurrency(Number(item.unitPrice), currency)}
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #F3F4F6; text-align: right; color: #374151; font-weight: 500;">
        ${formatCurrency(Number(item.total), currency)}
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111827; background: #fff; }
        .page { max-width: 800px; margin: 0 auto; padding: 48px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; }
        .company-name { font-size: 28px; font-weight: 700; color: #111827; }
        .invoice-badge { text-align: right; }
        .invoice-title { font-size: 36px; font-weight: 800; color: #4F46E5; letter-spacing: -1px; }
        .invoice-number { font-size: 14px; color: #6B7280; margin-top: 4px; }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 600;
          color: white;
          background: ${statusColor};
          margin-top: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .divider { border: none; border-top: 2px solid #E5E7EB; margin: 32px 0; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 32px; margin-bottom: 40px; }
        .meta-block label { font-size: 11px; font-weight: 600; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px; }
        .meta-block p { font-size: 14px; color: #374151; line-height: 1.5; }
        .meta-block p strong { color: #111827; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
        thead tr { background: #4F46E5; }
        thead th { padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: white; text-transform: uppercase; letter-spacing: 0.5px; }
        thead th:not(:first-child) { text-align: right; }
        thead th:nth-child(2) { text-align: center; }
        tbody tr:hover { background: #F9FAFB; }
        .totals { display: flex; justify-content: flex-end; margin-bottom: 40px; }
        .totals-box { width: 280px; }
        .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #6B7280; border-bottom: 1px solid #F3F4F6; }
        .totals-row span:last-child { font-weight: 500; color: #374151; }
        .totals-row.total { border-bottom: none; border-top: 2px solid #E5E7EB; padding-top: 12px; margin-top: 4px; }
        .totals-row.total span { font-size: 18px; font-weight: 700; color: #111827; }
        .totals-row.balance { background: #EEF2FF; padding: 10px 12px; border-radius: 8px; border: none; margin-top: 8px; }
        .totals-row.balance span { color: #4F46E5; font-weight: 700; font-size: 16px; }
        .notes { background: #F9FAFB; border-left: 4px solid #4F46E5; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 40px; }
        .notes label { font-size: 11px; font-weight: 600; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 8px; }
        .notes p { font-size: 14px; color: #374151; line-height: 1.6; }
        .footer { text-align: center; padding-top: 32px; border-top: 1px solid #E5E7EB; }
        .footer p { font-size: 13px; color: #9CA3AF; }
        .footer strong { color: #4F46E5; }
      </style>
    </head>
    <body>
      <div class="page">

        <!-- Header -->
        <div class="header">
          <div>
            <div class="company-name">${businessName}</div>
          </div>
          <div class="invoice-badge">
            <div class="invoice-title">INVOICE</div>
            <div class="invoice-number">${invoice.invoiceNumber}</div>
            <div><span class="status-badge">${invoice.status.replace('_', ' ')}</span></div>
          </div>
        </div>

        <hr class="divider" />

        <!-- Meta Info -->
        <div class="meta-grid">
          <div class="meta-block">
            <label>Bill To</label>
            <p><strong>${invoice.client.name}</strong></p>
            <p>${invoice.client.email}</p>
            ${invoice.client.phone ? `<p>${invoice.client.phone}</p>` : ''}
            ${invoice.client.address ? `<p>${invoice.client.address}</p>` : ''}
          </div>
          <div class="meta-block">
            <label>Issue Date</label>
            <p>${formatDate(invoice.issueDate)}</p>
            <br/>
            <label>Due Date</label>
            <p style="color: #EF4444; font-weight: 600;">${formatDate(invoice.dueDate)}</p>
          </div>
          <div class="meta-block">
            <label>Invoice Number</label>
            <p><strong>${invoice.invoiceNumber}</strong></p>
            <br/>
            ${invoice.client.taxId ? `
              <label>Tax ID</label>
              <p>${invoice.client.taxId}</p>
            ` : ''}
          </div>
        </div>

        <!-- Items Table -->
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align:center;">Qty</th>
              <th style="text-align:right;">Unit Price</th>
              <th style="text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        <!-- Totals -->
        <div class="totals">
          <div class="totals-box">
            <div class="totals-row">
              <span>Subtotal</span>
              <span>${formatCurrency(Number(invoice.subtotal), currency)}</span>
            </div>
            ${Number(invoice.discount) > 0 ? `
            <div class="totals-row">
              <span>Discount</span>
              <span>- ${formatCurrency(Number(invoice.discount), currency)}</span>
            </div>` : ''}
            ${Number(invoice.taxRate) > 0 ? `
            <div class="totals-row">
              <span>Tax (${Number(invoice.taxRate)}%)</span>
              <span>${formatCurrency(Number(invoice.taxAmount), currency)}</span>
            </div>` : ''}
            <div class="totals-row total">
              <span>Total</span>
              <span>${formatCurrency(Number(invoice.total), currency)}</span>
            </div>
            ${amountPaid > 0 ? `
            <div class="totals-row">
              <span>Amount Paid</span>
              <span>- ${formatCurrency(amountPaid, currency)}</span>
            </div>` : ''}
            <div class="totals-row balance">
              <span>Balance Due</span>
              <span>${formatCurrency(balanceDue, currency)}</span>
            </div>
          </div>
        </div>

        <!-- Notes -->
        ${invoice.notes ? `
        <div class="notes">
          <label>Notes</label>
          <p>${invoice.notes}</p>
        </div>` : ''}

        <!-- Footer -->
        <div class="footer">
          <p>Thank you for your business! — <strong>${businessName}</strong></p>
          <p style="margin-top: 8px;">Questions? Contact us anytime.</p>
        </div>

      </div>
    </body>
    </html>
  `;
};

export const generatePDF = async (html: string): Promise<Buffer> => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      printBackground: true,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
};