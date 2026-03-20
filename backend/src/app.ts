import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';

import authRoutes from './routes/auth.routes';
import businessRoutes from './routes/business.routes';
import clientRoutes from './routes/client.routes';
import invoiceRoutes from './routes/invoice.routes';
import paymentRoutes from './routes/payment.routes';
import portalRoutes from './routes/portal.routes';
import reminderRoutes from './routes/reminder.routes';
import reportRoutes from './routes/report.routes';
import recurringRoutes from './routes/recurring.routes';

import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/logger.middleware';
import { globalRateLimit, authRateLimit } from './middleware/rateLimit.middleware';
import { stripeWebhook } from './controllers/payment.controller';
import { startReminderWorker } from './jobs/reminderWorker';
import { startCronJobs } from './jobs/cronJobs';
import { swaggerSpec } from './config/swagger';
import prisma from './config/db';
import redis from './config/redis';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ⚠️ Stripe webhook — must be before express.json()
app.post(
  '/api/payments/stripe/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhook
);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);
app.use(globalRateLimit);

// Swagger Docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const redisStatus = await redis.ping();
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: redisStatus === 'PONG' ? 'connected' : 'error',
      },
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
    });
  } catch {
    res.status(503).json({ status: 'ERROR', error: 'Service unavailable' });
  }
});

// Routes
app.use('/api/auth', authRateLimit, authRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/recurring', recurringRoutes);

// 404
app.use('*path', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use(errorHandler);

// Start background services
startReminderWorker();
startCronJobs();

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
});

export default app;