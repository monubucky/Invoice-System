export interface InvoiceItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceTotals {
  subtotal: number;
  taxAmount: number;
  total: number;
  items: Array<InvoiceItemInput & { total: number }>;
}

export const calculateInvoiceTotals = (
  items: InvoiceItemInput[],
  taxRate: number = 0,
  discount: number = 0
): InvoiceTotals => {
  const calculatedItems = items.map((item) => ({
    ...item,
    total: parseFloat((item.quantity * item.unitPrice).toFixed(2)),
  }));

  const subtotal = parseFloat(
    calculatedItems.reduce((sum, item) => sum + item.total, 0).toFixed(2)
  );

  const discountedSubtotal = parseFloat(
    (subtotal - discount).toFixed(2)
  );

  const taxAmount = parseFloat(
    ((discountedSubtotal * taxRate) / 100).toFixed(2)
  );

  const total = parseFloat(
    (discountedSubtotal + taxAmount).toFixed(2)
  );

  return { subtotal, taxAmount, total, items: calculatedItems };
};