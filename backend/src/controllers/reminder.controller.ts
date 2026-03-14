import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  scheduleReminders,
  getInvoiceReminders,
  triggerReminderNow,
  cancelReminders,
} from '../services/reminder.service';

export const scheduleInvoiceReminders = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    await scheduleReminders(String(req.params.invoiceId));
    res.status(200).json({ message: 'Reminders scheduled successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to schedule reminders';
    res.status(400).json({ error: message });
  }
};

export const listInvoiceReminders = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const reminders = await getInvoiceReminders(
      String(req.params.invoiceId),
      req.user!.businessId
    );
    res.status(200).json({ reminders });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch reminders';
    res.status(400).json({ error: message });
  }
};

export const triggerReminder = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { reminderType } = req.body;

    if (!['before_due', 'on_due', 'overdue'].includes(reminderType)) {
      res.status(400).json({ error: 'Invalid reminder type' });
      return;
    }

    await triggerReminderNow(
      String(req.params.invoiceId),
      req.user!.businessId,
      reminderType
    );

    res.status(200).json({ message: `${reminderType} reminder triggered successfully` });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to trigger reminder';
    res.status(400).json({ error: message });
  }
};

export const cancelInvoiceReminders = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    await cancelReminders(String(req.params.invoiceId));
    res.status(200).json({ message: 'Reminders cancelled successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to cancel reminders';
    res.status(400).json({ error: message });
  }
};