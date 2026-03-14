import Stripe from 'stripe';
import prisma from '../config/db';
import stripe from '../config/stripe';
import { RecordPaymentInput } from '../utils/schemas';

// ─── Helper: Update Invoice Status After Payment ──────────────────────────────
const updateInvoiceStatus = async (invoiceId: string): Promise<void> => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });

  if (!invoice) return;

  const totalPaid = invoice.payments.reduce(
    (sum, p) => sum + Number(p.amount), 0
  );
  const invoiceTotal = Number(invoice.total);

  let status: string;

  if (totalPaid >= invoiceTotal) {
    status = 'PAID';
  } else if (totalPaid > 0) {
    status = 'PARTIALLY_PAID';
  } else {
    return; // No change needed
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: status as any },
  });
};

// ─── List Payments ────────────────────────────────────────────────────────────
export const getPayments = async (businessId: string) => {
  const payments = await prisma.payment.findMany({
    where: { invoice: { businessId } },
    orderBy: { paidAt: 'desc' },
    include: {
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
          status: true,
          client: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });

  const totalReceived = payments.reduce(
    (sum, p) => sum + Number(p.amount), 0
  );

  return { payments, totalReceived };
};

// ─── Get Payments for Invoice ─────────────────────────────────────────────────
export const getPaymentsByInvoice = async (
  invoiceId: string,
  businessId: string
) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, businessId },
  });
  if (!invoice) throw new Error('Invoice not found');

  const payments = await prisma.payment.findMany({
    where: { invoiceId },
    orderBy: { paidAt: 'desc' },
  });

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balanceDue = Number(invoice.total) - totalPaid;

  return { payments, totalPaid, balanceDue };
};

// ─── Record Manual Payment ────────────────────────────────────────────────────
export const recordPayment = async (
  businessId: string,
  data: RecordPaymentInput
) => {
  // Verify invoice belongs to business
  const invoice = await prisma.invoice.findFirst({
    where: { id: data.invoiceId, businessId },
    include: { payments: true },
  });

  if (!invoice) throw new Error('Invoice not found');

  if (['PAID', 'CANCELLED'].includes(invoice.status)) {
    throw new Error(`Cannot add payment to a ${invoice.status} invoice`);
  }

  // Check overpayment
  const totalPaid = invoice.payments.reduce(
    (sum, p) => sum + Number(p.amount), 0
  );
  const remaining = Number(invoice.total) - totalPaid;

  if (data.amount > remaining) {
    throw new Error(
      `Payment amount exceeds balance due of ${remaining.toFixed(2)}`
    );
  }

  // Record payment
  const payment = await prisma.payment.create({
    data: {
      invoiceId: data.invoiceId,
      amount: data.amount,
      method: data.method,
      reference: data.reference,
      paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
    },
  });

  // Update invoice status
  await updateInvoiceStatus(data.invoiceId);

  return payment;
};

// ─── Delete Payment ───────────────────────────────────────────────────────────
export const deletePayment = async (id: string, businessId: string) => {
  const payment = await prisma.payment.findFirst({
    where: {
      id,
      invoice: { businessId },
    },
  });

  if (!payment) throw new Error('Payment not found');

  // Only allow deleting manual payments
  if (payment.method === 'STRIPE') {
    throw new Error('Stripe payments cannot be deleted manually');
  }

  await prisma.payment.delete({ where: { id } });

  // Recalculate invoice status
  await updateInvoiceStatus(payment.invoiceId);

  return { message: 'Payment deleted successfully' };
};

