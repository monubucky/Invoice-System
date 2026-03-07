import prisma from '../config/db';
import { generateInvoiceNumber } from '../utils/invoiceNumber';
import { calculateInvoiceTotals } from '../utils/taxCalculator';
import {
  CreateInvoiceInput,
  UpdateInvoiceInput,
  InvoiceQueryInput,
} from '../utils/schemas';

// ─── List Invoices ────────────────────────────────────────────────────────────
export const getInvoices = async (
  businessId: string,
  query: InvoiceQueryInput
) => {
  const page = parseInt(query.page);
  const limit = parseInt(query.limit);
  const skip = (page - 1) * limit;

  const where: any = {
    businessId,
    ...(query.status && { status: query.status }),
    ...(query.clientId && { clientId: query.clientId }),
    ...(query.search && {
      OR: [
        { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
        { client: { name: { contains: query.search, mode: 'insensitive' } } },
      ],
    }),
    ...(query.startDate &&
      query.endDate && {
        createdAt: {
          gte: new Date(query.startDate),
          lte: new Date(query.endDate),
        },
      }),
  };

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [query.sortBy]: query.sortOrder },
      include: {
        client: {
          select: { id: true, name: true, email: true },
        },
        items: true,
        _count: { select: { payments: true } },
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  return {
    invoices,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  };
};

// ─── Get Single Invoice ───────────────────────────────────────────────────────
export const getInvoiceById = async (id: string, businessId: string) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id, businessId },
    include: {
      client: true,
      items: true,
      payments: {
        orderBy: { paidAt: 'desc' },
      },
      reminders: {
        orderBy: { scheduledAt: 'asc' },
      },
    },
  });

  if (!invoice) throw new Error('Invoice not found');

  // Calculate amount paid and balance due
  const amountPaid = invoice.payments.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );
  const balanceDue = Number(invoice.total) - amountPaid;

  return { ...invoice, amountPaid, balanceDue };
};

// ─── Create Invoice ───────────────────────────────────────────────────────────
export const createInvoice = async (
  businessId: string,
  data: CreateInvoiceInput
) => {
  // Verify client belongs to this business
  const client = await prisma.client.findFirst({
    where: { id: data.clientId, businessId, isDeleted: false },
  });
  if (!client) throw new Error('Client not found');

  // Validate recurring
  if (data.isRecurring && !data.recurringCycle) {
    throw new Error('Recurring cycle is required for recurring invoices');
  }

  // Calculate totals
  const totals = calculateInvoiceTotals(
    data.items,
    data.taxRate,
    data.discount
  );

  // Generate invoice number
  const invoiceNumber = await generateInvoiceNumber(businessId);

  // Create invoice with items in transaction
  const invoice = await prisma.$transaction(async (tx) => {
    const newInvoice = await tx.invoice.create({
      data: {
        businessId,
        clientId: data.clientId,
        invoiceNumber,
        issueDate: new Date(data.issueDate),
        dueDate: new Date(data.dueDate),
        subtotal: totals.subtotal,
        taxRate: data.taxRate ?? 0,
        taxAmount: totals.taxAmount,
        discount: data.discount ?? 0,
        total: totals.total,
        notes: data.notes,
        isRecurring: data.isRecurring ?? false,
        recurringCycle: data.recurringCycle,
        status: 'DRAFT',
      },
    });

    // Create line items
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

  return getInvoiceById(invoice.id, businessId);
};

// ─── Update Invoice ───────────────────────────────────────────────────────────
export const updateInvoice = async (
  id: string,
  businessId: string,
  data: UpdateInvoiceInput
) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id, businessId },
  });

  if (!invoice) throw new Error('Invoice not found');

  // Only allow editing DRAFT invoices
  if (invoice.status !== 'DRAFT') {
    throw new Error('Only DRAFT invoices can be edited');
  }

  let updateData: any = { ...data };

  // Recalculate totals if items changed
  if (data.items) {
    const totals = calculateInvoiceTotals(
      data.items,
      data.taxRate ?? Number(invoice.taxRate),
      data.discount ?? Number(invoice.discount)
    );

    updateData = {
      ...updateData,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      total: totals.total,
    };

    // Replace all items in transaction
    await prisma.$transaction(async (tx) => {
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
      await tx.invoiceItem.createMany({
        data: totals.items.map((item) => ({
          invoiceId: id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
      });
    });

    delete updateData.items;
  }

  if (data.issueDate) updateData.issueDate = new Date(data.issueDate);
  if (data.dueDate) updateData.dueDate = new Date(data.dueDate);

  await prisma.invoice.update({ where: { id }, data: updateData });
  return getInvoiceById(id, businessId);
};

// ─── Delete Invoice ───────────────────────────────────────────────────────────
export const deleteInvoice = async (id: string, businessId: string) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id, businessId },
  });

  if (!invoice) throw new Error('Invoice not found');
  if (invoice.status !== 'DRAFT') {
    throw new Error('Only DRAFT invoices can be deleted');
  }

  await prisma.$transaction(async (tx) => {
    await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
    await tx.invoice.delete({ where: { id } });
  });

  return { message: 'Invoice deleted successfully' };
};

