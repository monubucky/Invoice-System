import prisma from '../config/db';
import { generateInvoiceNumber } from '../utils/invoiceNumber';
import { calculateInvoiceTotals } from '../utils/taxCalculator';
import { RecurringConfigInput } from '../utils/schemas';

// ─── Create Recurring Invoice Template ───────────────────────────────────────
export const createRecurringInvoice = async (
  businessId: string,
  data: RecurringConfigInput
) => {
  const client = await prisma.client.findFirst({
    where: { id: data.clientId, businessId, isDeleted: false },
  });
  if (!client) throw new Error('Client not found');

  const totals = calculateInvoiceTotals(
    data.items,
    data.taxRate,
    data.discount
  );

  const invoiceNumber = await generateInvoiceNumber(businessId);

  const invoice = await prisma.$transaction(async (tx) => {
    const newInvoice = await tx.invoice.create({
      data: {
        businessId,
        clientId: data.clientId,
        invoiceNumber,
        status: 'DRAFT',
        issueDate: new Date(data.issueDate),
        dueDate: new Date(data.dueDate),
        subtotal: totals.subtotal,
        taxRate: data.taxRate ?? 0,
        taxAmount: totals.taxAmount,
        discount: data.discount ?? 0,
        total: totals.total,
        notes: data.notes,
        isRecurring: true,
        recurringCycle: data.recurringCycle,
      },
    });

    await tx.invoiceItem.createMany({
      data: totals.items.map((item) => ({
        invoiceId: newInvoice.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      })),
    });

    return newInvoice;
  });

  return invoice;
};

// ─── Get Next Due Date ────────────────────────────────────────────────────────
const getNextDueDate = (
  currentDueDate: Date,
  cycle: string
): Date => {
  const next = new Date(currentDueDate);

  switch (cycle) {
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }

  return next;
};

// ─── Generate Next Invoice from Recurring Template ───────────────────────────
export const generateNextRecurringInvoice = async (
  templateInvoiceId: string
): Promise<void> => {
  const template = await prisma.invoice.findUnique({
    where: { id: templateInvoiceId },
    include: { items: true },
  });

  if (!template || !template.isRecurring || !template.recurringCycle) return;

  const nextIssueDate = new Date();
  const nextDueDate = getNextDueDate(
    new Date(template.dueDate),
    template.recurringCycle
  );

  const invoiceNumber = await generateInvoiceNumber(template.businessId);

  await prisma.$transaction(async (tx) => {
    const newInvoice = await tx.invoice.create({
      data: {
        businessId: template.businessId,
        clientId: template.clientId,
        invoiceNumber,
        status: 'DRAFT',
        issueDate: nextIssueDate,
        dueDate: nextDueDate,
        subtotal: template.subtotal,
        taxRate: template.taxRate,
        taxAmount: template.taxAmount,
        discount: template.discount,
        total: template.total,
        notes: template.notes,
        isRecurring: true,
        recurringCycle: template.recurringCycle,
      },
    });

    await tx.invoiceItem.createMany({
      data: template.items.map((item) => ({
        invoiceId: newInvoice.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      })),
    });

    console.log(`✅ Generated recurring invoice: ${invoiceNumber}`);
  });
};

// ─── List Recurring Invoices ──────────────────────────────────────────────────
export const getRecurringInvoices = async (businessId: string) => {
  const invoices = await prisma.invoice.findMany({
    where: { businessId, isRecurring: true },
    orderBy: { createdAt: 'desc' },
    include: {
      client: { select: { id: true, name: true, email: true } },
      items: true,
    },
  });

  return invoices;
};

// ─── Update Recurring Cycle ───────────────────────────────────────────────────
export const updateRecurringCycle = async (
  id: string,
  businessId: string,
  cycle: string
) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id, businessId, isRecurring: true },
  });

  if (!invoice) throw new Error('Recurring invoice not found');

  return prisma.invoice.update({
    where: { id },
    data: { recurringCycle: cycle },
  });
};

// ─── Stop Recurring Invoice ───────────────────────────────────────────────────
export const stopRecurringInvoice = async (
  id: string,
  businessId: string
) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id, businessId, isRecurring: true },
  });

  if (!invoice) throw new Error('Recurring invoice not found');

  return prisma.invoice.update({
    where: { id },
    data: { isRecurring: false, recurringCycle: null },
  });
};

// ─── Cron Job: Process All Due Recurring Invoices ─────────────────────────────
export const processRecurringInvoices = async (): Promise<void> => {
  console.log('🔄 Processing recurring invoices...');

  const now = new Date();

  // Find recurring invoices where dueDate has passed
  const dueRecurring = await prisma.invoice.findMany({
    where: {
      isRecurring: true,
      status: { in: ['PAID', 'SENT', 'DRAFT'] },
      dueDate: { lte: now },
    },
  });

  console.log(`Found ${dueRecurring.length} recurring invoices to process`);

  for (const invoice of dueRecurring) {
    try {
      await generateNextRecurringInvoice(invoice.id);
    } catch (err) {
      console.error(`Failed to generate recurring invoice for ${invoice.invoiceNumber}:`, err);
    }
  }

  console.log('✅ Recurring invoice processing complete');
};