// ─── Create Stripe Checkout Session ──────────────────────────────────────────
export const createStripeCheckout = async (
  invoiceId: string,
  businessId: string
) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, businessId },
    include: {
      client: true,
      items: true,
      business: true,
    },
  });

  if (!invoice) throw new Error('Invoice not found');

  if (invoice.status === 'PAID') {
    throw new Error('Invoice is already paid');
  }

  if (invoice.status === 'CANCELLED') {
    throw new Error('Invoice is cancelled');
  }

  // Calculate remaining balance
  const payments = await prisma.payment.findMany({
    where: { invoiceId },
  });
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balanceDue = Number(invoice.total) - totalPaid;

  if (balanceDue <= 0) throw new Error('Invoice is already fully paid');

  // Create Stripe line items
  const lineItems = invoice.items.map((item) => ({
    price_data: {
      currency: invoice.business?.currency?.toLowerCase() || 'usd',
      product_data: {
        name: item.description,
      },
      unit_amount: Math.round(Number(item.unitPrice) * 100), // cents
    },
    quantity: Number(item.quantity),
  }));

  // Add tax if applicable
  if (Number(invoice.taxRate) > 0) {
    lineItems.push({
      price_data: {
        currency: invoice.business?.currency?.toLowerCase() || 'usd',
        product_data: {
          name: `Tax (${Number(invoice.taxRate)}%)`,
        },
        unit_amount: Math.round(Number(invoice.taxAmount) * 100),
      },
      quantity: 1,
    });
  }

  // Subtract discount if applicable
  const discounts: any[] = [];
  if (Number(invoice.discount) > 0) {
    const coupon = await stripe.coupons.create({
      amount_off: Math.round(Number(invoice.discount) * 100),
      currency: invoice.business?.currency?.toLowerCase() || 'usd',
      name: 'Discount',
    });
    discounts.push({ coupon: coupon.id });
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    discounts,
    customer_email: invoice.client.email,
    metadata: {
      invoiceId: invoice.id,
      businessId,
      invoiceNumber: invoice.invoiceNumber,
    },
    success_url: `${process.env.FRONTEND_URL}/invoices/${invoice.id}?payment=success`,
    cancel_url: `${process.env.FRONTEND_URL}/invoices/${invoice.id}?payment=cancelled`,
  });

  return {
    sessionId: session.id,
    checkoutUrl: session.url,
  };
};

// ─── Create Stripe Checkout via Public Token ──────────────────────────────────
export const createStripeCheckoutPublic = async (token: string) => {
  const invoice = await prisma.invoice.findFirst({
    where: { publicToken: token },
    include: {
      client: true,
      items: true,
      business: true,
    },
  });

  if (!invoice) throw new Error('Invoice not found');
  if (invoice.status === 'PAID') throw new Error('Invoice is already paid');
  if (invoice.status === 'CANCELLED') throw new Error('Invoice is cancelled');

  const payments = await prisma.payment.findMany({ where: { invoiceId: invoice.id } });
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balanceDue = Number(invoice.total) - totalPaid;

  if (balanceDue <= 0) throw new Error('Invoice is already fully paid');

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: invoice.business?.currency?.toLowerCase() || 'usd',
        product_data: {
          name: `Invoice ${invoice.invoiceNumber}`,
        },
        unit_amount: Math.round(balanceDue * 100),
      },
      quantity: 1,
    }],
    mode: 'payment',
    customer_email: invoice.client.email,
    metadata: {
      invoiceId: invoice.id,
      businessId: invoice.businessId,
      invoiceNumber: invoice.invoiceNumber,
    },
    success_url: `${process.env.FRONTEND_URL}/portal/${token}?payment=success`,
    cancel_url: `${process.env.FRONTEND_URL}/portal/${token}?payment=cancelled`,
  });

  return { sessionId: session.id, checkoutUrl: session.url };
};

// ─── Handle Stripe Webhook ────────────────────────────────────────────────────
export const handleStripeWebhook = async (
  payload: Buffer,
  signature: string
) => {
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch {
    throw new Error('Invalid webhook signature');
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { invoiceId } = session.metadata || {};

    if (!invoiceId) return;

    const amountPaid = (session.amount_total || 0) / 100;

    // Record the payment
    await prisma.payment.create({
      data: {
        invoiceId,
        amount: amountPaid,
        method: 'STRIPE',
        reference: session.payment_intent as string,
        paidAt: new Date(),
      },
    });

    // Update invoice status
    await updateInvoiceStatus(invoiceId);
  }
};

// ─── Payment Summary ──────────────────────────────────────────────────────────
export const getPaymentSummary = async (businessId: string) => {
  const [thisMonth, lastMonth, allTime] = await Promise.all([
    // This month
    prisma.payment.aggregate({
      where: {
        invoice: { businessId },
        paidAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      _sum: { amount: true },
      _count: true,
    }),
    // Last month
    prisma.payment.aggregate({
      where: {
        invoice: { businessId },
        paidAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
          lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      _sum: { amount: true },
      _count: true,
    }),
    // All time
    prisma.payment.aggregate({
      where: { invoice: { businessId } },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  return {
    thisMonth: {
      total: thisMonth._sum.amount || 0,
      count: thisMonth._count,
    },
    lastMonth: {
      total: lastMonth._sum.amount || 0,
      count: lastMonth._count,
    },
    allTime: {
      total: allTime._sum.amount || 0,
      count: allTime._count,
    },
  };
};