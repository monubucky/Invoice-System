import { z } from 'zod';

export const registerSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  currency: z.string().optional().default('USD'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updateBusinessSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().optional(),
  taxId: z.string().optional(),
  currency: z.string().optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
});

export const createClientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxId: z.string().optional(),
});

export const updateClientSchema = createClientSchema.partial();

export const clientQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'email', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const invoiceItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().positive('Unit price must be positive'),
});

export const createInvoiceSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  issueDate: z.string().datetime(),
  dueDate: z.string().datetime(),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
  taxRate: z.number().min(0).max(100).optional().default(0),
  discount: z.number().min(0).optional().default(0),
  notes: z.string().optional(),
  isRecurring: z.boolean().optional().default(false),
  recurringCycle: z.enum(['weekly', 'monthly', 'yearly']).optional(),
});

export const updateInvoiceSchema = createInvoiceSchema.partial();

export const invoiceQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  search: z.string().optional(),
  status: z.enum([
    'DRAFT',
    'SENT',
    'VIEWED',
    'PARTIALLY_PAID',
    'PAID',
    'OVERDUE',
    'CANCELLED',
  ]).optional(),
  clientId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['createdAt', 'dueDate', 'total', 'invoiceNumber']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const recordPaymentSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
  amount: z.number().positive('Amount must be positive'),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'STRIPE', 'CHECK', 'OTHER']),
  reference: z.string().optional(),
  paidAt: z.string().datetime().optional(),
});

export const stripeCheckoutSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
});

export const reportQuerySchema = z.object({
  year: z.string().optional().default(String(new Date().getFullYear())),
  month: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  currency: z.string().optional().default('USD'),
});

export const recurringConfigSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  issueDate: z.string().datetime(),
  dueDate: z.string().datetime(),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
  taxRate: z.number().min(0).max(100).optional().default(0),
  discount: z.number().min(0).optional().default(0),
  notes: z.string().optional(),
  recurringCycle: z.enum(['weekly', 'monthly', 'yearly']),
  recurringEndDate: z.string().datetime().optional(),
});

export type RecurringConfigInput = z.infer<typeof recurringConfigSchema>;

export type ReportQueryInput = z.infer<typeof reportQuerySchema>;

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type InvoiceQueryInput = z.infer<typeof invoiceQuerySchema>;

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type ClientQueryInput = z.infer<typeof clientQuerySchema>;