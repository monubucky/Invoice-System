import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import { ENV } from '../config/env';

// Use SendGrid if API key is set, otherwise use nodemailer for local dev
const useSendGrid = !!process.env.SENDGRID_API_KEY;

if (useSendGrid) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
}

// Local dev transporter (logs emails to console)
const devTransporter = nodemailer.createTransport({
  host: 'localhost',
  port: 1025,
  ignoreTLS: true,
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    type: string;
  }>;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  const from = `${process.env.FROM_NAME || 'Invoice App'} <${process.env.FROM_EMAIL || 'noreply@invoiceapp.com'}>`;

  if (useSendGrid) {
    await sgMail.send({
      to: options.to,
      from,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content.toString('base64'),
        type: a.type,
        disposition: 'attachment',
      })),
    });
  } else {
    // Dev mode — print to console
    console.log('\n📧 EMAIL (dev mode)');
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    console.log('---');
    console.log('Email would be sent in production with SendGrid');
    console.log('---\n');
  }
};

// ─── Email Templates ──────────────────────────────────────────────────────────

export const sendInvoiceEmail = async (params: {
  to: string;
  clientName: string;
  businessName: string;
  invoiceNumber: string;
  total: number;
  dueDate: string;
  portalUrl: string;
  pdfBuffer: Buffer;
  currency?: string;
}): Promise<void> => {
  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: params.currency || 'USD',
  }).format(params.total);

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"/></head>
    <body style="font-family: Arial, sans-serif; background: #f9fafb; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">

        <!-- Header -->
        <div style="background: #4F46E5; padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">New Invoice from ${params.businessName}</h1>
        </div>

        <!-- Body -->
        <div style="padding: 32px;">
          <p style="color: #374151; font-size: 16px;">Hi <strong>${params.clientName}</strong>,</p>
          <p style="color: #6B7280; line-height: 1.6;">
            Please find your invoice attached to this email. You can also view and pay it online using the button below.
          </p>

          <!-- Invoice Details -->
          <div style="background: #F9FAFB; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="color: #6B7280; font-size: 14px; padding: 6px 0;">Invoice Number</td>
                <td style="color: #111827; font-weight: 600; text-align: right;">${params.invoiceNumber}</td>
              </tr>
              <tr>
                <td style="color: #6B7280; font-size: 14px; padding: 6px 0;">Amount Due</td>
                <td style="color: #4F46E5; font-weight: 700; font-size: 20px; text-align: right;">${formattedTotal}</td>
              </tr>
              <tr>
                <td style="color: #6B7280; font-size: 14px; padding: 6px 0;">Due Date</td>
                <td style="color: #EF4444; font-weight: 600; text-align: right;">${params.dueDate}</td>
              </tr>
            </table>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 32px 0;">
            <a href="${params.portalUrl}"
               style="background: #4F46E5; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
              View & Pay Invoice
            </a>
          </div>

          <p style="color: #9CA3AF; font-size: 13px; text-align: center;">
            The PDF invoice is also attached to this email for your records.
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #F9FAFB; padding: 20px 32px; text-align: center; border-top: 1px solid #E5E7EB;">
          <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
            Sent by <strong>${params.businessName}</strong> via Invoice App
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: params.to,
    subject: `Invoice ${params.invoiceNumber} from ${params.businessName} — ${formattedTotal} due`,
    html,
    attachments: [{
      filename: `${params.invoiceNumber}.pdf`,
      content: params.pdfBuffer,
      type: 'application/pdf',
    }],
  });
};

export const sendReminderEmail = async (params: {
  to: string;
  clientName: string;
  businessName: string;
  invoiceNumber: string;
  total: number;
  dueDate: string;
  portalUrl: string;
  reminderType: 'before_due' | 'on_due' | 'overdue';
  currency?: string;
}): Promise<void> => {
  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: params.currency || 'USD',
  }).format(params.total);

  const messages = {
    before_due: {
      subject: `Reminder: Invoice ${params.invoiceNumber} due soon`,
      heading: 'Payment Reminder',
      body: `This is a friendly reminder that invoice <strong>${params.invoiceNumber}</strong> for <strong>${formattedTotal}</strong> is due on <strong>${params.dueDate}</strong>.`,
      color: '#F59E0B',
    },
    on_due: {
      subject: `Invoice ${params.invoiceNumber} is due today`,
      heading: 'Payment Due Today',
      body: `Invoice <strong>${params.invoiceNumber}</strong> for <strong>${formattedTotal}</strong> is due today. Please make your payment to avoid late fees.`,
      color: '#EF4444',
    },
    overdue: {
      subject: `Overdue: Invoice ${params.invoiceNumber} — Action Required`,
      heading: 'Invoice Overdue',
      body: `Invoice <strong>${params.invoiceNumber}</strong> for <strong>${formattedTotal}</strong> was due on <strong>${params.dueDate}</strong> and is now overdue. Please make payment as soon as possible.`,
      color: '#DC2626',
    },
  };

  const msg = messages[params.reminderType];

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; background: #f9fafb; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
        <div style="background: ${msg.color}; padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">${msg.heading}</h1>
        </div>
        <div style="padding: 32px;">
          <p style="color: #374151;">Hi <strong>${params.clientName}</strong>,</p>
          <p style="color: #6B7280; line-height: 1.6;">${msg.body}</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${params.portalUrl}"
               style="background: ${msg.color}; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
              Pay Now
            </a>
          </div>
        </div>
        <div style="background: #F9FAFB; padding: 20px; text-align: center; border-top: 1px solid #E5E7EB;">
          <p style="color: #9CA3AF; font-size: 12px; margin: 0;">Sent by <strong>${params.businessName}</strong></p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: params.to,
    subject: msg.subject,
    html,
  });
};