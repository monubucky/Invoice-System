import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  createRecurringInvoice,
  getRecurringInvoices,
  updateRecurringCycle,
  stopRecurringInvoice,
  generateNextRecurringInvoice,
} from '../services/recurring.service';
import { validate } from '../middleware/validate.middleware';
import { recurringConfigSchema } from '../utils/schemas';

export const listRecurring = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const invoices = await getRecurringInvoices(req.user!.businessId);
    res.status(200).json({ invoices });
  } catch {
    res.status(500).json({ error: 'Failed to fetch recurring invoices' });
  }
};

export const createRecurring = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const invoice = await createRecurringInvoice(
      req.user!.businessId,
      req.body
    );
    res.status(201).json({
      message: 'Recurring invoice created successfully',
      invoice,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create recurring invoice';
    res.status(400).json({ error: message });
  }
};

export const updateCycle = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { cycle } = req.body;
    if (!['weekly', 'monthly', 'yearly'].includes(cycle)) {
      res.status(400).json({ error: 'Invalid cycle. Use weekly, monthly, or yearly' });
      return;
    }
    const invoice = await updateRecurringCycle(
      String(req.params.id),
      req.user!.businessId,
      cycle
    );
    res.status(200).json({ message: 'Recurring cycle updated', invoice });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update cycle';
    res.status(400).json({ error: message });
  }
};

export const stopRecurring = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const invoice = await stopRecurringInvoice(
      String(req.params.id),
      req.user!.businessId
    );
    res.status(200).json({ message: 'Recurring invoice stopped', invoice });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to stop recurring invoice';
    res.status(400).json({ error: message });
  }
};

export const generateNext = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    await generateNextRecurringInvoice(String(req.params.id));
    res.status(201).json({ message: 'Next invoice generated successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate next invoice';
    res.status(400).json({ error: message });
  }
};