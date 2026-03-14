import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes';
import businessRoutes from './routes/business.routes';
import clientRoutes from './routes/client.routes';
import invoiceRoutes from './routes/invoice.routes';
import paymentRoutes from './routes/payment.routes';
import portalRoutes from './routes/portal.routes';
import { errorHandler } from './middleware/errorHandler';
import { stripeWebhook } from './controllers/payment.controller';
import reminderRoutes from './routes/reminder.routes';
import { startReminderWorker } from './jobs/reminderWorker';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ⚠️ Stripe webhook needs raw body — must be registered BEFORE express.json()
app.post(
  '/api/payments/stripe/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhook
);

// Global Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/reminders', reminderRoutes);

// 404 handler
app.use('*path', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use(errorHandler);

startReminderWorker();

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;