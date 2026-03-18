import cron from 'node-cron';
import { processRecurringInvoices } from '../services/recurring.service';
import { checkAndScheduleOverdueReminders } from '../services/reminder.service';
import { markOverdueInvoices } from '../services/invoice.service';

export const startCronJobs = (): void => {
  // ─── Every day at midnight ────────────────────────────────────────────────
  // Mark overdue invoices
  cron.schedule('0 0 * * *', async () => {
    console.log('⏰ Cron: Marking overdue invoices...');
    try {
      const count = await markOverdueInvoices();
      console.log(`✅ Marked ${count} invoices as overdue`);
    } catch (err) {
      console.error('❌ Cron error (markOverdue):', err);
    }
  });

  // ─── Every day at 1am ─────────────────────────────────────────────────────
  // Schedule overdue reminders for newly overdue invoices
  cron.schedule('0 1 * * *', async () => {
    console.log('⏰ Cron: Scheduling overdue reminders...');
    try {
      await checkAndScheduleOverdueReminders();
    } catch (err) {
      console.error('❌ Cron error (overdueReminders):', err);
    }
  });

  // ─── Every day at 2am ─────────────────────────────────────────────────────
  // Process recurring invoices
  cron.schedule('0 2 * * *', async () => {
    console.log('⏰ Cron: Processing recurring invoices...');
    try {
      await processRecurringInvoices();
    } catch (err) {
      console.error('❌ Cron error (recurringInvoices):', err);
    }
  });

  console.log('⏰ Cron jobs started');
};