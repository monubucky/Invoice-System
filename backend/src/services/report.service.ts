import prisma from '../config/db';
import { ReportQueryInput } from '../utils/schemas';

// ─── Dashboard Summary ────────────────────────────────────────────────────────
export const getDashboardSummary = async (businessId: string) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    totalClients,
    totalInvoices,
    draftCount,
    sentCount,
    paidCount,
    overdueCount,
    totalRevenue,
    thisMonthRevenue,
    lastMonthRevenue,
    outstandingAmount,
    overdueAmount,
    recentInvoices,
    topClients,
  ] = await Promise.all([
    // Counts
    prisma.client.count({ where: { businessId, isDeleted: false } }),
    prisma.invoice.count({ where: { businessId } }),
    prisma.invoice.count({ where: { businessId, status: 'DRAFT' } }),
    prisma.invoice.count({ where: { businessId, status: 'SENT' } }),
    prisma.invoice.count({ where: { businessId, status: 'PAID' } }),
    prisma.invoice.count({ where: { businessId, status: 'OVERDUE' } }),

    // Revenue all time
    prisma.payment.aggregate({
      where: { invoice: { businessId } },
      _sum: { amount: true },
    }),

    // This month revenue
    prisma.payment.aggregate({
      where: {
        invoice: { businessId },
        paidAt: { gte: startOfMonth },
      },
      _sum: { amount: true },
    }),

    // Last month revenue
    prisma.payment.aggregate({
      where: {
        invoice: { businessId },
        paidAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
      _sum: { amount: true },
    }),

    // Outstanding (sent + viewed + partially paid)
    prisma.invoice.aggregate({
      where: {
        businessId,
        status: { in: ['SENT', 'VIEWED', 'PARTIALLY_PAID'] },
      },
      _sum: { total: true },
    }),

    // Overdue amount
    prisma.invoice.aggregate({
      where: { businessId, status: 'OVERDUE' },
      _sum: { total: true },
    }),

    // Recent invoices
    prisma.invoice.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        client: { select: { id: true, name: true } },
      },
    }),

    // Top clients by revenue
    prisma.payment.groupBy({
      by: ['invoiceId'],
      where: { invoice: { businessId } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 5,
    }),
  ]);

  // Calculate month over month growth
  const thisMonth = Number(thisMonthRevenue._sum.amount || 0);
  const lastMonth = Number(lastMonthRevenue._sum.amount || 0);
  const growth = lastMonth === 0
    ? 100
    : parseFloat((((thisMonth - lastMonth) / lastMonth) * 100).toFixed(1));

  return {
    counts: {
      clients: totalClients,
      invoices: totalInvoices,
      draft: draftCount,
      sent: sentCount,
      paid: paidCount,
      overdue: overdueCount,
    },
    revenue: {
      allTime: Number(totalRevenue._sum.amount || 0),
      thisMonth,
      lastMonth,
      growth,
    },
    outstanding: Number(outstandingAmount._sum.total || 0),
    overdueAmount: Number(overdueAmount._sum.total || 0),
    recentInvoices,
    topClients,
  };
};

// ─── Monthly Revenue Breakdown ────────────────────────────────────────────────
export const getMonthlyRevenue = async (
  businessId: string,
  query: ReportQueryInput
) => {
  const year = parseInt(query.year);

  const months = Array.from({ length: 12 }, (_, i) => {
    const start = new Date(year, i, 1);
    const end = new Date(year, i + 1, 0, 23, 59, 59);
    return { month: i + 1, start, end };
  });

  const revenueByMonth = await Promise.all(
    months.map(async ({ month, start, end }) => {
      const [revenue, invoiceCount, paidCount] = await Promise.all([
        prisma.payment.aggregate({
          where: {
            invoice: { businessId },
            paidAt: { gte: start, lte: end },
          },
          _sum: { amount: true },
        }),
        prisma.invoice.count({
          where: {
            businessId,
            createdAt: { gte: start, lte: end },
          },
        }),
        prisma.invoice.count({
          where: {
            businessId,
            status: 'PAID',
            updatedAt: { gte: start, lte: end },
          },
        }),
      ]);

      return {
        month,
        monthName: new Date(year, month - 1).toLocaleString('en-US', { month: 'short' }),
        revenue: Number(revenue._sum.amount || 0),
        invoiceCount,
        paidCount,
      };
    })
  );

  const totalYearRevenue = revenueByMonth.reduce(
    (sum, m) => sum + m.revenue, 0
  );

  return { year, months: revenueByMonth, totalYearRevenue };
};

