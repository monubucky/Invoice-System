import prisma from '../config/db';
import reminderQueue from '../jobs/reminderQueue';

// ─── Schedule Reminders When Invoice is Sent ──────────────────────────────────
export const scheduleReminders = async (invoiceId: string): Promise<void> => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      client: true,
      business: true,
    },
  });

  if (!invoice) throw new Error('Invoice not found');

  const dueDate = new Date(invoice.dueDate);
  const now = new Date();
  const portalUrl = `${process.env.FRONTEND_URL}/portal/${invoice.publicToken}`;

  const formattedDueDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(dueDate);

  const jobData = {
    invoiceId: invoice.id,
    clientEmail: invoice.client.email,
    clientName: invoice.client.name,
    businessName: invoice.business?.name || 'Your Business',
    invoiceNumber: invoice.invoiceNumber,
    total: Number(invoice.total),
    dueDate: formattedDueDate,
    portalUrl,
    currency: invoice.business?.currency || 'USD',
  };

  const remindersToSchedule = [
    {
      type: 'before_due' as const,
      // 3 days before due date
      sendAt: new Date(dueDate.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'on_due' as const,
      // On due date at 9am
      sendAt: new Date(dueDate.setHours(9, 0, 0, 0)),
    },
    {
      type: 'overdue' as const,
      // 1 day after due date
      sendAt: new Date(dueDate.getTime() + 1 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const reminder of remindersToSchedule) {
    // Skip if scheduled time is in the past
    if (reminder.sendAt <= now) {
      console.log(`Skipping ${reminder.type} reminder — scheduled time is in the past`);
      continue;
    }

    const delay = reminder.sendAt.getTime() - now.getTime();

    // Create reminder record in DB
    const reminderRecord = await prisma.reminder.create({
      data: {
        invoiceId: invoice.id,
        type: reminder.type,
        scheduledAt: reminder.sendAt,
      },
    });

    // Add job to queue with delay
    await reminderQueue.add(
      String(`${reminder.type}-${invoice.invoiceNumber}`),
      {
        ...jobData,
        reminderType: reminder.type,
        reminderId: reminderRecord.id,
      },
      { delay }
    );

    console.log(
      `📅 Scheduled ${reminder.type} reminder for ${invoice.invoiceNumber} at ${reminder.sendAt.toISOString()}`
    );
  }
};

// ─── Cancel Reminders (when invoice is paid/cancelled) ───────────────────────
export const cancelReminders = async (invoiceId: string): Promise<void> => {
  const reminders = await prisma.reminder.findMany({
    where: { invoiceId, sentAt: null },
  });

  for (const reminder of reminders) {
    // Remove job from queue
    const jobName = `${reminder.type}-${invoiceId}`;
    const jobs = await reminderQueue.getJobs(['delayed', 'waiting']);

    for (const job of jobs) {
      if (job.name === jobName) {
        await job.remove();
        console.log(`🗑️ Cancelled reminder job: ${jobName}`);
      }
    }
  }
};

// ─── Get Reminders for Invoice ────────────────────────────────────────────────
export const getInvoiceReminders = async (
  invoiceId: string,
  businessId: string
) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, businessId },
  });

  if (!invoice) throw new Error('Invoice not found');

  const reminders = await prisma.reminder.findMany({
    where: { invoiceId },
    orderBy: { scheduledAt: 'asc' },
  });

  return reminders;
};

// ─── Manual Trigger (for testing) ────────────────────────────────────────────
export const triggerReminderNow = async (
  invoiceId: string,
  businessId: string,
  reminderType: 'before_due' | 'on_due' | 'overdue'
): Promise<void> => {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, businessId },
    include: { client: true, business: true },
  });

  if (!invoice) throw new Error('Invoice not found');

  const portalUrl = `${process.env.FRONTEND_URL}/portal/${invoice.publicToken}`;

  const formattedDueDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(invoice.dueDate));

  // Create reminder record
  const reminderRecord = await prisma.reminder.create({
    data: {
      invoiceId: invoice.id,
      type: reminderType,
      scheduledAt: new Date(),
    },
  });

  // Add to queue with no delay (immediate)
  await reminderQueue.add(
    `${reminderType}-${invoice.invoiceNumber}-manual`,
    {
      invoiceId: invoice.id,
      clientEmail: invoice.client.email,
      clientName: invoice.client.name,
      businessName: invoice.business?.name || 'Your Business',
      invoiceNumber: invoice.invoiceNumber,
      total: Number(invoice.total),
      dueDate: formattedDueDate,
      portalUrl,
      currency: invoice.business?.currency || 'USD',
      reminderType,
      reminderId: reminderRecord.id,
    },
    { delay: 0 }
  );

  console.log(`🚀 Manual reminder triggered: ${reminderType} for ${invoice.invoiceNumber}`);
};

// ─── Overdue Cron Job ─────────────────────────────────────────────────────────
export const checkAndScheduleOverdueReminders = async (): Promise<void> => {
  // Find invoices that just became overdue and haven't had overdue reminder sent
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      status: 'OVERDUE',
      reminders: {
        none: { type: 'overdue' },
      },
    },
    include: {
      client: true,
      business: true,
    },
  });

  for (const invoice of overdueInvoices) {
    console.log(`📋 Scheduling overdue reminder for ${invoice.invoiceNumber}`);
    await triggerReminderNow(invoice.id, invoice.businessId, 'overdue');
  }

  console.log(`✅ Processed ${overdueInvoices.length} overdue invoices`);
};