import prisma from '../config/db';

export const generateInvoiceNumber = async (
  businessId: string
): Promise<string> => {
  // Count all invoices for this business including cancelled
  const count = await prisma.invoice.count({
    where: { businessId },
  });

  const year = new Date().getFullYear();
  const sequence = String(count + 1).padStart(4, '0');

  // Format: INV-2026-0001
  return `INV-${year}-${sequence}`;
};