// ─── Invoice Status Breakdown ─────────────────────────────────────────────────
export const getInvoiceStatusBreakdown = async (businessId: string) => {
  const statuses = [
    'DRAFT',
    'SENT',
    'VIEWED',
    'PARTIALLY_PAID',
    'PAID',
    'OVERDUE',
    'CANCELLED',
  ];

  const breakdown = await Promise.all(
    statuses.map(async (status) => {
      const [count, amount] = await Promise.all([
        prisma.invoice.count({ where: { businessId, status: status as any } }),
        prisma.invoice.aggregate({
          where: { businessId, status: status as any },
          _sum: { total: true },
        }),
      ]);

      return {
        status,
        count,
        amount: Number(amount._sum.total || 0),
      };
    })
  );

  return breakdown.filter((b) => b.count > 0);
};

// ─── Top Clients Report ───────────────────────────────────────────────────────
export const getTopClientsReport = async (
  businessId: string,
  limit: number = 10
) => {
  const clients = await prisma.client.findMany({
    where: { businessId, isDeleted: false },
    include: {
      invoices: {
        include: { payments: true },
      },
      _count: { select: { invoices: true } },
    },
  });

  const clientStats = clients.map((client) => {
    const totalInvoiced = client.invoices.reduce(
      (sum, inv) => sum + Number(inv.total), 0
    );
    const totalPaid = client.invoices.reduce((sum, inv) =>
      sum + inv.payments.reduce((s, p) => s + Number(p.amount), 0), 0
    );
    const overdueCount = client.invoices.filter(
      (inv) => inv.status === 'OVERDUE'
    ).length;

    return {
      id: client.id,
      name: client.name,
      email: client.email,
      invoiceCount: client._count.invoices,
      totalInvoiced,
      totalPaid,
      outstanding: totalInvoiced - totalPaid,
      overdueCount,
    };
  });

  return clientStats
    .sort((a, b) => b.totalPaid - a.totalPaid)
    .slice(0, limit);
};

// ─── Tax Summary Report ───────────────────────────────────────────────────────
export const getTaxSummary = async (
  businessId: string,
  query: ReportQueryInput
) => {
  const year = parseInt(query.year);
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);

  const invoices = await prisma.invoice.findMany({
    where: {
      businessId,
      status: { in: ['PAID', 'PARTIALLY_PAID'] },
      createdAt: { gte: startOfYear, lte: endOfYear },
    },
    select: {
      id: true,
      invoiceNumber: true,
      taxRate: true,
      taxAmount: true,
      total: true,
      subtotal: true,
      createdAt: true,
      client: { select: { name: true } },
    },
  });

  const totalTaxCollected = invoices.reduce(
    (sum, inv) => sum + Number(inv.taxAmount), 0
  );

  const byTaxRate = invoices.reduce((acc: any, inv) => {
    const rate = Number(inv.taxRate);
    if (!acc[rate]) acc[rate] = { rate, count: 0, taxAmount: 0, subtotal: 0 };
    acc[rate].count++;
    acc[rate].taxAmount += Number(inv.taxAmount);
    acc[rate].subtotal += Number(inv.subtotal);
    return acc;
  }, {});

  return {
    year,
    totalTaxCollected,
    invoiceCount: invoices.length,
    byTaxRate: Object.values(byTaxRate),
    invoices,
  };
};

// ─── CSV Export ───────────────────────────────────────────────────────────────
export const generateCSVReport = async (
  businessId: string,
  query: ReportQueryInput
) => {
  const where: any = { businessId };

  if (query.startDate && query.endDate) {
    where.createdAt = {
      gte: new Date(query.startDate),
      lte: new Date(query.endDate),
    };
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      client: { select: { name: true, email: true } },
      payments: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const rows = invoices.map((inv) => {
    const totalPaid = inv.payments.reduce(
      (sum, p) => sum + Number(p.amount), 0
    );
    return {
      'Invoice Number': inv.invoiceNumber,
      'Client Name': inv.client.name,
      'Client Email': inv.client.email,
      'Status': inv.status,
      'Issue Date': inv.issueDate.toISOString().split('T')[0],
      'Due Date': inv.dueDate.toISOString().split('T')[0],
      'Subtotal': Number(inv.subtotal).toFixed(2),
      'Tax Rate (%)': Number(inv.taxRate).toFixed(2),
      'Tax Amount': Number(inv.taxAmount).toFixed(2),
      'Discount': Number(inv.discount).toFixed(2),
      'Total': Number(inv.total).toFixed(2),
      'Amount Paid': totalPaid.toFixed(2),
      'Balance Due': (Number(inv.total) - totalPaid).toFixed(2),
    };
  });

  // Convert to CSV string
  if (rows.length === 0) return 'No data found';

  const headers = Object.keys(rows[0]);
  const csvRows = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((h) => `"${(row as any)[h]}"`).join(',')
    ),
  ];

  return csvRows.join('\n');
};