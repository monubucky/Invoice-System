import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  getDashboardSummary,
  getMonthlyRevenue,
  getInvoiceStatusBreakdown,
  getTopClientsReport,
  getTaxSummary,
  generateCSVReport,
} from '../services/report.service';
import { reportQuerySchema } from '../utils/schemas';

export const dashboardSummary = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const summary = await getDashboardSummary(req.user!.businessId);
    res.status(200).json({ summary });
  } catch {
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
};

export const monthlyRevenue = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const query = reportQuerySchema.parse(req.query);
    const data = await getMonthlyRevenue(req.user!.businessId, query);
    res.status(200).json(data);
  } catch {
    res.status(500).json({ error: 'Failed to fetch monthly revenue' });
  }
};

export const statusBreakdown = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = await getInvoiceStatusBreakdown(req.user!.businessId);
    res.status(200).json({ breakdown: data });
  } catch {
    res.status(500).json({ error: 'Failed to fetch status breakdown' });
  }
};

export const topClients = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const limit = parseInt(String(req.query.limit || '10'));
    const data = await getTopClientsReport(req.user!.businessId, limit);
    res.status(200).json({ clients: data });
  } catch {
    res.status(500).json({ error: 'Failed to fetch top clients' });
  }
};

export const taxSummary = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const query = reportQuerySchema.parse(req.query);
    const data = await getTaxSummary(req.user!.businessId, query);
    res.status(200).json(data);
  } catch {
    res.status(500).json({ error: 'Failed to fetch tax summary' });
  }
};

export const exportCSV = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const query = reportQuerySchema.parse(req.query);
    const csv = await generateCSVReport(req.user!.businessId, query);

    const filename = `invoices-${query.year || 'all'}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch {
    res.status(500).json({ error: 'Failed to export CSV' });
  }
};