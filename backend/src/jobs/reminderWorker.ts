import { Worker, Job } from 'bullmq';
import redis, { bullMQConnection } from '../config/redis';
import { ReminderJobData } from './reminderQueue';
import { sendReminderEmail } from '../services/email.service';
import prisma from '../config/db';

const processReminderJob = async (job: Job<ReminderJobData>): Promise<void> => {
  const {
    invoiceId,
    clientEmail,
    clientName,
    businessName,
    invoiceNumber,
    total,
    dueDate,
    portalUrl,
    currency,
    reminderType,
    reminderId,
  } = job.data;

  console.log(`📧 Processing reminder: ${reminderType} for invoice ${invoiceNumber}`);

  try {
    // Check if invoice is still unpaid before sending
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      console.log(`Invoice ${invoiceNumber} not found — skipping reminder`);
      return;
    }

    if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') {
      console.log(`Invoice ${invoiceNumber} is ${invoice.status} — skipping reminder`);
      return;
    }

    // Send the reminder email
    await sendReminderEmail({
      to: clientEmail,
      clientName,
      businessName,
      invoiceNumber,
      total,
      dueDate,
      portalUrl,
      reminderType,
      currency,
    });

    // Mark reminder as sent in DB
    await prisma.reminder.update({
      where: { id: reminderId },
      data: { sentAt: new Date() },
    });

    console.log(`✅ Reminder sent: ${reminderType} for ${invoiceNumber} to ${clientEmail}`);
  } catch (error) {
    console.error(`❌ Failed to send reminder for ${invoiceNumber}:`, error);
    throw error; // Re-throw to trigger BullMQ retry
  }
};

export const startReminderWorker = (): Worker => {
  const worker = new Worker<ReminderJobData>(
    'reminders',
    processReminderJob,
    { connection: bullMQConnection }
  );

  worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err.message);
  });

  console.log('🔧 Reminder worker started');
  return worker;
};