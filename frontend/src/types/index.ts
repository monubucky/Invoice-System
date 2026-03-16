export type Role = 'ADMIN' | 'ACCOUNTANT' | 'VIEWER';

export type InvoiceStatus =
  | 'DRAFT' | 'SENT' | 'VIEWED'
  | 'PARTIALLY_PAID' | 'PAID'
  | 'OVERDUE' | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  businessId: string;
}

export interface Business {
  id: string;
  name: string;
  logo?: string;
  address?: string;
  currency: string;
  taxId?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  taxId?: string;
  createdAt: string;
  _count?: { invoices: number };
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  client: Client;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  total: number;
  items: InvoiceItem[];
  notes?: string;
  publicToken: string;
  amountPaid?: number;
  balanceDue?: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: string;
  reference?: string;
  paidAt: string;
}

export interface DashboardSummary {
  counts: {
    clients: number;
    invoices: number;
    draft: number;
    sent: number;
    paid: number;
    overdue: number;
  };
  revenue: {
    allTime: number;
    thisMonth: number;
    lastMonth: number;
    growth: number;
  };
  outstanding: number;
  overdueAmount: number;
  recentInvoices: Invoice[];
}