// ─── Send Invoice ─────────────────────────────────────────────────────────────
export const sendInvoice = async (id: string, businessId: string) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id, businessId },
  });

  if (!invoice) throw new Error('Invoice not found');

  if (!['DRAFT', 'SENT'].includes(invoice.status)) {
    throw new Error('Invoice cannot be sent in its current status');
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: { status: 'SENT' },
  });

  return updated;
};

// ─── Duplicate Invoice ────────────────────────────────────────────────────────
export const duplicateInvoice = async (id: string, businessId: string) => {
  const original = await prisma.invoice.findFirst({
    where: { id, businessId },
    include: { items: true },
  });

  if (!original) throw new Error('Invoice not found');

  const invoiceNumber = await generateInvoiceNumber(businessId);
  const today = new Date();
  const dueDate = new Date();
  dueDate.setDate(today.getDate() + 30);

  const duplicate = await prisma.$transaction(async (tx) => {
    const newInvoice = await tx.invoice.create({
      data: {
        businessId,
        clientId: original.clientId,
        invoiceNumber,
        status: 'DRAFT',
        issueDate: today,
        dueDate,
        subtotal: original.subtotal,
        taxRate: original.taxRate,
        taxAmount: original.taxAmount,
        discount: original.discount,
        total: original.total,
        notes: original.notes,
        isRecurring: false,
      },
    });

    await tx.invoiceItem.createMany({
      data: original.items.map((item) => ({
        invoiceId: newInvoice.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      })),
    });

    return newInvoice;
  });

  return getInvoiceById(duplicate.id, businessId);
};

// ─── Update Overdue Invoices ──────────────────────────────────────────────────
export const markOverdueInvoices = async () => {
  const result = await prisma.invoice.updateMany({
    where: {
      status: { in: ['SENT', 'VIEWED', 'PARTIALLY_PAID'] },
      dueDate: { lt: new Date() },
    },
    data: { status: 'OVERDUE' },
  });

  return result.count;
};

// ─── Get Invoice Summary Stats ────────────────────────────────────────────────
export const getInvoiceSummary = async (businessId: string) => {
  const [total, draft, sent, paid, overdue, totalRevenue, outstanding] =
    await Promise.all([
      prisma.invoice.count({ where: { businessId } }),
      prisma.invoice.count({ where: { businessId, status: 'DRAFT' } }),
      prisma.invoice.count({ where: { businessId, status: 'SENT' } }),
      prisma.invoice.count({ where: { businessId, status: 'PAID' } }),
      prisma.invoice.count({ where: { businessId, status: 'OVERDUE' } }),
      prisma.payment.aggregate({
        where: { invoice: { businessId } },
        _sum: { amount: true },
      }),
      prisma.invoice.aggregate({
        where: {
          businessId,
          status: { in: ['SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE'] },
        },
        _sum: { total: true },
      }),
    ]);

  return {
    total,
    draft,
    sent,
    paid,
    overdue,
    totalRevenue: totalRevenue._sum.amount || 0,
    outstanding: outstanding._sum.total || 0,
  };
};