import { Queue } from 'bullmq';
import { bullMQConnection } from '../config/redis';

export interface ReminderJobData {
  invoiceId: string;
  clientEmail: string;
  clientName: string;
  businessName: string;
  invoiceNumber: string;
  total: number;
  dueDate: string;
  portalUrl: string;
  currency: string;
  reminderType: 'before_due' | 'on_due' | 'overdue';
  reminderId: string;
}

export const reminderQueue = new Queue<ReminderJobData, any, string>('reminders', {
  connection: bullMQConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export default reminderQueue;