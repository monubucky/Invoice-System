import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  sendInvoice,
  duplicateInvoice,
  getInvoiceSummary,
} from '../services/invoice.service';
import { invoiceQuerySchema } from '../utils/schemas';

export const listInvoices = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const query = invoiceQuerySchema.parse(req.query);
    const result = await getInvoices(req.user!.businessId, query);
    res.status(200).json(result);
  } catch {
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
};

export const getInvoice = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const invoice = await getInvoiceById(req.params.id[0], req.user!.businessId);
    res.status(200).json({ invoice });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch invoice';
    const status = message === 'Invoice not found' ? 404 : 500;
    res.status(status).json({ error: message });
  }
};

export const createNewInvoice = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const invoice = await createInvoice(req.user!.businessId, req.body);
    res.status(201).json({ message: 'Invoice created successfully', invoice });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create invoice';
    res.status(400).json({ error: message });
  }
};

export const updateExistingInvoice = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const invoice = await updateInvoice(
      req.params.id[0],
      req.user!.businessId,
      req.body
    );
    res.status(200).json({ message: 'Invoice updated successfully', invoice });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update invoice';
    const status = message === 'Invoice not found' ? 404 : 400;
    res.status(status).json({ error: message });
  }
};

export const deleteExistingInvoice = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const result = await deleteInvoice(req.params.id[0], req.user!.businessId);
    res.status(200).json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete invoice';
    const status = message === 'Invoice not found' ? 404 : 400;
    res.status(status).json({ error: message });
  }
};

export const sendExistingInvoice = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const invoice = await sendInvoice(req.params.id[0], req.user!.businessId);
    res.status(200).json({ message: 'Invoice sent successfully', invoice });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send invoice';
    const status = message === 'Invoice not found' ? 404 : 400;
    res.status(status).json({ error: message });
  }
};

export const duplicateExistingInvoice = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const invoice = await duplicateInvoice(req.params.id[0], req.user!.businessId);
    res.status(201).json({ message: 'Invoice duplicated successfully', invoice });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to duplicate invoice';
    const status = message === 'Invoice not found' ? 404 : 500;
    res.status(status).json({ error: message });
  }
};

export const getSummary = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const summary = await getInvoiceSummary(req.user!.businessId);
    res.status(200).json({ summary });
  } catch {
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
};